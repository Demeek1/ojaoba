import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const t = (
      await ownerQuery(
        `SELECT id, slug, business_name, status, plan, billing_status FROM tenants WHERE id = $1`,
        [s.tid],
      )
    )[0];
    return json({ email: s.email, role: s.role, tenant: t });
  });
}
