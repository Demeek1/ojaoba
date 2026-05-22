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
    db.query(`SELECT id,shopify_id,title,price_kobo,compare_price_kobo,image_url,available,inventory,variants,description,category FROM products WHERE category=$1 AND available=true ORDER BY purchase_count DESC, title LIMIT $2 OFFSET $3`, [category, size, offset]),
    db.query(`SELECT COUNT(*)::int AS count FROM products WHERE category=$1 AND available=true`, [category]),
  ]);
  const total = count[0]?.count || 0;
  return { products, total, totalPages: Math.ceil(total/size), page };
};

/**
 * Rerank title results so the search term used as the PRODUCT TYPE comes first,
 * and products where the term is a MODIFIER (no sugar, zero sugar, sugar-free) go last.
 *
 * e.g. "sugar" → ["Dangote Sugar 1kg", "Golden Penny Sugar"] first,
 *                 ["Alpen No Sugar Cereals", "Coca-Cola Zero Sugar"] pushed to end
 */
function rerankByRelevance(rows: any[], q: string): any[] {
  const lq = q.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Pattern: term is preceded by a negation word → NOT what the customer wants
  const negationRegex = new RegExp(`\\b(no|zero|without|free|less|low|non|reduced|sugar.?free)\\s+${lq}`, 'i');

  const positive: any[] = [];
  const negative: any[] = [];

  for (const row of rows) {
    negationRegex.test(row.title) ? negative.push(row) : positive.push(row);
  }

  // Within positive results: sort by how early the term appears in the title
  // "Dangote Sugar 1kg" → sugar at position 8 (PRODUCT is sugar)
  // "Golden Penny Premium White Granulated Sugar 250g" → sugar at position 38 (still the product)
  positive.sort((a: any, b: any) => {
    const posA = a.title.toLowerCase().indexOf(lq);
    const posB = b.title.toLowerCase().indexOf(lq);
    return posA - posB;
  });

  return [...positive, ...negative];
}

export const searchProducts = async (q: string, limit=8) => {
  const term = `%${q}%`;

  // 1️⃣ Title-only match — fetch extra rows so we can rerank before slicing
  const titleMatch = await db.query(
    `SELECT id,shopify_id,title,price_kobo,image_url,available,category,description
     FROM products WHERE available=true AND title ILIKE $1
     ORDER BY title LIMIT $2`,
    [term, limit * 3]  // fetch more so reranking has enough to work with
  );
  if (titleMatch.rows.length > 0) return rerankByRelevance(titleMatch.rows, q).slice(0, limit);

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
    db.query(`SELECT id,shopify_id,title,price_kobo,compare_price_kobo,image_url,available,inventory,category,description,updated_at FROM products ${where} ORDER BY purchase_count DESC, title LIMIT $1 OFFSET $2`, params),
    db.query(`SELECT COUNT(*)::int AS count FROM products ${category?'WHERE category=$1 AND available=true':'WHERE available=true'}`, category?[category]:[]),
  ]);
  return { products, total: count[0]?.count||0, page, totalPages: Math.ceil((count[0]?.count||0)/size) };
};

/** Increment purchase_count for each item by qty when an order is paid */
export const incrementPurchaseCounts = async (items: { shopifyId?: string; id?: string; quantity: number }[]) => {
  for (const item of items) {
    if (item.shopifyId) {
      await db.query(
        `UPDATE products SET purchase_count = purchase_count + $1 WHERE shopify_id = $2`,
        [item.quantity, String(item.shopifyId)]
      ).catch(() => {});
    } else if (item.id) {
      await db.query(
        `UPDATE products SET purchase_count = purchase_count + $1 WHERE id = $2`,
        [item.quantity, item.id]
      ).catch(() => {});
    }
  }
};

/**
 * Push popularity-based product order into Shopify collections.
 * Sets each collection to manual sort and repositions products by purchase_count DESC.
 * Runs async after payment — errors are swallowed so they never block the order flow.
 */
