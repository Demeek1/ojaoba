import { requireOwner } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Platform-owner only: full metrics for a single vendor. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  return guard(async () => {
    await requireOwner();
    const id = params.id;
    if (!/^[0-9a-f-]{36}$/i.test(id)) return err('Invalid id', 422);

    const tenant = (
      await ownerQuery(
        `SELECT id, slug, business_name, status, plan, billing_status, created_at, updated_at
           FROM tenants WHERE id = $1`,
        [id],
      )
    )[0];
    if (!tenant) return err('Vendor not found', 404);

    const [counts, gmv, channels, recentOrders, topProducts, members] = await Promise.all([
      ownerQuery(
        `SELECT
           (SELECT count(*) FROM products WHERE tenant_id = $1) AS products,
           (SELECT count(*) FROM products WHERE tenant_id = $1 AND active = true) AS active_products,
           (SELECT count(*) FROM channels WHERE tenant_id = $1) AS channels,
           (SELECT count(*) FROM orders WHERE tenant_id = $1) AS orders,
           (SELECT count(*) FROM conversations WHERE tenant_id = $1) AS conversations,
           (SELECT count(*) FROM users WHERE tenant_id = $1) AS users`,
        [id],
      ),
      ownerQuery(
        `SELECT COALESCE(SUM(total_cents),0)::bigint AS gmv_cents,
                COUNT(*) FILTER (WHERE created_at > now() - interval '7 days') AS orders_7d
           FROM orders WHERE tenant_id = $1`,
        [id],
      ),
      ownerQuery(`SELECT type, display_name, status, created_at FROM channels WHERE tenant_id = $1 ORDER BY created_at`, [id]),
      ownerQuery(
        `SELECT id, channel_type, customer_ref, total_cents, currency, status, created_at
           FROM orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10`,
        [id],
      ),
      ownerQuery(
        `SELECT title, price_cents, currency, active FROM products WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 8`,
        [id],
      ),
      ownerQuery(`SELECT email, role, created_at FROM users WHERE tenant_id = $1 ORDER BY created_at`, [id]),
    ]);

    return json({
      tenant,
      counts: counts[0],
      gmvCents: Number(gmv[0]?.gmv_cents ?? 0),
      orders7d: Number(gmv[0]?.orders_7d ?? 0),
      channels,
      recentOrders,
      topProducts,
      members,
    });
  });
}
