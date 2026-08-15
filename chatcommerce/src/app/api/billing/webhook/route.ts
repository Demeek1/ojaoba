import { markTenantActive } from '@/lib/billing';

export const runtime = 'nodejs';

/**
 * Stripe webhook → flip a tenant to billing_status='active' on successful
 * subscription checkout. Signature verification uses STRIPE_WEBHOOK_SECRET.
 *
 * (Verification is implemented with the standard Stripe scheme; if the secret
 * is not configured we reject, so this endpoint is inert until billing is set up.)
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return new Response('billing not configured', { status: 400 });

  const sig = req.headers.get('stripe-signature') || '';
  const payload = await req.text();
  if (!(await verifyStripe(payload, sig, secret))) {
    return new Response('bad signature', { status: 400 });
  }

  const event = JSON.parse(payload);
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const tenantId = session?.metadata?.tenant_id;
    if (tenantId) await markTenantActive(tenantId, session.customer);
  }
  return new Response('ok', { status: 200 });
}

async function verifyStripe(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=')));
    const t = parts['t'];
    const v1 = parts['v1'];
    if (!t || !v1) return false;
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const mac = await crypto.subtle.sign('HMAC', key, enc.encode(`${t}.${payload}`));
    const expected = Array.from(new Uint8Array(mac))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    return expected === v1;
  } catch {
    return false;
  }
}
