import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { tenantDb } from '@/lib/db';
import { encryptSecrets } from '@/lib/crypto';
import { SUPPORTED_STORES } from '@/lib/stores';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const db = tenantDb(s.tid);
    const rows = await db.query(
      `SELECT id, provider, domain, status, last_synced_at, created_at
         FROM stores WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [s.tid],
    );
    return json({ stores: rows });
  });
}

const NewStore = z.object({
  provider: z.enum(['shopify', 'woocommerce', 'manual']),
  domain: z.string().max(200).optional().default(''),
  credentials: z.record(z.string()).default({}),
});

export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = NewStore.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid store config', 422);
    const { provider, domain, credentials } = parsed.data;
    if (!SUPPORTED_STORES.includes(provider)) return err('Unsupported store provider', 400);

    const enc = encryptSecrets(credentials);
    const db = tenantDb(s.tid);
    const row = (
      await db.query(
        `INSERT INTO stores (tenant_id, provider, domain, credentials, status)
         VALUES ($1,$2,$3,$4::jsonb,'connected') RETURNING id`,
        [s.tid, provider, domain, JSON.stringify(enc)],
      )
    )[0];
    return json({ ok: true, id: row.id }, 201);
  });
}
