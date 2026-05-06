import { Request, Response } from 'express';
import crypto from 'crypto';
import axios from 'axios';
import db from '../db';
import * as wa from '../services/whatsapp.service';
import * as chatbot from '../services/chatbot.service';
import * as shopify from '../services/shopify.service';
import { v4 as uuidv4 } from 'uuid';

export const verifyWebhook = (req: Request, res: Response) => {
  const result = wa.verifyWebhook(req.query['hub.mode'] as string, req.query['hub.verify_token'] as string, req.query['hub.challenge'] as string);
  result ? res.status(200).send(result) : res.sendStatus(403);
};

export const receiveMessage = async (req: Request, res: Response) => {
  res.sendStatus(200);
  try {
    console.log('[WA webhook] incoming:', JSON.stringify(req.body).slice(0, 300));
    const msg = wa.parseWebhook(req.body);
    if (!msg) { console.log('[WA webhook] no message parsed (likely status update)'); return; }
    console.log('[WA webhook] msg from:', msg.from, 'type:', msg.type, 'text:', msg.text);
    await chatbot.processMessage(msg.from, msg.text||'', msg.messageId, msg.type, msg.interactiveId, msg.profileName, msg.mediaId, msg.mediaType);
  } catch (e: any) { console.error('[WA webhook]', e.message); }
};

export const paymentCallback = async (req: Request, res: Response) => {
  const ref = req.query.reference as string;
  if (!ref) { res.redirect(`${process.env.FRONTEND_URL||'http://localhost:3000'}`); return; }
  try {
    const { data } = await axios.get(`https://api.paystack.co/transaction/verify/${ref}`, { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } });
    if (data.data?.status === 'success') {
      const meta = data.data.metadata;
      if (meta?.type === 'ojaoba_order' && meta?.orderId) await chatbot.handlePaymentSuccess(meta.orderId, ref);
      res.redirect(`${process.env.FRONTEND_URL||'http://localhost:3000'}/order-success?ref=${ref}`);
    } else {
      res.redirect(`${process.env.FRONTEND_URL||'http://localhost:3000'}/order-failed?ref=${ref}`);
    }
  } catch (e: any) { console.error('[Payment callback]', e.message); res.redirect(`${process.env.FRONTEND_URL||'http://localhost:3000'}`); }
};

export const shopifyWebhook = async (req: Request, res: Response) => {
  const hmac = req.headers['x-shopify-hmac-sha256'] as string;
  if (hmac && process.env.SHOPIFY_WEBHOOK_SECRET) {
    const computed = crypto.createHmac('sha256', process.env.SHOPIFY_WEBHOOK_SECRET).update(req.body as Buffer).digest('base64');
    if (computed !== hmac) { res.sendStatus(401); return; }
  }
  res.sendStatus(200);
  shopify.syncProducts().catch(e => console.error('[Shopify webhook]', e.message));
};

// ── Admin API ─────────────────────────────────────────────────────────────────

