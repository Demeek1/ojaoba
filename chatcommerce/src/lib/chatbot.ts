import { tenantTx } from './db';
import type { InboundMessage } from './channels';

/**
 * Channel-agnostic conversational ordering engine.
 *
 * Runs entirely inside the tenant transaction (RLS active), so a conversation
 * and its order can only ever touch the owning vendor's rows. Keeps a tiny
 * cart state machine in conversations.state.
 *
 * Returns the reply text to send back on the same channel.
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

export async function handleInbound(
  tenantId: string,
  channelId: string,
  channelType: string,
  currency: string,
  inbound: InboundMessage,
): Promise<Reply> {
  const text = inbound.text.trim();
  const lower = text.toLowerCase();

  return tenantTx(tenantId, async (q) => {
    // Load or create the conversation (unique per tenant+channel+customer)
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
    const cart: CartItem[] = conv.state?.cart ?? [];

    const save = async (newCart: CartItem[]) =>
      q(`UPDATE conversations SET state = $2, updated_at = now() WHERE id = $1`, [
        conv.id,
        JSON.stringify({ cart: newCart }),
      ]);
    const fmt = (cents: number) => `${currency} ${(cents / 100).toFixed(2)}`;

    // ── Commands ──────────────────────────────────────────────────────────
    if (lower === 'hi' || lower === 'hello' || lower === 'start' || lower === 'menu') {
      const products = await q(
        `SELECT id, title, price_cents FROM products
         WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC LIMIT 10`,
        [tenantId],
      );
      if (products.length === 0) {
        return { text: 'Welcome! This store is being set up — no products yet. Please check back soon.' };
      }
      const lines = products
        .map((p: any, i: number) => `${i + 1}. ${p.title} — ${fmt(Number(p.price_cents))}`)
        .join('\n');
      return {
        text:
          `🛍️ Welcome! Here's what we have:\n\n${lines}\n\n` +
          `Reply *add <number>* to add an item, *cart* to view your cart, *checkout* to order.`,
      };
    }

    if (lower.startsWith('add')) {
      const n = parseInt(lower.replace('add', '').trim(), 10);
      const products = await q(
        `SELECT id, title, price_cents FROM products
         WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC LIMIT 10`,
        [tenantId],
      );
      const picked = products[n - 1];
      if (!picked) return { text: 'Hmm, I could not find that item. Reply *menu* to see the list.' };
      const existing = cart.find((c) => c.productId === picked.id);
      if (existing) existing.qty += 1;
      else cart.push({ productId: picked.id, title: picked.title, priceCents: Number(picked.price_cents), qty: 1 });
      await save(cart);
      return { text: `✅ Added *${picked.title}*. Reply *cart* to review or *checkout* to order.` };
    }

    if (lower === 'cart') {
      if (cart.length === 0) return { text: 'Your cart is empty. Reply *menu* to browse.' };
      const lines = cart.map((c) => `• ${c.qty}× ${c.title} — ${fmt(c.priceCents * c.qty)}`).join('\n');
      const total = cart.reduce((s, c) => s + c.priceCents * c.qty, 0);
      return { text: `🧺 Your cart:\n${lines}\n\nTotal: *${fmt(total)}*\nReply *checkout* to place your order.` };
    }

    if (lower === 'checkout') {
      if (cart.length === 0) return { text: 'Your cart is empty. Reply *menu* to browse.' };
      const total = cart.reduce((s, c) => s + c.priceCents * c.qty, 0);
      await q(
        `INSERT INTO orders (tenant_id, conversation_id, channel_type, customer_ref, items, total_cents, currency, status)
         VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,'pending')`,
        [tenantId, conv.id, channelType, inbound.customerRef, JSON.stringify(cart), total, currency],
      );
      await save([]);
      return {
        text: `🎉 Order placed! Total *${fmt(total)}*. The vendor will confirm shortly. Reply *menu* to order again.`,
      };
    }

    if (lower === 'clear') {
      await save([]);
      return { text: 'Cart cleared. Reply *menu* to start again.' };
    }

    return { text: `I didn't catch that. Reply *menu* to browse, *cart* to review, or *checkout* to order.` };
  });
}
