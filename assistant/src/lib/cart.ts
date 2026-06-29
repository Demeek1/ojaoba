export interface CartItem {
  id: string;
  qty: number;
  title: string;
  price_kobo: number;
  image_url: string;
  note: string;
  shopify_id?: string | null; // links the order to the real Shopify product
  variant_id?: string | null; // chosen Shopify variant (decrements inventory)
}

const KEY = 'oja_assistant_cart';

export function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

export function saveCart(cart: CartItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(cart));
}

export function clearCart(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}
