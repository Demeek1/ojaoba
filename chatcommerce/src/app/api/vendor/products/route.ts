import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { tenantDb } from '@/lib/db';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const db = tenantDb(s.tid);
    const rows = await db.query(
      `SELECT id, title, description, price_cents, currency, image_url, stock, active, created_at
         FROM products WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 500`,
      [s.tid],
    );
    return json({ products: rows });
  });
}

const NewProduct = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional().default(''),
  priceCents: z.number().int().min(0),
  currency: z.string().length(3).optional().default('USD'),
  imageUrl: z.string().url().optional().nullable(),
  stock: z.number().int().optional().nullable(),
});

export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = NewProduct.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid product', 422);
    const p = parsed.data;
    const db = tenantDb(s.tid);
    const row = (
      await db.query(
        `INSERT INTO products (tenant_id, title, description, price_cents, currency, image_url, stock)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [s.tid, p.title, p.description, p.priceCents, p.currency, p.imageUrl ?? null, p.stock ?? null],
      )
    )[0];
    return json({ ok: true, id: row.id }, 201);
  });
}
