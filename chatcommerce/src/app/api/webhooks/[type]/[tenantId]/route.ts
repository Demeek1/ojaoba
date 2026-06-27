import { ownerQuery } from '@/lib/db';
import { decryptSecrets, safeEqual } from '@/lib/crypto';
import { getChannel } from '@/lib/channels';
import { handleInbound } from '@/lib/chatbot';

export const runtime = 'nodejs';

/**
 * Public, per-tenant webhook: /api/webhooks/<type>/<tenantId>?s=<secret>
 *
 * Security model:
 *   - tenantId in the path identifies the vendor; the `s` query param must match
 *     that channel's stored webhook_secret (constant-time compare). Without the
 *     right secret, the request is rejected — no tenant data is touched.
 *   - We look the channel up by (tenant_id, type) and verify the secret BEFORE
 *     decrypting any credentials or running any logic.
 *   - All order/conversation writes happen through the tenant-scoped engine,
 *     so a leaked URL for vendor A can never write into vendor B.
 */

async function loadChannel(tenantId: string, type: string, secret: string | null) {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId) || !secret) return null;
  const rows = await ownerQuery(
    `SELECT c.id, c.credentials, c.webhook_secret, t.status AS tenant_status
       FROM channels c JOIN tenants t ON t.id = c.tenant_id
      WHERE c.tenant_id = $1 AND c.type = $2
      LIMIT 1`,
    [tenantId, type],
  );
  const ch = rows[0];
  if (!ch) return null;
  if (!safeEqual(secret, ch.webhook_secret)) return null;
  if (ch.tenant_status === 'suspended') return null;
  return ch;
}

// Meta (WhatsApp / Instagram) verification handshake
export async function GET(req: Request, { params }: { params: { type: string; tenantId: string } }) {
  const url = new URL(req.url);
  const connector = getChannel(params.type);
  if (!connector?.verify) return new Response('ok', { status: 200 });
  const ch = await loadChannel(params.tenantId, params.type, url.searchParams.get('s'));
  if (!ch) return new Response('forbidden', { status: 403 });
  const creds = decryptSecrets(ch.credentials);
  const challenge = connector.verify(url.searchParams, creds);
  return challenge !== null ? new Response(challenge, { status: 200 }) : new Response('forbidden', { status: 403 });
}

export async function POST(req: Request, { params }: { params: { type: string; tenantId: string } }) {
  const url = new URL(req.url);
  const connector = getChannel(params.type);
  if (!connector) return new Response('unknown channel', { status: 404 });

  const ch = await loadChannel(params.tenantId, params.type, url.searchParams.get('s'));
  // Always 200 to providers (so they don't disable the webhook) but do nothing.
  if (!ch) return new Response('ok', { status: 200 });

  const body = await req.json().catch(() => ({}));
  const messages = connector.parseInbound(body);
  const creds = decryptSecrets(ch.credentials);

  for (const inbound of messages) {
    try {
      const reply = await handleInbound(params.tenantId, ch.id, params.type, 'USD', inbound);
      await connector.send(creds, { customerRef: inbound.customerRef, text: reply.text });
    } catch (e) {
      console.error('[webhook] handler error', e);
    }
  }
  return new Response('ok', { status: 200 });
}
