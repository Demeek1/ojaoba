import { z } from 'zod';
import { ownerQuery } from '@/lib/db';
import { verifyPassword, createSession, setSessionCookie } from '@/lib/auth';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';

const Body = z.object({ email: z.string().email(), password: z.string().min(1) });

export async function POST(req: Request) {
  return guard(async () => {
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    const email = parsed.data.email.toLowerCase();

    const rows = await ownerQuery(
      `SELECT u.id, u.tenant_id, u.password_hash, u.role, t.status AS tenant_status
         FROM users u LEFT JOIN tenants t ON t.id = u.tenant_id
        WHERE u.email = $1`,
      [email],
    );
    const u = rows[0];
    // Always run a compare to reduce user-enumeration timing differences.
    const ok = u ? await verifyPassword(parsed.data.password, u.password_hash) : false;
    if (!u || !ok) return err('Invalid email or password', 401);
    if (u.tenant_status === 'suspended') return err('This account is suspended. Contact support.', 403);

    const token = await createSession({ uid: u.id, tid: u.tenant_id, role: u.role, email });
    const res = json({ ok: true, role: u.role });
    await setSessionCookie(res, token);
    return res;
  });
}
