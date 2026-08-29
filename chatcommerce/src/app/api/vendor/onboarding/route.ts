import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET → current onboarding state + live completion signals. */
export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    let state: any = {};
    try {
      const t = await ownerQuery(`SELECT onboarding_state FROM tenants WHERE id = $1`, [s.tid]);
      state = t[0]?.onboarding_state ?? {};
    } catch {
      /* column not migrated yet */
    }
    const [p, c] = await Promise.all([
      ownerQuery(`SELECT count(*)::int AS n FROM products WHERE tenant_id = $1`, [s.tid]),
      ownerQuery(`SELECT count(*)::int AS n FROM channels WHERE tenant_id = $1`, [s.tid]),
    ]);
    return json({ state, counts: { products: p[0]?.n ?? 0, channels: c[0]?.n ?? 0 } });
  });
}

const Patch = z.object({ patch: z.record(z.any()) });

/** PATCH → merge a partial state object into onboarding_state. */
export async function PATCH(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = Patch.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);
    try {
      await ownerQuery(
        `UPDATE tenants SET onboarding_state = COALESCE(onboarding_state, '{}'::jsonb) || $2::jsonb, updated_at = now() WHERE id = $1`,
        [s.tid, JSON.stringify(parsed.data.patch)],
      );
      return json({ ok: true, persisted: true });
    } catch {
      // Column not migrated — don't block the wizard, just report not persisted.
      return json({ ok: true, persisted: false });
    }
  });
}
