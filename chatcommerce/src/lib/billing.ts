import { ownerQuery } from './db';

/**
 * Billing gate. Vendors must have an active subscription (or be on trial) before
 * their store goes live, when BILLING_ENFORCED=true.
 *
 * Two providers, chosen with BILLING_PROVIDER ("stripe" | "paystack"):
 *   - Stripe  — cards/global, USD. Default.
 *   - Paystack — ideal for NGN and African vendors.
 * Both create a hosted checkout URL server-side and confirm via a signed webhook
 * that flips tenants.billing_status to 'active'.
 */

export type Provider = 'stripe' | 'paystack';

export function billingProvider(): Provider {
  return (process.env.BILLING_PROVIDER as Provider) === 'paystack' ? 'paystack' : 'stripe';
}

export function billingEnforced(): boolean {
  return process.env.BILLING_ENFORCED === 'true';
}

/** Returns a hosted checkout URL for whichever provider is configured. */
export async function createCheckout(tenantId: string, email: string): Promise<string> {
  return billingProvider() === 'paystack'
    ? createPaystackCheckout(tenantId, email)
    : createStripeCheckout(tenantId, email);
}

// ── Stripe ──────────────────────────────────────────────────────────────────
async function createStripeCheckout(tenantId: string, email: string): Promise<string> {
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

// ── Paystack ────────────────────────────────────────────────────────────────
async function createPaystackCheckout(tenantId: string, email: string): Promise<string> {
  const key = process.env.PAYSTACK_SECRET_KEY;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  if (!key) throw new Error('Paystack is not configured (set PAYSTACK_SECRET_KEY)');

  // Amount in the smallest unit (kobo). PAYSTACK_AMOUNT in major units; default ₦5000.
  const amountMajor = Number(process.env.PAYSTACK_AMOUNT || '5000');
  const payload: Record<string, any> = {
    email,
    amount: Math.round(amountMajor * 100),
    currency: process.env.PAYSTACK_CURRENCY || 'NGN',
    metadata: { tenant_id: tenantId },
    callback_url: `${appUrl}/dashboard?billing=success`,
  };
  // If a plan code is set, this becomes a recurring subscription.
  if (process.env.PAYSTACK_PLAN) payload.plan = process.env.PAYSTACK_PLAN;

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Paystack error ${res.status}: ${await res.text()}`);
  const data: any = await res.json();
  if (!data?.data?.authorization_url) throw new Error('Paystack did not return a checkout URL');
  return data.data.authorization_url;
}

// ── Shared ──────────────────────────────────────────────────────────────────
export async function markTenantActive(tenantId: string, customerRef?: string) {
  await ownerQuery(
    `UPDATE tenants SET billing_status = 'active',
        plan = CASE WHEN plan = 'trial' THEN 'starter' ELSE plan END,
        stripe_customer_id = COALESCE($2, stripe_customer_id), updated_at = now()
     WHERE id = $1`,
    [tenantId, customerRef ?? null],
  );
}
