/**
 * Per-vendor Paystack: initialize a unique transaction for one order so the
 * customer pays into the VENDOR'S OWN Paystack account, and the order id rides
 * in metadata so the webhook can auto-confirm exactly that order.
 */

export interface InitResult {
  url: string;
  reference: string;
}

/** Build a valid-format email from a chat id (Paystack requires an email). */
export function syntheticEmail(customerRef: string): string {
  const clean = (customerRef || 'customer').replace(/[^a-z0-9]/gi, '').slice(0, 40) || 'customer';
  return `${clean}@checkout.chatcommerce.app`;
}

export async function initializeTransaction(
  secretKey: string,
  opts: { amountMinor: number; email: string; currency?: string; metadata: Record<string, any>; callbackUrl?: string },
): Promise<InitResult | null> {
  try {
    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: opts.email,
        amount: Math.round(opts.amountMinor),
        currency: opts.currency || 'NGN',
        metadata: opts.metadata,
        callback_url: opts.callbackUrl,
      }),
    });
    if (!res.ok) {
      console.error('[paystack] initialize failed', res.status, await res.text().catch(() => ''));
      return null;
    }
    const data: any = await res.json();
    if (!data?.data?.authorization_url) return null;
    return { url: data.data.authorization_url, reference: data.data.reference };
  } catch (e) {
    console.error('[paystack] initialize error', e);
    return null;
  }
}
