/**
 * Ojaoba Web Shopping Assistant — "Adaeze" on the website.
 *
 * A conversational layer that lets customers shop by typing, selecting chips, or
 * tapping/swiping the product cards the assistant surfaces. It uses Claude with
 * tool-use to search the live catalogue, recommend, and answer inquiries, and
 * returns a structured payload the storefront renders as a frictionless flow.
 *
 * Degrades gracefully: with no ANTHROPIC_API_KEY it falls back to keyword search
 * so the assistant still surfaces products and chips.
 */
import axios from 'axios';
import * as shopify from './shopify.service';

const API_KEY = () => process.env.ANTHROPIC_API_KEY || '';
const MODEL = () => process.env.ASSISTANT_MODEL || 'claude-haiku-4-5';

export interface ChatMessage { role: 'user' | 'assistant'; content: string; }
export interface AssistantCard {
  id: string; title: string; price_kobo: number;
  image_url: string | null; category: string; description?: string;
}
export interface AssistantResult {
  reply: string;
  products: AssistantCard[];
  chips: string[];
  searchQuery?: string;
}

const SYSTEM = `You are Adaeze, the warm, smart shopping assistant for Ojaoba — Nigeria's freshest online food market (royal market, "Oja Oba"). You help customers find groceries and food items and add them to their cart, all in a friendly chat.

PERSONALITY:
- Warm, quick, genuinely helpful. Speak like an educated, friendly young Nigerian lady.
- Light Nigerian warmth occasionally ("No wahala!", "Ehen!") but stay clear and professional — never heavy pidgin.
- You know Nigerian food culture deeply (egusi, ponmo, garri, stockfish, ogiri, indomie, palm oil, etc.) and understand misspellings.

HOW THE UI WORKS (very important):
- When you find products, CALL the search_products or browse_category tool. The website shows the results as swipeable, tappable product cards — the customer adds them to cart with one tap.
- So in your text reply, DO NOT list product names and prices line by line. Instead, briefly say what you found and invite them ("Here are some lovely options 👇 — tap any to add to your cart").
- Keep every reply SHORT: 1–2 sentences. Be conversational, not robotic.

RULES:
- Never say you are an AI or a bot. If asked your name: "I'm Adaeze, your Ojaoba shopping assistant 😊".
- Always try to move the customer toward finding items and checking out smoothly.
- If they ask about delivery, payment, or an order, answer helpfully and warmly, then offer to keep shopping.
- If you truly can't help, suggest they type "support" to reach the team.`;

const TOOLS = [
  {
    name: 'search_products',
    description: 'Search the live Ojaoba catalogue for a product by name or keyword. Handles Nigerian food items and misspellings. Use whenever the customer names something they want to buy.',
    input_schema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'The product to search for, e.g. "palm oil", "ponmo", "indomie"' } },
      required: ['query'],
    },
  },
  {
    name: 'browse_category',
    description: 'Show products from a category (e.g. "Rice", "Vegetables", "Fish"). Use when the customer wants to browse a section rather than a specific item.',
    input_schema: {
      type: 'object',
      properties: { category: { type: 'string', description: 'Category name to browse' } },
      required: ['category'],
    },
  },
  {
    name: 'popular_items',
    description: 'Get the current best-selling / most popular products. Use for "what do you recommend", "what is trending", or to help an undecided customer.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'list_categories',
    description: 'List all available product categories. Use when the customer asks what you sell or wants to see departments.',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
];

function toCards(rows: any[]): AssistantCard[] {
  return (rows || []).map((r) => ({
    id: r.id,
    title: r.title,
    price_kobo: Number(r.price_kobo) || 0,
    image_url: r.image_url || null,
    category: r.category || 'General',
    description: r.description || '',
  }));
}

