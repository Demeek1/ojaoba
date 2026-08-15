import { createHmac } from 'crypto';
import { markTenantActive } from '@/lib/billing';

export const runtime = 'nodejs';

/**
 * Paystack webhook → activate a tenant on successful charge / subscription.
 * Verifies the x-paystack-signature header (HMAC-SHA512 of the raw body with the
 * secret key). Inert until PAYSTACK_SECRET_KEY is configured.
 */
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return new Response('billing not configured', { status: 400 });

  const raw = await req.text();
  const sig = req.headers.get('x-paystack-signature') || '';
  const expected = createHmac('sha512', secret).update(raw).digest('hex');
  if (sig !== expected) return new Response('bad signature', { status: 401 });

  let event: any;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('bad payload', { status: 400 });
  }

  if (event?.event === 'charge.success' || event?.event === 'subscription.create') {
    const tenantId = event?.data?.metadata?.tenant_id;
    const customer = event?.data?.customer?.customer_code;
    if (tenantId) await markTenantActive(tenantId, customer);
  }
  return new Response('ok', { status: 200 });
}
