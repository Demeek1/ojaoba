import { ownerQuery } from './db';

/**
 * Per-vendor conversational shopping assistant (ported & adapted from the
 * original "Adaeze" tool-use assistant, made multi-tenant).
 *
 * Uses Claude tool-use to search the VENDOR'S live catalogue, surface popular
 * items, and mutate the customer's cart — understanding natural language and
 * misspellings. Every catalogue query is scoped to the tenant, so one vendor's
 * assistant can never see another's products.
 *
 * Checkout stays OUTSIDE this module (deterministic order + payment), so orders
 * and payment links are always reliable. Degrades gracefully: returns null when
 * ANTHROPIC_API_KEY is absent, so the caller falls back to the keyword bot.
 */

export interface CartItem {
  productId: string;
  title: string;
  priceCents: number;
  qty: number;
}

export interface AssistantOutcome {
  reply: string;
  cart: CartItem[];
  changed: boolean;
}

const MODEL = 'claude-haiku-4-5';
const fmt = (cents: number, currency: string) => `${currency} ${(cents / 100).toLocaleString()}`;

function systemPrompt(storeName: string, currency: string, cart: CartItem[]): string {
  const cartText = cart.length
    ? cart.map((c) => `- [productId: ${c.productId}] ${c.title} × ${c.qty} (${fmt(c.priceCents, currency)})`).join('\n')
    : 'empty';
  return `You are the warm, smart shopping assistant for "${storeName}". You help customers find products and add them to their cart, all in a friendly chat.

PERSONALITY:
- Warm, quick, genuinely helpful. Speak naturally and kindly.
- You understand informal language and misspellings, and you never say you are an AI or a bot.
- Keep every reply SHORT: 1–2 sentences. Be conversational, not robotic.

HOW TO SHOP:
- When a customer names something they want, CALL search_products. If they want ideas or "what's popular", CALL popular_items.
- To add/change/remove items, CALL update_cart. For an item ALREADY in the cart, pass its productId and the new TOTAL quantity (0 removes it). For a NEW item, pass a query (the product name) and quantity — it will be found and added.
- When the customer says "add 2 of those", "make it 5", "remove the rice", "add 6 more" — use update_cart. Don't tell them to tap; just do it, then confirm briefly.
- Never invent products or prices — only reference what the tools return.
- When they're ready, tell them to reply *checkout* to place the order.

CURRENT CART:
${cartText}`;
}

const TOOLS = [
  {
    name: 'search_products',
    description: 'Search this store\'s live catalogue for a product by name or keyword. Handles misspellings. Use whenever the customer names something they want.',
    input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] },
  },
  {
    name: 'popular_items',
    description: 'Get the store\'s current products to recommend. Use for "what do you have", "what do you recommend", or an undecided customer.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'update_cart',
    description: "Add items to the cart, change quantities, or remove items. Use whenever the customer asks to add/buy/remove or change how many.",
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              productId: { type: 'string', description: 'productId of an item ALREADY in the cart (to change/remove).' },
              query: { type: 'string', description: 'For a NEW item: the product name to find and add.' },
              quantity: { type: 'number', description: 'Absolute desired total quantity (0 removes).' },
            },
            required: ['quantity'],
          },
        },
      },
      required: ['items'],
    },
  },
];

async function searchProducts(tenantId: string, query: string, limit = 8) {
  const q = `%${(query || '').slice(0, 60)}%`;
  return ownerQuery(
    `SELECT id, title, price_cents, currency FROM products
      WHERE tenant_id = $1 AND active = true AND (title ILIKE $2 OR description ILIKE $2)
      ORDER BY created_at DESC LIMIT $3`,
    [tenantId, q, limit],
  );
}
async function popularItems(tenantId: string, limit = 8) {
  return ownerQuery(
    `SELECT id, title, price_cents, currency FROM products
      WHERE tenant_id = $1 AND active = true ORDER BY created_at DESC LIMIT $2`,
    [tenantId, limit],
  );
}

/** Apply an update_cart tool call to the in-memory cart, returning a summary. */
async function applyCartUpdate(tenantId: string, cart: CartItem[], items: any[], currency: string): Promise<string> {
  for (const it of items || []) {
    const qty = Math.max(0, Math.min(99, Math.round(Number(it.quantity) || 0)));
    if (it.productId) {
      const idx = cart.findIndex((c) => c.productId === it.productId);
      if (idx >= 0) {
        if (qty === 0) cart.splice(idx, 1);
        else cart[idx].qty = qty;
      }
    } else if (it.query && qty > 0) {
      const found = (await searchProducts(tenantId, it.query, 1))[0];
      if (found) {
        const existing = cart.find((c) => c.productId === found.id);
        if (existing) existing.qty = qty;
        else cart.push({ productId: found.id, title: found.title, priceCents: Number(found.price_cents), qty });
      }
    }
  }
  if (cart.length === 0) return 'Cart is now empty.';
  const lines = cart.map((c) => `${c.qty}× ${c.title} — ${fmt(c.priceCents * c.qty, currency)}`).join('; ');
  const total = cart.reduce((s, c) => s + c.priceCents * c.qty, 0);
  return `Cart now: ${lines}. Total ${fmt(total, currency)}.`;
}

export async function runAssistant(
  tenantId: string,
  storeName: string,
  currency: string,
  message: string,
  cart: CartItem[],
): Promise<AssistantOutcome | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const before = JSON.stringify(cart);
  const messages: any[] = [{ role: 'user', content: message }];

  try {
    for (let step = 0; step < 4; step++) {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 500,
          system: systemPrompt(storeName, currency, cart),
          tools: TOOLS,
          messages,
        }),
      });
      if (!res.ok) return null;
      const data: any = await res.json();
      const content: any[] = data.content || [];
      messages.push({ role: 'assistant', content });

      const toolUses = content.filter((b) => b.type === 'tool_use');
      if (data.stop_reason !== 'tool_use' || toolUses.length === 0) {
        const reply = content.filter((b) => b.type === 'text').map((b) => b.text).join(' ').trim();
        return { reply: reply || 'How can I help you shop today?', cart, changed: JSON.stringify(cart) !== before };
      }

      // Execute each tool call and feed results back.
      const results: any[] = [];
      for (const tu of toolUses) {
        let out = '';
        if (tu.name === 'search_products') {
          const rows = await searchProducts(tenantId, tu.input?.query || '');
          out = rows.length
            ? rows.map((r: any) => `[productId: ${r.id}] ${r.title} — ${fmt(Number(r.price_cents), currency)}`).join('\n')
            : 'No matching products found.';
        } else if (tu.name === 'popular_items') {
          const rows = await popularItems(tenantId);
          out = rows.length
            ? rows.map((r: any) => `[productId: ${r.id}] ${r.title} — ${fmt(Number(r.price_cents), currency)}`).join('\n')
            : 'No products yet.';
        } else if (tu.name === 'update_cart') {
          out = await applyCartUpdate(tenantId, cart, tu.input?.items || [], currency);
        } else {
          out = 'Unknown tool.';
        }
        results.push({ type: 'tool_result', tool_use_id: tu.id, content: out });
      }
      messages.push({ role: 'user', content: results });
    }
    // Ran out of steps — return a safe nudge.
    return { reply: 'Reply *checkout* to place your order, or tell me what else you need. 🛒', cart, changed: JSON.stringify(cart) !== before };
  } catch {
    return null;
  }
}
