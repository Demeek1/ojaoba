import { requireOwner } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET() {
  return guard(async () => {
    await requireOwner();
    const m = (
      await ownerQuery(
        `SELECT
           (SELECT count(*) FROM tenants) AS tenants,
           (SELECT count(*) FROM tenants WHERE status = 'active') AS active_tenants,
           (SELECT count(*) FROM tenants WHERE billing_status = 'active') AS paying_tenants,
           (SELECT count(*) FROM channels) AS channels,
           (SELECT count(*) FROM products) AS products,
           (SELECT count(*) FROM orders) AS orders,
           (SELECT COALESCE(sum(total_cents),0) FROM orders WHERE status <> 'cancelled') AS gmv_cents`,
      )
    )[0];
    return json({ metrics: m });
  });
}
