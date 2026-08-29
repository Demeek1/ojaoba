import { ownerQuery } from '@/lib/db';
import { runAssistant, type CartItem } from '@/lib/assistant';
import { clientIp, isRateLimited, recordFail } from '@/lib/ratelimit';
import { logEvent } from '@/lib/track';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public, CORS-enabled chat endpoint for the embeddable website widget.
 * Anyone's website can POST here; it is scoped to one tenant and rate-limited.
 * No auth/cookies — it only ever touches that vendor's public catalogue.
 */
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...cors } });
}

export async function POST(req: Request, { params }: { params: { tenantId: string } }) {
  const tenantId = params.tenantId;
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return json({ error: 'bad store' }, 400);

  const ipKey = `widget:${clientIp(req)}`;
  if (await isRateLimited(ipKey, 40, 15)) return json({ reply: 'You’re sending messages very fast — please wait a moment. 🙏', cart: [] }, 200);
  await recordFail(ipKey);

  const tenant = (await ownerQuery(`SELECT business_name, slug, status FROM tenants WHERE id = $1`, [tenantId]))[0];
  if (!tenant || tenant.status === 'suspended') return json({ error: 'store unavailable' }, 404);

  const body = await req.json().catch(() => ({}));
  const message = String(body?.message || '').slice(0, 500);
  const sessionId = body?.sessionId ? String(body.sessionId).slice(0, 64) : null;
  const cart: CartItem[] = Array.isArray(body?.cart) ? body.cart.slice(0, 50) : [];
  if (!message) return json({ reply: `Hi! Welcome to ${tenant.business_name}. What are you looking for today? 😊`, cart });

  const cartCountBefore = cart.reduce((s, c) => s + (c.qty || 0), 0);
  await logEvent(tenantId, sessionId, 'ai_message', { text: message });

  const currency = (await ownerQuery(`SELECT currency FROM products WHERE tenant_id = $1 LIMIT 1`, [tenantId]))[0]?.currency || 'NGN';

  // Rich assistant when AI is configured…
  const outcome = await runAssistant(tenantId, tenant.business_name, currency, message, cart);
  if (outcome) {
    const after = outcome.cart.reduce((s, c) => s + (c.qty || 0), 0);
    if (after > cartCountBefore) await logEvent(tenantId, sessionId, 'add_to_cart', {});
    return json({ reply: outcome.reply, cart: outcome.cart, slug: tenant.slug });
  }

  // …otherwise a simple catalogue search fallback.
  const rows = await ownerQuery(
    `SELECT title, price_cents, currency FROM products
      WHERE tenant_id = $1 AND active = true AND (title ILIKE $2 OR description ILIKE $2)
      ORDER BY created_at DESC LIMIT 6`,
    [tenantId, `%${message.slice(0, 40)}%`],
  );
  const reply = rows.length
    ? `Here's what I found:\n${rows.map((r: any) => `• ${r.title} — ${r.currency} ${(Number(r.price_cents) / 100).toLocaleString()}`).join('\n')}`
    : `I couldn't find that. Try another product name, or browse our store.`;
  return json({ reply, cart, slug: tenant.slug });
}
