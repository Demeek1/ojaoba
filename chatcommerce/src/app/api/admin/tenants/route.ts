import { z } from 'zod';
import { requireOwner } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';

/**
 * Platform-owner only. Cross-tenant read for monitoring — gated by requireOwner()
 * (role = platform_owner). Vendors can never reach this; they lack the role.
 */
export async function GET() {
  return guard(async () => {
    await requireOwner();
    const tenants = await ownerQuery(
      `SELECT t.id, t.slug, t.business_name, t.status, t.plan, t.billing_status, t.created_at,
              (SELECT count(*) FROM products p WHERE p.tenant_id = t.id) AS products,
              (SELECT count(*) FROM channels c WHERE c.tenant_id = t.id) AS channels,
              (SELECT count(*) FROM orders o WHERE o.tenant_id = t.id) AS orders,
              (SELECT count(*) FROM users u WHERE u.tenant_id = t.id) AS users
         FROM tenants t ORDER BY t.created_at DESC LIMIT 1000`,
    );
    return json({ tenants });
  });
}

const Action = z.object({
  tenantId: z.string().uuid(),
  status: z.enum(['active', 'suspended']),
});

/** Suspend or re-activate a vendor (e.g. for non-payment or abuse). */
export async function PATCH(req: Request) {
  return guard(async () => {
    await requireOwner();
    const parsed = Action.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    await ownerQuery(`UPDATE tenants SET status = $2, updated_at = now() WHERE id = $1`, [
      parsed.data.tenantId,
      parsed.data.status,
    ]);
    return json({ ok: true });
  });
}
