import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { tenantDb } from '@/lib/db';
import { decryptSecrets } from '@/lib/crypto';
import { getStore } from '@/lib/stores';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';
export const maxDuration = 60;

const Body = z.object({ storeId: z.string().uuid() });

/**
 * Pull a vendor's catalog from their connected store and upsert into products.
 * Credentials are decrypted only here, in-memory, and never returned to the client.
 */
export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('storeId is required', 422);

    const db = tenantDb(s.tid);
    const store = (
      await db.query(
        `SELECT id, provider, domain, credentials FROM stores WHERE tenant_id = $1 AND id = $2`,
        [s.tid, parsed.data.storeId],
      )
    )[0];
    if (!store) return err('Store not found', 404);

    const connector = getStore(store.provider);
    if (!connector) return err('This provider does not support automatic import', 400);

    const creds = decryptSecrets(store.credentials);
    let products;
    try {
      products = await connector.fetchProducts(store.domain, creds);
    } catch (e: any) {
      return err(`Import failed: ${e.message}`, 502);
    }

    let imported = 0;
    for (const p of products) {
      await db.query(
        `INSERT INTO products (tenant_id, store_id, external_id, title, description, price_cents, currency, image_url, stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         ON CONFLICT (tenant_id, store_id, external_id)
         DO UPDATE SET title=EXCLUDED.title, description=EXCLUDED.description,
           price_cents=EXCLUDED.price_cents, image_url=EXCLUDED.image_url, stock=EXCLUDED.stock`,
        [s.tid, store.id, p.externalId, p.title, p.description, p.priceCents, p.currency, p.imageUrl, p.stock],
      );
      imported++;
    }
    await db.query(`UPDATE stores SET last_synced_at = now() WHERE tenant_id = $1 AND id = $2`, [
      s.tid,
      store.id,
    ]);
    return json({ ok: true, imported });
  });
}
