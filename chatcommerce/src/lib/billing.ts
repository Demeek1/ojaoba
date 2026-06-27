import { ownerQuery } from './db';

/**
 * Billing gate. Vendors must have an active subscription (or be on trial) before
 * their store goes live, when BILLING_ENFORCED=true. Stripe is the default
 * provider; the abstraction keeps it swappable (e.g. Paystack for NGN).
 *
 * Kept deliberately thin: a Stripe Checkout session is created server-side, and
 * the Stripe webhook flips tenants.billing_status to 'active'.
 */

export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === 'true';
}

export async function createCheckout(tenantId: string, email: string): Promise<string> {
  const key = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!key || !price) throw new Error('Stripe is not configured (set STRIPE_SECRET_KEY and STRIPE_PRICE_ID)');

  const body = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    customer_email: email,
    'metadata[tenant_id]': tenantId,
    success_url: `${appUrl}/dashboard?billing=success`,
    cancel_url: `${appUrl}/dashboard?billing=cancel`,
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`Stripe error ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  return data.url;
}

export async function markTenantActive(tenantId: string, customerId?: string) {
  await ownerQuery(
    `UPDATE tenants SET billing_status = 'active', plan = CASE WHEN plan = 'trial' THEN 'starter' ELSE plan END,
        stripe_customer_id = COALESCE($2, stripe_customer_id), updated_at = now()
     WHERE id = $1`,
    [tenantId, customerId ?? null],
  );
}
