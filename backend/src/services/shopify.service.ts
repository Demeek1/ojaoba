import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const shopify = () => axios.create({
  baseURL: `https://${process.env.SHOPIFY_STORE_DOMAIN}/admin/api/2025-01`,
  headers: { 'X-Shopify-Access-Token': process.env.SHOPIFY_ACCESS_TOKEN!, 'Content-Type': 'application/json' },
  timeout: 15000,
});

const toKobo = (price: any): number => Math.round(parseFloat(price || '0') * 100);

export const syncProducts = async (): Promise<{ synced: number; categories: string[] }> => {
  // Step 1: Build product → collection map from Shopify collections
  const productCollectionMap: Record<string, string> = {};
  try {
    const { data: colData } = await shopify().get('/custom_collections.json', { params: { limit: 250 } });
    for (const col of colData.custom_collections || []) {
      let colPageInfo: string | null = null;
      do {
        const colParams: any = { collection_id: col.id, limit: 250 };
        if (colPageInfo) colParams.page_info = colPageInfo;
        const { data: collectsData, headers: ch } = await shopify().get('/collects.json', { params: colParams });
        for (const c of collectsData.collects || []) {
          if (!productCollectionMap[String(c.product_id)]) {
            productCollectionMap[String(c.product_id)] = col.title;
          }
        }
        const cl: string = (ch as any).link || '';
        const nx = cl.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
        colPageInfo = nx ? nx[1] : null;
      } while (colPageInfo);
    }
    console.log(`[Shopify] Built collection map for ${Object.keys(productCollectionMap).length} products`);
  } catch (e: any) {
    console.warn('[Shopify] Could not build collection map:', e.message);
  }

  // Step 2: Sync all products (active + draft) with collection-based categories
  let pageInfo: string | null = null;
  let synced = 0;

  do {
    const params: any = { limit: 250 };
    if (pageInfo) params.page_info = pageInfo;
    const { data, headers } = await shopify().get('/products.json', { params }).catch((e: any) => {
      const msg = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      throw new Error(`Shopify API error: ${msg}`);
    });

    for (const p of data.products || []) {
      const fv = p.variants?.[0];
      const variants = (p.variants || []).map((v: any) => ({ id: String(v.id), title: v.title === 'Default Title' ? null : v.title, priceKobo: toKobo(v.price), inventory: v.inventory_quantity ?? null, available: (v.inventory_quantity ?? 1) > 0 }));
      const category = productCollectionMap[String(p.id)] || p.product_type?.trim() || 'General';
      const available = p.status === 'active' || (fv?.inventory_quantity ?? 0) > 0;
      await db.query(`
        INSERT INTO products (id,shopify_id,title,description,category,tags,price_kobo,compare_price_kobo,image_url,available,inventory,variants,handle,shopify_url,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (shopify_id) DO UPDATE SET title=$3,description=$4,category=$5,tags=$6,price_kobo=$7,compare_price_kobo=$8,image_url=$9,available=$10,inventory=$11,variants=$12,updated_at=NOW()
      `, [uuidv4(), String(p.id), p.title, (p.body_html||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim().slice(0,500), category, p.tags?p.tags.split(',').map((t:string)=>t.trim()).filter(Boolean):[], toKobo(fv?.price), fv?.compare_at_price?toKobo(fv.compare_at_price):null, p.images?.[0]?.src||null, available, fv?.inventory_quantity??null, JSON.stringify(variants), p.handle, `https://${process.env.SHOPIFY_STORE_DOMAIN}/products/${p.handle}`]);
      synced++;
    }

    const link: string = (headers as any).link || '';
    const next = link.match(/<[^>]*page_info=([^>&"]+)[^>]*>;\s*rel="next"/);
    pageInfo = next ? next[1] : null;
  } while (pageInfo);

  const cats = await getCategories();
  console.log(`[Shopify] Synced ${synced} products across ${cats.length} categories`);
  return { synced, categories: cats };
};

export const getCategories = async (): Promise<string[]> => {
  const { rows } = await db.query(`SELECT DISTINCT category FROM products WHERE available=true ORDER BY category`);
  return rows.map((r: any) => r.category);
};

export const getProductsByCategory = async (category: string, page=1, size=8) => {
  const offset = (page-1)*size;
  const [{ rows: products }, { rows: count }] = await Promise.all([
    db.query(`SELECT id,shopify_id,title,price_kobo,compare_price_kobo,image_url,available,inventory,variants,description,category FROM products WHERE category=$1 AND available=true ORDER BY title LIMIT $2 OFFSET $3`, [category, size, offset]),
    db.query(`SELECT COUNT(*)::int AS count FROM products WHERE category=$1 AND available=true`, [category]),
  ]);
  const total = count[0]?.count || 0;
  return { products, total, totalPages: Math.ceil(total/size), page };
};

export const searchProducts = async (q: string, limit=8) => {
  const term = `%${q}%`;

  // 1️⃣ Title-only match (most accurate — "beans" should match "Beans" not "Palm Oil")
  const titleMatch = await db.query(
    `SELECT id,shopify_id,title,price_kobo,image_url,available,category,description
     FROM products WHERE available=true AND title ILIKE $1
     ORDER BY title LIMIT $2`,
    [term, limit]
  );
  if (titleMatch.rows.length > 0) return titleMatch.rows;

  // 2️⃣ Category match (e.g. searching "vegetables")
  const catMatch = await db.query(
    `SELECT id,shopify_id,title,price_kobo,image_url,available,category,description
     FROM products WHERE available=true AND category ILIKE $1
     ORDER BY title LIMIT $2`,
    [term, limit]
  );
  if (catMatch.rows.length > 0) return catMatch.rows;

  // 3️⃣ Tags match
  const tagMatch = await db.query(
    `SELECT id,shopify_id,title,price_kobo,image_url,available,category,description
     FROM products WHERE available=true AND tags::text ILIKE $1
     ORDER BY title LIMIT $2`,
    [term, limit]
  );
  if (tagMatch.rows.length > 0) return tagMatch.rows;

  // 4️⃣ Last resort: description (but NEVER return if title/category/tags matched something)
  const descMatch = await db.query(
    `SELECT id,shopify_id,title,price_kobo,image_url,available,category,description
     FROM products WHERE available=true AND description ILIKE $1
     AND title NOT ILIKE $1
     ORDER BY title LIMIT $2`,
    [term, limit]
  );
  return descMatch.rows;
};

export const getProduct = async (id: string) => {
  const { rows } = await db.query(`SELECT * FROM products WHERE id=$1 OR shopify_id=$1 LIMIT 1`, [id]);
  const r = rows[0];
  if (r && typeof r.variants === 'string') r.variants = JSON.parse(r.variants);
  return r || null;
};

export const getAllProducts = async (page=1, size=20, category?: string) => {
  const offset = (page-1)*size;
  const where = category ? `WHERE category=$3 AND available=true` : `WHERE available=true`;
  const params = category ? [size, offset, category] : [size, offset];
  const [{ rows: products }, { rows: count }] = await Promise.all([
    db.query(`SELECT id,shopify_id,title,price_kobo,compare_price_kobo,image_url,available,inventory,category,updated_at FROM products ${where} ORDER BY category,title LIMIT $1 OFFSET $2`, params),
    db.query(`SELECT COUNT(*)::int AS count FROM products ${category?'WHERE category=$1 AND available=true':'WHERE available=true'}`, category?[category]:[]),
  ]);
  return { products, total: count[0]?.count||0, page, totalPages: Math.ceil((count[0]?.count||0)/size) };
};

export const createShopifyOrder = async (order: { items: any[]; customerName: string; customerPhone: string; deliveryAddress: string; orderRef: string }): Promise<string> => {
  const names = order.customerName.trim().split(' ');

  // Build note from any per-item prep instructions
  const itemNotes = order.items.filter(i => i.note && i.note.trim()).map(i => `• ${i.title}: ${i.note}`);
  const orderNote = [`WhatsApp Order | Ref: ${order.orderRef}`, ...(itemNotes.length ? ['', 'Prep Instructions:', ...itemNotes] : [])].join('\n');

  const { data } = await shopify().post('/orders.json', {
    order: {
      line_items: order.items.map(i => ({
        title: i.title,
        quantity: i.quantity,
        price: (i.priceKobo/100).toFixed(2),
        ...(i.variantId ? { variant_id: parseInt(i.variantId) } : { product_id: parseInt(i.shopifyId) }),
        // Show prep note as a line item property in Shopify
        ...(i.note && i.note.trim() ? { properties: [{ name: 'Prep Instructions', value: i.note }] } : {}),
      })),
      customer: { first_name: names[0]||'', last_name: names.slice(1).join(' ')||'', phone: order.customerPhone },
      shipping_address: { name: order.customerName, address1: order.deliveryAddress, phone: order.customerPhone, country: 'Nigeria', country_code: 'NG' },
      note: orderNote,
      tags: 'whatsapp,ojaoba',
      financial_status: 'paid',
      send_receipt: false,
    },
  });
  return String(data.order.id);
};

export const decrementInventory = async (shopifyId: string, qty: number) =>
  db.query(`UPDATE products SET inventory=GREATEST(0,COALESCE(inventory,0)-$1), available=CASE WHEN GREATEST(0,COALESCE(inventory,0)-$1)>0 THEN true ELSE false END WHERE shopify_id=$2`, [qty, shopifyId]).catch(()=>{});
