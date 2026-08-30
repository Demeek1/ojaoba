import { ownerQuery } from '@/lib/db';
import { decryptSecrets, safeEqual } from '@/lib/crypto';
import { getChannel } from '@/lib/channels';
import { handleInbound } from '@/lib/chatbot';
import { resolveMedia } from '@/lib/media';

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

  const creds = decryptSecrets(ch.credentials);
  const raw = await req.text();

  // Defense in depth: verify the provider's signature when the connector and
  // the vendor's credentials support it (e.g. Meta X-Hub-Signature-256).
  if (connector.verifySignature && !connector.verifySignature(raw, req.headers, creds)) {
    console.warn('[webhook] signature verification failed', params.type, params.tenantId);
    return new Response('ok', { status: 200 });
  }

  let body: any = {};
  try {
    body = JSON.parse(raw || '{}');
  } catch {
    return new Response('ok', { status: 200 });
  }

  const messages = connector.parseInbound(body);
  for (const inbound of messages) {
    try {
      // Idempotency / replay protection: skip messages we've already processed.
      if (inbound.id) {
        const eventId = `${params.type}:${ch.id}:${inbound.id}`;
        const inserted = await ownerQuery(
          `INSERT INTO webhook_events (id, tenant_id) VALUES ($1, $2)
           ON CONFLICT (id) DO NOTHING RETURNING id`,
          [eventId, params.tenantId],
        ).catch(() => [{ id: eventId }]); // if table missing, don't block delivery
        if (inserted.length === 0) continue; // already handled
      }

      // Voice note / image → understand it into text (Groq transcription or
      // Claude vision), then let the normal bot handle it.
      if (inbound.mediaKind && inbound.mediaId) {
        const understood = await resolveMedia(inbound.mediaKind, inbound.mediaId, creds);
        if (understood) {
          inbound.text = inbound.text ? `${inbound.text} ${understood}` : understood;
        } else if (!inbound.text) {
          await connector.send(creds, {
            customerRef: inbound.customerRef,
            text: inbound.mediaKind === 'audio'
              ? "I couldn't quite hear that voice note — please type what you need. 🙏"
              : "I couldn't read that image — please type the product name. 🙏",
          });
          continue;
        }
      }

      const reply = await handleInbound(params.tenantId, ch.id, params.type, 'USD', inbound);
      await connector.send(creds, { customerRef: inbound.customerRef, text: reply.text });
    } catch (e) {
      console.error('[webhook] handler error', e);
    }
  }
  return new Response('ok', { status: 200 });
}
