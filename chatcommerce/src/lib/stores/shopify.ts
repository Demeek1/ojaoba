import type { StoreConnector, NormalizedProduct } from './index';

/**
 * Shopify Admin API product import.
 * domain: myshop.myshopify.com
 * Credentials (encrypted at rest): { accessToken }  (Admin API access token)
 */
export const shopify: StoreConnector = {
  provider: 'shopify',

  async fetchProducts(domain: string, creds: Record<string, any>): Promise<NormalizedProduct[]> {
    const { accessToken } = creds;
    if (!domain || !accessToken) throw new Error('Shopify domain and accessToken are required');

    const out: NormalizedProduct[] = [];
    let url: string | null =
      `https://${domain}/admin/api/2024-07/products.json?limit=250`;

    while (url) {
      const res = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': accessToken, 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error(`Shopify error ${res.status}`);
      const data: any = await res.json();
      for (const p of data?.products ?? []) {
        const variant = p?.variants?.[0] ?? {};
        const price = Math.round(parseFloat(variant.price ?? '0') * 100);
        out.push({
          externalId: String(p.id),
          title: p.title ?? 'Untitled',
          description: stripHtml(p.body_html ?? ''),
          priceCents: isNaN(price) ? 0 : price,
          currency: 'USD',
          imageUrl: p?.image?.src ?? p?.images?.[0]?.src ?? null,
          stock: typeof variant.inventory_quantity === 'number' ? variant.inventory_quantity : null,
        });
      }
      // Cursor pagination via Link header
      url = parseNextLink(res.headers.get('link'));
    }
    return out;
  },
};

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, '').trim().slice(0, 2000);
}

function parseNextLink(link: string | null): string | null {
  if (!link) return null;
  const m = link.split(',').find((p) => p.includes('rel="next"'));
  if (!m) return null;
  const url = m.match(/<([^>]+)>/);
  return url ? url[1] : null;
}
