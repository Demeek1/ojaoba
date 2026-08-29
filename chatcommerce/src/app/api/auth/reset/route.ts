import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';
import { hashPassword } from '@/lib/auth';
import { consumeToken } from '@/lib/tokens';
import { clientIp, isRateLimited, recordFail } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ token: z.string().min(32), password: z.string().min(8).max(200) });

export async function POST(req: Request) {
  return guard(async () => {
    const ipKey = `reset:${clientIp(req)}`;
    if (await isRateLimited(ipKey, 10, 60)) return err('Too many attempts. Try again later.', 429);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);

    const userId = await consumeToken(parsed.data.token, 'reset_password');
    if (!userId) {
      await recordFail(ipKey);
      return err('This reset link is invalid or has expired.', 400);
    }
    const hash = await hashPassword(parsed.data.password);
    await ownerQuery(`UPDATE users SET password_hash = $2 WHERE id = $1`, [userId, hash]);
    // Invalidate any other outstanding reset tokens for this user.
    await ownerQuery(`UPDATE auth_tokens SET used_at = now() WHERE user_id = $1 AND kind = 'reset_password' AND used_at IS NULL`, [userId]);
    return json({ ok: true });
  });
}
