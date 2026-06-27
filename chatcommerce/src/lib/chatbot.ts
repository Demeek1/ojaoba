import { tenantTx } from './db';
import type { InboundMessage } from './channels';
import { aiEnabled, aiConcierge, type AiAction } from './ai';

/**
 * Channel-agnostic conversational ordering engine.
 *
 * Flow:
 *   1. Read a snapshot (conversation + cart + product list) for the tenant.
 *   2. Decide an ACTION from the message — via the AI concierge if configured,
 *      otherwise via simple keyword parsing.
 *   3. Apply the action (add/checkout/etc.) inside a tenant transaction, using
 *      real catalog data so prices and totals are always authoritative.
 *
 * All DB work runs under RLS scoped to the tenant, so a conversation and its
 * order can only ever touch the owning vendor's rows.
 */

interface Reply {
  text: string;
}
interface CartItem {
  productId: string;
  title: string;
  priceCents: number;
  qty: number;
}

const fmt = (cents: number, currency: string) => `${currency} ${(cents / 100).toFixed(2)}`;

export async function handleInbound(
  tenantId: string,
  channelId: string,
  channelType: string,
  currency: string,
  inbound: InboundMessage,
): Promise<Reply> {
  const text = inbound.text.trim();

  // ── Phase 1: snapshot (short read transaction) ────────────────────────────
  const snap = await tenantTx(tenantId, async (q) => {
    const conv = (
      await q(
        `INSERT INTO conversations (tenant_id, channel_id, customer_ref, state)
         VALUES ($1,$2,$3,'{}'::jsonb)
         ON CONFLICT (tenant_id, channel_id, customer_ref)
         DO UPDATE SET updated_at = now()
         RETURNING id, state`,
        [tenantId, channelId, inbound.customerRef],
      )
    )[0];
    const products = await q(
      `SELECT id, title, price_cents FROM products
        WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC LIMIT 10`,
      [tenantId],
    );
    const tenant = (await q(`SELECT business_name FROM tenants WHERE id = $1`, [tenantId]))[0];
    return {
      convId: conv.id as string,
      cart: (conv.state?.cart ?? []) as CartItem[],
      products: products as { id: string; title: string; price_cents: string }[],
      storeName: (tenant?.business_name as string) ?? 'our store',
    };
  });

  // ── Phase 2: decide the action (AI concierge, else keyword) ───────────────
  let action: AiAction | null = null;
  let aiReply: string | null = null;
  if (aiEnabled()) {
    const aip = snap.products.map((p, i) => ({
      index: i + 1,
      id: p.id,
      title: p.title,
      priceLabel: fmt(Number(p.price_cents), currency),
    }));
    const r = await aiConcierge(
      snap.storeName,
      text,
      aip,
      snap.cart.map((c) => ({ title: c.title, qty: c.qty })),
    );
    if (r) {
      action = r.action;
      aiReply = r.reply;
    }
  }
  if (!action) action = parseKeyword(text);

  // ── Phase 3: apply the action (write transaction) ─────────────────────────
  return tenantTx(tenantId, async (q) => {
    const cart = snap.cart;
    const save = (c: CartItem[]) =>
      q(`UPDATE conversations SET state = $2, updated_at = now() WHERE id = $1`, [
        snap.convId,
        JSON.stringify({ cart: c }),
      ]);

    const menuText = () => {
      if (snap.products.length === 0)
        return `Welcome to ${snap.storeName}! We're still setting up — no products yet. Please check back soon.`;
      const lines = snap.products
        .map((p, i) => `${i + 1}. ${p.title} — ${fmt(Number(p.price_cents), currency)}`)
        .join('\n');
      return `🛍️ Welcome to ${snap.storeName}! Here's what we have:\n\n${lines}\n\nReply *add <number>* to add, *cart* to review, *checkout* to order.`;
    };
    const cartText = () => {
      if (cart.length === 0) return 'Your cart is empty. Reply *menu* to browse. 🛒';
      const lines = cart.map((c) => `• ${c.qty}× ${c.title} — ${fmt(c.priceCents * c.qty, currency)}`).join('\n');
      const total = cart.reduce((s, c) => s + c.priceCents * c.qty, 0);
      return `🧺 Your cart:\n${lines}\n\nTotal: *${fmt(total, currency)}*\nReply *checkout* to place your order.`;
    };

    switch (action!.type) {
      case 'menu':
        return { text: menuText() };

      case 'add': {
        const picked = snap.products[action!.index - 1];
        if (!picked) return { text: 'Hmm, I could not find that item. Reply *menu* to see the list.' };
        const existing = cart.find((c) => c.productId === picked.id);
        const qty = (action as any).qty ?? 1;
        if (existing) existing.qty += qty;
        else cart.push({ productId: picked.id, title: picked.title, priceCents: Number(picked.price_cents), qty });
        await save(cart);
        return { text: `✅ Added ${qty}× *${picked.title}*. Reply *cart* to review or *checkout* to order.` };
      }

      case 'cart':
        return { text: cartText() };

      case 'checkout': {
        if (cart.length === 0) return { text: 'Your cart is empty. Reply *menu* to browse.' };
        const total = cart.reduce((s, c) => s + c.priceCents * c.qty, 0);
        await q(
          `INSERT INTO orders (tenant_id, conversation_id, channel_type, customer_ref, items, total_cents, currency, status)
           VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,'pending')`,
          [tenantId, snap.convId, channelType, inbound.customerRef, JSON.stringify(cart), total, currency],
        );
        await save([]);
        return { text: `🎉 Order placed! Total *${fmt(total, currency)}*. ${snap.storeName} will confirm shortly. Reply *menu* to order again.` };
      }

      case 'clear':
        await save([]);
        return { text: 'Cart cleared. Reply *menu* to start again. 🧹' };

      case 'none':
      default:
        // Conversational turn: use the AI's natural reply if we have one.
        return { text: aiReply ?? `I didn't catch that. Reply *menu* to browse, *cart* to review, or *checkout* to order.` };
    }
  });
}

/** Fallback intent parser when AI is not configured. */
function parseKeyword(text: string): AiAction {
  const lower = text.toLowerCase().trim();
  if (['hi', 'hello', 'start', 'menu', 'hey'].includes(lower)) return { type: 'menu' };
  if (lower === 'cart') return { type: 'cart' };
  if (lower === 'checkout') return { type: 'checkout' };
  if (lower === 'clear') return { type: 'clear' };
  if (lower.startsWith('add')) {
    const n = parseInt(lower.replace('add', '').trim(), 10);
    if (Number.isInteger(n)) return { type: 'add', index: n, qty: 1 };
  }
  return { type: 'none' };
}