export const getDashboard = async (_req: Request, res: Response) => {
  try {
    const [orderStats, sessionStats, productStats, recentOrders, funnelStats] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COALESCE(SUM(total_kobo),0)::bigint AS revenue_kobo,
          COUNT(*) FILTER(WHERE created_at > NOW()-INTERVAL '24h')::int AS today,
          COALESCE(SUM(total_kobo) FILTER(WHERE created_at > NOW()-INTERVAL '24h'),0)::bigint AS today_revenue
        FROM orders
        WHERE status NOT IN ('PENDING_PAYMENT','CANCELLED','REFUNDED')
      `),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER(WHERE last_active > NOW()-INTERVAL '5 minutes')::int AS active
        FROM wa_sessions
      `),
      db.query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER(WHERE inventory = 0 OR available = false)::int AS out_of_stock
        FROM products
      `),
      db.query(`
        SELECT id, customer_name, phone AS customer_phone, total_kobo, status, created_at
        FROM orders
        ORDER BY created_at DESC LIMIT 8
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER(WHERE event='product_viewed')::int AS browsed,
          COUNT(*) FILTER(WHERE event='add_to_cart')::int AS added_to_cart,
          COUNT(*) FILTER(WHERE event='checkout_started')::int AS checked_out,
          COUNT(*) FILTER(WHERE event='payment_confirmed')::int AS paid
        FROM analytics
        WHERE created_at > NOW()-INTERVAL '30d'
      `),
    ]);

    const f = funnelStats.rows[0];
    res.json({
      orders:       orderStats.rows[0],
      sessions:     sessionStats.rows[0],
      products:     productStats.rows[0],
      recent_orders: recentOrders.rows.map(o => ({ ...o, status: o.status.toLowerCase() })),
      funnel: {
        browsed:       f?.browsed       || 0,
        added_to_cart: f?.added_to_cart || 0,
        checked_out:   f?.checked_out   || 0,
        paid:          f?.paid          || 0,
      },
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const listOrders = async (req: Request, res: Response) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit  = 20;
    const offset = (page - 1) * limit;
    const status = (req.query.status as string)?.toUpperCase();
    const search = req.query.search as string;

    let where = 'WHERE 1=1';
    const params: any[] = [limit, offset];
    let idx = 3;

    if (status) { where += ` AND o.status=$${idx++}`; params.push(status); }
    if (search) { where += ` AND (o.customer_name ILIKE $${idx} OR o.phone ILIKE $${idx})`; params.push(`%${search}%`); idx++; }

    const [orders, count] = await Promise.all([
      db.query(`
        SELECT
          o.id, o.customer_name, o.phone AS customer_phone,
          o.delivery_address AS address,
          o.items, o.subtotal_kobo, o.delivery_fee_kobo, o.total_kobo,
          LOWER(o.status) AS status,
          o.paystack_ref, o.notes, o.created_at
        FROM orders o
        ${where}
        ORDER BY o.created_at DESC
        LIMIT $1 OFFSET $2
      `, params),
      db.query(`SELECT COUNT(*)::int AS count FROM orders o ${where}`, params.slice(2)),
    ]);

    const total      = count.rows[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    res.json({ orders: orders.rows, total, page, totalPages });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(`
      SELECT o.*, LOWER(o.status) AS status, o.delivery_address AS address,
             o.phone AS customer_phone, s.name AS wa_name, s.order_count
      FROM orders o LEFT JOIN wa_sessions s ON s.phone=o.phone
      WHERE o.id=$1
    `, [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json(rows[0]);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const rawStatus = (req.body.status as string || '').toUpperCase();
    const statusMap: Record<string, string> = {
      'CONFIRMED': 'CONFIRMED',
      'PROCESSING': 'PROCESSING',
      'SHIPPED': 'OUT_FOR_DELIVERY',
      'OUT_FOR_DELIVERY': 'OUT_FOR_DELIVERY',
      'DELIVERED': 'DELIVERED',
      'CANCELLED': 'CANCELLED',
      'REFUNDED': 'REFUNDED',
    };
    const dbStatus = statusMap[rawStatus];
    if (!dbStatus) {
      res.status(400).json({ error: `Invalid status: ${req.body.status}` }); return;
    }
    await db.query(`UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2`, [dbStatus, req.params.id]);
    await chatbot.sendStatusUpdate(req.params.id, dbStatus, req.body.message).catch(() => {});
    res.json({ ok: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const listSessions = async (req: Request, res: Response) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit  = 20;
    const offset = (page - 1) * limit;

    const [sessions, count] = await Promise.all([
      db.query(`
        SELECT
          id, phone, name, state, order_count,
          cart,
          last_active AS last_activity,
          created_at,
          jsonb_array_length(COALESCE(cart::jsonb, '[]'::jsonb)) AS cart_item_count,
          0 AS message_count
        FROM wa_sessions
        ORDER BY last_active DESC
        LIMIT $1 OFFSET $2
      `, [limit, offset]),
      db.query(`SELECT COUNT(*)::int AS count FROM wa_sessions`),
    ]);

    // Parse cart JSON for each session
    const rows = sessions.rows.map((s: any) => ({
      ...s,
      cart: typeof s.cart === 'string' ? JSON.parse(s.cart) : (s.cart || []),
    }));

    const total      = count.rows[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    res.json({ sessions: rows, total, page, totalPages });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const syncProducts = async (_req: Request, res: Response) => {
  try { const r = await shopify.syncProducts(); res.json({ ok: true, ...r }); }
  catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const listProducts = async (req: Request, res: Response) => {
  try {
    const page     = Math.max(1, parseInt(req.query.page as string || '1'));
    const limit    = parseInt(req.query.limit as string || '20');
    const category = req.query.category as string | undefined;
    const search   = req.query.search as string | undefined;

    let where = 'WHERE 1=1';
    const params: any[] = [];
    let idx = 1;

    if (category) { where += ` AND category=$${idx++}`; params.push(category); }
    if (search)   { where += ` AND title ILIKE $${idx++}`; params.push(`%${search}%`); }

    const offset = (page - 1) * limit;
    const [products, count] = await Promise.all([
      db.query(`SELECT * FROM products ${where} ORDER BY updated_at DESC LIMIT $${idx} OFFSET $${idx+1}`, [...params, limit, offset]),
      db.query(`SELECT COUNT(*)::int AS count FROM products ${where}`, params),
    ]);

    const total      = count.rows[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    res.json({ products: products.rows, total, page, totalPages });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const broadcast = async (req: Request, res: Response) => {
  try {
    const { message, target } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return; }

    const where = target === 'active'
      ? `WHERE last_active > NOW()-INTERVAL '30d'`
      : '';

    const { rows } = await db.query(
      `SELECT phone FROM wa_sessions ${where} ORDER BY last_active DESC LIMIT 1000`
    );

    res.json({ ok: true, sent: rows.length, failed: 0 });

    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    let sent = 0, failed = 0;
    for (const { phone } of rows) {
      const ok = await wa.sendText(phone, message).then(() => true).catch(() => false);
      ok ? sent++ : failed++;
      if (sent % 10 === 0) await delay(130);
    }
    console.log(`[Broadcast] Sent ${sent}, Failed ${failed}`);
  } catch(e: any) { if (!res.headersSent) res.status(500).json({ error: e.message }); }
};

export const getAnalytics = async (_req: Request, res: Response) => {
  try {
    const [totals, daily, topProducts, funnelRaw] = await Promise.all([
      db.query(`
        SELECT
          (SELECT COUNT(*)::int FROM wa_sessions) AS sessions,
          COUNT(*)::int AS orders,
          COALESCE(SUM(total_kobo),0)::bigint AS revenue_kobo,
          COALESCE(AVG(total_kobo),0)::bigint AS avg_order_value
        FROM orders WHERE status NOT IN ('PENDING_PAYMENT','CANCELLED','REFUNDED')
      `),
      db.query(`
        SELECT
          DATE_TRUNC('day', created_at)::date AS date,
          COUNT(DISTINCT phone)::int AS sessions,
          COUNT(*) FILTER(WHERE event='order_created')::int AS orders,
          0::bigint AS revenue_kobo
        FROM analytics
        WHERE created_at > NOW()-INTERVAL '14d'
        GROUP BY date ORDER BY date
      `),
      db.query(`
        SELECT
          metadata->>'productId' AS product_id,
          metadata->>'title' AS title,
          COUNT(*) FILTER(WHERE event='product_viewed')::int AS views,
          COUNT(*) FILTER(WHERE event='add_to_cart')::int AS cart_adds,
          COUNT(*) FILTER(WHERE event='payment_confirmed')::int AS purchases
        FROM analytics
        WHERE event IN ('product_viewed','add_to_cart','payment_confirmed')
          AND created_at > NOW()-INTERVAL '30d'
        GROUP BY metadata->>'productId', metadata->>'title'
        ORDER BY views DESC LIMIT 10
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER(WHERE event='product_viewed')::int AS browsed,
          COUNT(*) FILTER(WHERE event='add_to_cart')::int AS added_to_cart,
          COUNT(*) FILTER(WHERE event='checkout_started')::int AS checked_out,
          COUNT(*) FILTER(WHERE event='payment_confirmed')::int AS paid
        FROM analytics WHERE created_at > NOW()-INTERVAL '30d'
      `),
    ]);

    const f = funnelRaw.rows[0];
    res.json({
      totals:       totals.rows[0],
      daily:        daily.rows,
      top_products: topProducts.rows,
      funnel: {
        browsed:       f?.browsed       || 0,
        added_to_cart: f?.added_to_cart || 0,
        checked_out:   f?.checked_out   || 0,
        paid:          f?.paid          || 0,
      },
    });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

/** GET /admin/sessions/:phone/messages */
export const getSessionMessages = async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(
      `SELECT id, direction, content, msg_type, created_at FROM wa_messages WHERE phone=$1 ORDER BY created_at ASC LIMIT 200`,
      [req.params.phone]
    );
    res.json({ messages: rows });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

/** POST /admin/sessions/:phone/reply */
export const adminReply = async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return; }
    await wa.sendText(req.params.phone, message.trim()); // sendText auto-logs outbound
    res.json({ ok: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const getSettings = async (_req: Request, res: Response) => {
  try {
    const { rows } = await db.query(`SELECT key, value FROM settings`);
    const s: any = {};
    rows.forEach((r: any) => s[r.key] = r.value);
    // Normalise numeric fields
    if (s.delivery_fee_kobo) s.delivery_fee_kobo = parseInt(s.delivery_fee_kobo);
    if (s.min_order_kobo)    s.min_order_kobo    = parseInt(s.min_order_kobo);
    res.json(s);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.query(
        `INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW())
         ON CONFLICT(key) DO UPDATE SET value=$2, updated_at=NOW()`,
        [key, String(value)]
      );
    }
    res.json({ ok: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};
