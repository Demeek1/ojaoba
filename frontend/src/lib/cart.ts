export interface CartItem {
  id: string;
  qty: number;
  title: string;
  price_kobo: number;
  image_url: string;
  note: string; // per-item preparation note (e.g. "chopped", "sliced")
  shopify_id?: string | null; // Shopify product id — links the order to the real product
  variant_id?: string | null; // Shopify variant id — chosen size/option, decrements inventory
}

const KEY = 'oja_cart';

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
  catch { return []; }
}

export function saveCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
