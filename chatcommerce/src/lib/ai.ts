/**
 * Optional AI concierge (Anthropic Claude).
 *
 * When ANTHROPIC_API_KEY is set, inbound chat messages are interpreted by Claude
 * so customers can talk naturally ("got any red ones under $20?", "I'll take two
 * of the tote") instead of memorizing commands. Claude returns a STRUCTURED
 * action which the deterministic cart engine then executes — the model never
 * touches the database or prices directly, so order integrity is preserved.
 *
 * If the key is absent or the call fails, the caller falls back to the built-in
 * keyword bot. This keeps the platform reliable with or without AI configured.
 */

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

export interface AiProduct {
  index: number;
  id: string;
  title: string;
  priceLabel: string;
}

export interface AiCartItem {
  title: string;
  qty: number;
}

export type AiAction =
  | { type: 'none' }
  | { type: 'menu' }
  | { type: 'cart' }
  | { type: 'add'; index: number; qty: number }
  | { type: 'checkout' }
  | { type: 'clear' };

export interface AiResult {
  reply: string;
  action: AiAction;
}

const MODEL = 'claude-haiku-4-5'; // fast + cheap, ideal for high-volume chat

export async function aiConcierge(
  storeName: string,
  message: string,
  products: AiProduct[],
  cart: AiCartItem[],
): Promise<AiResult | null> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;

  const catalog = products.length
    ? products.map((p) => `[${p.index}] ${p.title} — ${p.priceLabel} (id:${p.id})`).join('\n')
    : '(no products yet)';
  const cartStr = cart.length ? cart.map((c) => `${c.qty}x ${c.title}`).join(', ') : '(empty)';

  const system =
    `You are the friendly ordering assistant for "${storeName}", a shop selling on chat. ` +
    `Help the customer browse and order. Be warm, concise (2-3 short sentences max), and use light emoji. ` +
    `You can ONLY take these actions, returned as JSON:\n` +
    `- {"type":"menu"} to show the product list\n` +
    `- {"type":"add","index":N,"qty":Q} to add product number N (qty default 1)\n` +
    `- {"type":"cart"} to show the current cart\n` +
    `- {"type":"checkout"} to place the order\n` +
    `- {"type":"clear"} to empty the cart\n` +
    `- {"type":"none"} for greetings/questions needing no cart change\n` +
    `Never invent products or prices. Only reference items in the catalog by their number.\n\n` +
    `CATALOG:\n${catalog}\n\nCURRENT CART: ${cartStr}\n\n` +
    `Respond ONLY with minified JSON: {"reply":"<text to send>","action":{...}}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 400,
        system,
        messages: [{ role: 'user', content: message }],
      }),
    });
    if (!res.ok) return null;
    const data: any = await res.json();
    const text: string = data?.content?.[0]?.text ?? '';
    const parsed = extractJson(text);
    if (!parsed || typeof parsed.reply !== 'string') return null;
    const action = normalizeAction(parsed.action, products.length);
    return { reply: parsed.reply, action };
  } catch {
    return null;
  }
}

function extractJson(text: string): any {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeAction(a: any, productCount: number): AiAction {
  if (!a || typeof a.type !== 'string') return { type: 'none' };
  switch (a.type) {
    case 'menu':
    case 'cart':
    case 'checkout':
    case 'clear':
    case 'none':
      return { type: a.type };
    case 'add': {
      const index = Number(a.index);
      const qty = Math.max(1, Math.min(99, Number(a.qty) || 1));
      if (!Number.isInteger(index) || index < 1 || index > productCount) return { type: 'none' };
      return { type: 'add', index, qty };
    }
    default:
      return { type: 'none' };
  }
}