async function runTool(name: string, input: any): Promise<{ summary: string; cards: AssistantCard[]; query?: string }> {
  try {
    if (name === 'search_products') {
      const q = String(input?.query || '').trim();
      const rows = await shopify.searchProducts(q, 8);
      const cards = toCards(rows);
      return {
        query: q,
        cards,
        summary: cards.length
          ? `Found ${cards.length} product(s) for "${q}": ${cards.map((c) => c.title).join('; ')}.`
          : `No products found for "${q}".`,
      };
    }
    if (name === 'browse_category') {
      const cat = String(input?.category || '').trim();
      const { products } = await shopify.getProductsByCategory(cat, 1, 8);
      const cards = toCards(products);
      return {
        query: cat,
        cards,
        summary: cards.length
          ? `Top items in "${cat}": ${cards.map((c) => c.title).join('; ')}.`
          : `No products found in category "${cat}".`,
      };
    }
    if (name === 'popular_items') {
      const { products } = await shopify.getAllProducts(1, 8);
      const cards = toCards(products);
      return { cards, summary: `Most popular right now: ${cards.map((c) => c.title).join('; ')}.` };
    }
    if (name === 'list_categories') {
      const cats = await shopify.getCategories();
      return { cards: [], summary: `Available categories: ${cats.join(', ')}.` };
    }
  } catch (e: any) {
    return { cards: [], summary: `Tool error: ${e.message}` };
  }
  return { cards: [], summary: 'Unknown tool.' };
}

function dedupeCards(cards: AssistantCard[]): AssistantCard[] {
  const seen = new Set<string>();
  const out: AssistantCard[] = [];
  for (const c of cards) { if (!seen.has(c.id)) { seen.add(c.id); out.push(c); } }
  return out.slice(0, 12);
}

async function buildChips(cards: AssistantCard[]): Promise<string[]> {
  if (cards.length) {
    return ['Show me cheaper ones', 'More options', 'Go to checkout 🛒'];
  }
  try {
    const cats = await shopify.getCategories();
    return cats.slice(0, 6);
  } catch {
    return ['Rice', 'Vegetables', 'Fish', 'Drinks', 'Snacks'];
  }
}

// ── Fallback (no API key): keyword search ───────────────────────────────────
async function fallback(messages: ChatMessage[]): Promise<AssistantResult> {
  const last = [...messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
  if (!last || /^(hi|hello|hey|menu|start)/i.test(last)) {
    return {
      reply: "Hi, I'm Adaeze 😊 What are you shopping for today? Pick a category or tell me what you need.",
      products: [],
      chips: await buildChips([]),
    };
  }
  const rows = await shopify.searchProducts(last, 8).catch(() => []);
  const cards = dedupeCards(toCards(rows));
  return {
    reply: cards.length
      ? `Here's what I found for "${last}" 👇 Tap any to add it to your cart.`
      : `I couldn't find "${last}" right now. Want to try another item or browse a category?`,
    products: cards,
    chips: await buildChips(cards),
    searchQuery: last,
  };
}

/**
 * Main entry — runs the conversational assistant.
 */
export async function runAssistant(messages: ChatMessage[]): Promise<AssistantResult> {
  const key = API_KEY();
  if (!key) return fallback(messages);

  // Anthropic message history (trim to last ~12 turns for cost/latency)
  const history: any[] = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));

  let collected: AssistantCard[] = [];
  let lastQuery: string | undefined;
  let finalText = '';

  try {
    for (let round = 0; round < 4; round++) {
      const res = await axios.post(
        'https://api.anthropic.com/v1/messages',
        { model: MODEL(), max_tokens: 400, system: SYSTEM, tools: TOOLS, messages: history },
        {
          headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
          timeout: 15000,
        }
      );
      const content = res.data?.content || [];
      const textBlocks = content.filter((b: any) => b.type === 'text').map((b: any) => b.text);
      if (textBlocks.length) finalText = textBlocks.join(' ').trim();

      const toolUses = content.filter((b: any) => b.type === 'tool_use');
      if (res.data.stop_reason !== 'tool_use' || !toolUses.length) break;

      // Echo the assistant's tool_use turn, then return tool results
      history.push({ role: 'assistant', content });
      const toolResults: any[] = [];
      for (const tu of toolUses) {
        const out = await runTool(tu.name, tu.input);
        if (out.cards.length) collected = collected.concat(out.cards);
        if (out.query) lastQuery = out.query;
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: out.summary });
      }
      history.push({ role: 'user', content: toolResults });
    }
  } catch (e: any) {
    console.error('[Assistant]', e.response?.data?.error?.message || e.message);
    if (!finalText && !collected.length) return fallback(messages);
  }

  const products = dedupeCards(collected);
  if (!finalText) {
    finalText = products.length
      ? "Here are some options 👇 Tap any to add to your cart."
      : "I'm here to help you shop 😊 What are you looking for?";
  }
  return { reply: finalText, products, chips: await buildChips(products), searchQuery: lastQuery };
}
