import { createHmac, timingSafeEqual } from 'crypto';
import { ownerQuery } from '@/lib/db';
import { decryptSecrets } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Per-vendor Paystack webhook: /api/payments/paystack/<tenantId>
 *
 * Each vendor points their Paystack webhook here. We verify the signature with
 * THAT vendor's secret key (HMAC-SHA512 of the raw body), then, on a successful
 * charge, mark the exact order (from metadata.order_id) as paid.
 */
export async function POST(req: Request, { params }: { params: { tenantId: string } }) {
  const tenantId = params.tenantId;
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return new Response('ok', { status: 200 });

  const raw = await req.text();

  // Look up the vendor's Paystack secret to verify the signature.
  let sk = '';
  try {
    const rows = await ownerQuery(`SELECT payment_config FROM tenants WHERE id = $1`, [tenantId]);
    const enc = rows[0]?.payment_config?.paystackSecretEnc;
    if (enc) sk = decryptSecrets(enc).sk;
  } catch {
    /* ignore */
  }
  if (!sk) return new Response('ok', { status: 200 });

  const sig = req.headers.get('x-paystack-signature') || '';
  const expected = createHmac('sha512', sk).update(raw).digest('hex');
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response('ok', { status: 200 });
  } catch {
    return new Response('ok', { status: 200 });
  }

  let event: any = {};
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('ok', { status: 200 });
  }

  if (event?.event === 'charge.success') {
    const orderId = event?.data?.metadata?.order_id;
    const metaTenant = event?.data?.metadata?.tenant_id;
    if (orderId && metaTenant === tenantId) {
      try {
        await ownerQuery(
          `UPDATE orders SET status = 'paid' WHERE id = $1 AND tenant_id = $2 AND status <> 'paid'`,
          [orderId, tenantId],
        );
      } catch (e) {
        console.error('[paystack webhook] update failed', e);
      }
    }
  }
  return new Response('ok', { status: 200 });
}
