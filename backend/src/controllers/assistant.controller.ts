import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import { runAssistant, ChatMessage, CartLine } from '../services/assistant.service';

/**
 * POST /api/ai/chat
 * Body: { sessionId, messages: [{ role, content }] }
 * Runs the conversational shopping assistant and logs the exchange for analytics.
 */
export const chat = async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || '').slice(0, 64) || uuidv4();
    const raw = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages: ChatMessage[] = raw
      .filter((m: any) => (m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string')
      .map((m: any) => ({ role: m.role, content: String(m.content).slice(0, 2000) }))
      .slice(-16);

    if (!messages.length || messages[messages.length - 1].role !== 'user') {
      res.status(400).json({ error: 'A user message is required' });
      return;
    }

    const cart: CartLine[] = Array.isArray(req.body?.cart)
      ? req.body.cart
          .filter((c: any) => c && typeof c.id === 'string')
          .slice(0, 50)
          .map((c: any) => ({
            id: String(c.id),
            title: String(c.title || '').slice(0, 200),
            qty: Math.max(0, Math.floor(Number(c.qty)) || 0),
            price_kobo: Math.max(0, Math.floor(Number(c.price_kobo)) || 0),
            image_url: c.image_url ? String(c.image_url) : null,
            shopify_id: c.shopify_id ? String(c.shopify_id) : null,
          }))
      : [];

    const result = await runAssistant(messages, cart);

    // Log for behaviour insight (fire-and-forget — never block the reply)
    const userMsg = messages[messages.length - 1].content;
    logConversation(sessionId, 'user', userMsg).catch(() => {});
    logConversation(sessionId, 'assistant', result.reply, { products: result.products.length }).catch(() => {});
    if (result.searchQuery) {
      db.query(
        `INSERT INTO web_events (id, session_id, event, query, metadata) VALUES ($1,$2,'ai_search',$3,$4)`,
        [uuidv4(), sessionId, result.searchQuery.slice(0, 200), JSON.stringify({ results: result.products.length })]
      ).catch(() => {});
    }

    res.json({ sessionId, ...result });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
};

async function logConversation(sessionId: string, role: string, content: string, metadata: any = {}) {
  await db.query(
    `INSERT INTO ai_conversations (id, session_id, role, content, metadata) VALUES ($1,$2,$3,$4,$5)`,
    [uuidv4(), sessionId, role, content.slice(0, 2000), JSON.stringify(metadata)]
  );
}
