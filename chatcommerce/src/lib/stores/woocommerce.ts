import type { StoreConnector, NormalizedProduct } from './index';

/**
 * WooCommerce (WordPress) REST API product import.
 * domain: example.com  (the WordPress site)
 * Credentials (encrypted at rest): { consumerKey, consumerSecret }
 */
export const woocommerce: StoreConnector = {
  provider: 'woocommerce',

  async fetchProducts(domain: string, creds: Record<string, any>): Promise<NormalizedProduct[]> {
    const { consumerKey, consumerSecret } = creds;
    if (!domain || !consumerKey || !consumerSecret) {
      throw new Error('WooCommerce domain, consumerKey and consumerSecret are required');
    }
    const base = domain.replace(/\/$/, '');
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

    const out: NormalizedProduct[] = [];
    let page = 1;
    while (true) {
      const res = await fetch(
        `https://${base}/wp-json/wc/v3/products?per_page=100&page=${page}`,
        { headers: { Authorization: `Basic ${auth}` } },
      );
      if (!res.ok) throw new Error(`WooCommerce error ${res.status}`);
      const items: any[] = await res.json();
      if (!Array.isArray(items) || items.length === 0) break;
      for (const p of items) {
        const price = Math.round(parseFloat(p.price ?? '0') * 100);
        out.push({
          externalId: String(p.id),
          title: p.name ?? 'Untitled',
          description: (p.short_description || p.description || '').replace(/<[^>]*>/g, '').trim().slice(0, 2000),
          priceCents: isNaN(price) ? 0 : price,
          currency: 'USD',
          imageUrl: p?.images?.[0]?.src ?? null,
          stock: typeof p.stock_quantity === 'number' ? p.stock_quantity : null,
        });
      }
      if (items.length < 100) break;
      page++;
      if (page > 100) break; // hard safety cap
    }
    return out;
  },
};
