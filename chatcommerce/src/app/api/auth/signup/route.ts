import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import { json, err, guard, slugify } from '@/lib/util';
import { clientIp, isRateLimited, recordFail } from '@/lib/ratelimit';
import { createToken } from '@/lib/tokens';
import { sendEmail, emailLayout, appUrl } from '@/lib/email';

export const runtime = 'nodejs';

const Body = z.object({
  businessName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  return guard(async () => {
    const ipKey = `signup:${clientIp(req)}`;
    if (await isRateLimited(ipKey, 6, 60)) {
      return err('Too many sign-up attempts. Please wait and try again later.', 429);
    }
    await recordFail(ipKey); // every signup attempt counts toward the per-IP cap

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input: ' + parsed.error.issues[0]?.message, 422);
    const { businessName, email, password } = parsed.data;
    const lowerEmail = email.toLowerCase();

    const existing = await ownerQuery(`SELECT id FROM users WHERE email = $1`, [lowerEmail]);
    if (existing.length) return err('An account with this email already exists', 409);

    const isOwner = lowerEmail === (process.env.PLATFORM_OWNER_EMAIL || '').toLowerCase();

    // Unique slug
    let base = slugify(businessName);
    let slug = base;
    for (let i = 1; (await ownerQuery(`SELECT 1 FROM tenants WHERE slug = $1`, [slug])).length; i++) {
      slug = `${base}-${i}`;
    }

    const tenant = (
      await ownerQuery(
        `INSERT INTO tenants (slug, business_name, status, plan)
         VALUES ($1, $2, 'active', 'trial') RETURNING id`,
        [slug, businessName],
      )
    )[0];

    const hash = await hashPassword(password);
    const user = (
      await ownerQuery(
        `INSERT INTO users (tenant_id, email, password_hash, role)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [tenant.id, lowerEmail, hash, isOwner ? 'platform_owner' : 'vendor'],
      )
    )[0];

    await ownerQuery(
      `INSERT INTO audit_log (tenant_id, actor, action, meta) VALUES ($1,$2,$3,$4::jsonb)`,
      [tenant.id, lowerEmail, 'signup', JSON.stringify({ slug })],
    );

    // Send email verification (best-effort; never blocks signup). Table may not
    // exist yet on older deployments — swallow errors so signup still succeeds.
    try {
      const raw = await createToken(user.id, 'verify_email', 60 * 24);
      await sendEmail({
        to: lowerEmail,
        subject: 'Verify your ChatCommerce email',
        html: emailLayout(
          'Confirm your email',
          'Welcome to ChatCommerce! Confirm your email address to secure your account.',
          { href: `${appUrl()}/api/auth/verify?token=${raw}`, label: 'Verify email' },
        ),
      });
    } catch (e) {
      console.error('[signup] verification email skipped', e);
    }

    const token = await createSession({
      uid: user.id,
      tid: tenant.id,
      role: isOwner ? 'platform_owner' : 'vendor',
      email: lowerEmail,
    });
    const res = json({ ok: true, slug, role: isOwner ? 'platform_owner' : 'vendor' });
    await setSessionCookie(res, token);
    return res;
  });
}
