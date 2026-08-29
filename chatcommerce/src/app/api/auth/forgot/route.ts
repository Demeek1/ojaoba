import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';
import { createToken } from '@/lib/tokens';
import { sendEmail, emailLayout, appUrl } from '@/lib/email';
import { clientIp, isRateLimited, recordFail } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({ email: z.string().email() });

export async function POST(req: Request) {
  return guard(async () => {
    const ipKey = `forgot:${clientIp(req)}`;
    if (await isRateLimited(ipKey, 6, 60)) return err('Too many requests. Try again later.', 429);
    await recordFail(ipKey);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid email', 422);
    const email = parsed.data.email.toLowerCase();

    // Never reveal whether the email exists.
    const rows = await ownerQuery(`SELECT id FROM users WHERE email = $1`, [email]);
    const user = rows[0];
    if (user) {
      const raw = await createToken(user.id, 'reset_password', 60);
      await sendEmail({
        to: email,
        subject: 'Reset your ChatCommerce password',
        html: emailLayout(
          'Reset your password',
          'We received a request to reset your password. This link expires in 1 hour.',
          { href: `${appUrl()}/reset?token=${raw}`, label: 'Reset password' },
        ),
      });
    }
    return json({ ok: true });
  });
}
