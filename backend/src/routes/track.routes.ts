import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

const r = express.Router();

const ALLOWED_EVENTS = new Set([
  'page_view', 'product_view', 'add_to_cart', 'remove_from_cart',
  'search', 'ai_search', 'checkout_start', 'purchase', 'category_view', 'favorite',
]);

// Generous but abuse-resistant — anonymous public ingestion
const trackLimiter = rateLimit({ windowMs: 60 * 1000, max: 120 });

/**
 * POST /api/track
 * Body: { sessionId, events: [{ event, productId?, path?, query?, valueKobo?, metadata? }] }
 * Accepts a small batch of anonymous behaviour events from the storefront.
 */
r.post('/', trackLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const sessionId = String(req.body?.sessionId || '').slice(0, 64);
    const events = Array.isArray(req.body?.events) ? req.body.events.slice(0, 25) : [];
    if (!sessionId || !events.length) { res.json({ ok: true, stored: 0 }); return; }

    let stored = 0;
    for (const ev of events) {
      const event = String(ev?.event || '');
      if (!ALLOWED_EVENTS.has(event)) continue;
      await db.query(
        `INSERT INTO web_events (id, session_id, event, product_id, path, query, value_kobo, metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [
          uuidv4(),
          sessionId,
          event,
          ev.productId ? String(ev.productId).slice(0, 64) : null,
          ev.path ? String(ev.path).slice(0, 256) : null,
          ev.query ? String(ev.query).slice(0, 200) : null,
          ev.valueKobo != null ? Math.round(Number(ev.valueKobo)) || null : null,
          JSON.stringify(ev.metadata && typeof ev.metadata === 'object' ? ev.metadata : {}),
        ]
      ).catch(() => {});
      stored++;
    }
    res.json({ ok: true, stored });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default r;
