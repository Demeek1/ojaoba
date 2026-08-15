import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { hashPassword, createSession, setSessionCookie } from '@/lib/auth';
import { json, err, guard, slugify } from '@/lib/util';

export const runtime = 'nodejs';

const Body = z.object({
  businessName: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(200),
});

export async function POST(req: Request) {
  return guard(async () => {
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
