import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';
import { teamRole } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    if (!['owner', 'admin'].includes(await teamRole(s.uid))) return err('Not allowed.', 403);
    const entries = await ownerQuery(
      `SELECT actor, action, meta, created_at FROM audit_log WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [s.tid],
    );
    return json({ entries });
  });
}