export const syncShopifyCollectionOrder = async (): Promise<void> => {
  try {
    const api = shopify();

    // 1. Fetch all custom collections
    const { data: colData } = await api.get('/custom_collections.json', { params: { limit: 250 } });
    const collections: any[] = colData.custom_collections || [];

    for (const col of collections) {
      try {
        // 2. Set sort order to manual (required before we can set positions)
        await api.put(`/custom_collections/${col.id}.json`, {
          custom_collection: { id: col.id, sort_order: 'manual' },
        });

        // 3. Get all collects (product↔collection links) for this collection
        const { data: collectsData } = await api.get('/collects.json', {
          params: { collection_id: col.id, limit: 250 },
        });
        const collects: { id: number; product_id: number }[] = collectsData.collects || [];
        if (!collects.length) continue;

        // 4. Look up our purchase_counts for these products
        const shopifyIds = collects.map(c => String(c.product_id));
        const { rows } = await db.query(
          `SELECT shopify_id, purchase_count FROM products WHERE shopify_id = ANY($1)`,
          [shopifyIds]
        );
        const countMap: Record<string, number> = {};
        for (const r of rows) countMap[r.shopify_id] = r.purchase_count;

        // 5. Sort collects by purchase_count DESC
        const sorted = [...collects].sort((a, b) =>
          (countMap[String(b.product_id)] || 0) - (countMap[String(a.product_id)] || 0)
        );

        // 6. Update each collect's position (1-indexed)
        for (let i = 0; i < sorted.length; i++) {
          await api.put(`/collects/${sorted[i].id}.json`, {
            collect: { id: sorted[i].id, position: i + 1 },
          }).catch(() => {});
        }
      } catch { /* skip this collection on error */ }
    }
  } catch (e: any) {
    console.warn('[Shopify] Collection order sync failed (non-fatal):', e.message);
  }
};

/**
 * Look up a Shopify customer by phone (and optionally email).
 * If not found, create one. Returns the Shopify customer ID or null on error.
 */
export const findOrCreateShopifyCustomer = async (
  phone: string, name: string, email?: string | null
): Promise<string | null> => {
  try {
    const api = shopify();
    const cleanPhone = phone.startsWith('+') ? phone : `+${phone}`;
    const names = name.trim().split(' ');

    // 1. Search by phone
    const { data: byPhone } = await api.get('/customers/search.json', {
      params: { query: `phone:${cleanPhone}`, limit: 1 },
    });
    if (byPhone.customers?.length) return String(byPhone.customers[0].id);

    // 2. Search by email if provided
    if (email) {
      const { data: byEmail } = await api.get('/customers/search.json', {
        params: { query: `email:${email}`, limit: 1 },
      });
      if (byEmail.customers?.length) return String(byEmail.customers[0].id);
    }

    // 3. Create new customer
    const { data: created } = await api.post('/customers.json', {
      customer: {
        first_name: names[0] || '',
        last_name: names.slice(1).join(' ') || '',
        phone: cleanPhone,
        ...(email ? { email, verified_email: true } : {}),
        tags: 'ojaoba',
      },
    });
    return String(created.customer.id);
  } catch (e: any) {
    console.warn('[Shopify] findOrCreateShopifyCustomer failed:', e.message);
    return null;
  }
};

export const createShopifyOrder = async (order: {
  items: any[]; customerName: string; customerPhone: string;
  deliveryAddress: string; orderRef: string;
  customerId?: string | null; source?: string;
}): Promise<string> => {
  const names = order.customerName.trim().split(' ');
  const source = order.source || 'whatsapp';

  // Build note from any per-item prep instructions
  const itemNotes = order.items.filter(i => i.note && i.note.trim()).map(i => `• ${i.title}: ${i.note}`);
  const orderNote = [`${source === 'website' ? 'Website' : 'WhatsApp'} Order | Ref: ${order.orderRef}`, ...(itemNotes.length ? ['', 'Prep Instructions:', ...itemNotes] : [])].join('\n');

  const { data } = await shopify().post('/orders.json', {
    order: {
      line_items: order.items.map(i => ({
        title: i.title,
        quantity: i.quantity,
        price: ((i.priceKobo || i.price_kobo || 0)/100).toFixed(2),
        ...(i.variantId ? { variant_id: parseInt(i.variantId) } : (i.shopifyId ? { product_id: parseInt(i.shopifyId) } : {})),
        ...(i.note && i.note.trim() ? { properties: [{ name: 'Prep Instructions', value: i.note }] } : {}),
      })),
      // Attach to existing Shopify customer if we found/created one
      ...(order.customerId
        ? { customer: { id: parseInt(order.customerId) } }
        : { customer: { first_name: names[0]||'', last_name: names.slice(1).join(' ')||'', phone: order.customerPhone } }
      ),
      shipping_address: { name: order.customerName, address1: order.deliveryAddress, phone: order.customerPhone, country: 'Nigeria', country_code: 'NG' },
      note: orderNote,
      tags: `${source},ojaoba`,
      financial_status: 'paid',
      send_receipt: false,
    },
  });
  return String(data.order.id);
};

export const decrementInventory = async (shopifyId: string, qty: number) =>
  db.query(`UPDATE products SET inventory=GREATEST(0,COALESCE(inventory,0)-$1), available=CASE WHEN GREATEST(0,COALESCE(inventory,0)-$1)>0 THEN true ELSE false END WHERE shopify_id=$2`, [qty, shopifyId]).catch(()=>{});
