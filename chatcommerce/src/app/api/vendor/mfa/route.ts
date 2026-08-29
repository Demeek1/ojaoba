import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { requireVendor } from '@/lib/auth';
import { json, err, guard } from '@/lib/util';
import { encryptSecrets, decryptSecrets } from '@/lib/crypto';
import { generateSecret, otpauthURL, verifyCode } from '@/lib/totp';
import QRCode from 'qrcode';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  action: z.enum(['setup', 'enable', 'disable']),
  code: z.string().optional(),
});

export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    const { action, code } = parsed.data;

    if (action === 'setup') {
      const secret = generateSecret();
      await ownerQuery(`UPDATE users SET mfa_secret = $2, mfa_enabled = false WHERE id = $1`, [
        s.uid,
        JSON.stringify(encryptSecrets({ secret })),
      ]);
      const uri = otpauthURL(secret, s.email);
      const qr = await QRCode.toDataURL(uri, { margin: 1, width: 220 });
      return json({ secret, otpauth: uri, qr });
    }

    // enable / disable both require a valid current code
    const rows = await ownerQuery(`SELECT mfa_secret FROM users WHERE id = $1`, [s.uid]);
    const stored = rows[0]?.mfa_secret;
    if (!stored) return err('Set up an authenticator first.', 400);
    let secret = '';
    try {
      secret = decryptSecrets(JSON.parse(stored)).secret;
    } catch {
      return err('MFA is not set up correctly. Please set it up again.', 400);
    }
    if (!verifyCode(secret, code || '')) return err('That code is not valid. Try again.', 401);

    if (action === 'enable') {
      await ownerQuery(`UPDATE users SET mfa_enabled = true WHERE id = $1`, [s.uid]);
      return json({ ok: true, mfaEnabled: true });
    }
    // disable
    await ownerQuery(`UPDATE users SET mfa_enabled = false, mfa_secret = NULL WHERE id = $1`, [s.uid]);
    return json({ ok: true, mfaEnabled: false });
  });
}
