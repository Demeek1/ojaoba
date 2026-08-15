import { requireVendor } from '@/lib/auth';
import { tenantDb } from '@/lib/db';
import { json, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const db = tenantDb(s.tid);
    const orders = await db.query(
      `SELECT id, channel_type, customer_ref, items, total_cents, currency, status, created_at
         FROM orders WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 200`,
      [s.tid],
    );
    return json({ orders });
  });
}
