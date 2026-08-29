import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { verifyMfaChallenge, createSession, setSessionCookie } from '@/lib/auth';
import { json, err, guard } from '@/lib/util';
import { decryptSecrets } from '@/lib/crypto';
import { verifyCode } from '@/lib/totp';
import { clientIp, isRateLimited, recordFail } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ mfaToken: z.string().min(10), code: z.string().min(6).max(6) });

/** Second step of login: verify the TOTP code against the pending challenge. */
export async function POST(req: Request) {
  return guard(async () => {
    const ipKey = `mfa:${clientIp(req)}`;
    if (await isRateLimited(ipKey, 10, 15)) return err('Too many attempts. Try again later.', 429);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);

    const pending = await verifyMfaChallenge(parsed.data.mfaToken);
    if (!pending) return err('Your session expired. Please log in again.', 401);

    const rows = await ownerQuery(`SELECT mfa_secret, mfa_enabled FROM users WHERE id = $1`, [pending.uid]);
    const row = rows[0];
    if (!row?.mfa_enabled || !row.mfa_secret) return err('MFA is not enabled.', 400);

    let secret = '';
    try {
      secret = decryptSecrets(JSON.parse(row.mfa_secret)).secret;
    } catch {
      return err('MFA is misconfigured. Contact support.', 400);
    }
    if (!verifyCode(secret, parsed.data.code)) {
      await recordFail(ipKey);
      return err('That code is not valid. Try again.', 401);
    }

    const token = await createSession(pending);
    const res = json({ ok: true, role: pending.role });
    await setSessionCookie(res, token);
    return res;
  });
}
