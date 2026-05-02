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
    const msg = wa.parseWebhook(req.body);
    if (!msg) return;
    await chatbot.processMessage(msg.from, msg.text||'', msg.messageId, msg.type, msg.interactiveId, msg.profileName);
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
    const [sessions, revenue, statusBreak, recentOrders, topProducts, daily] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE last_active>NOW()-INTERVAL '24h')::int AS today, COUNT(*) FILTER(WHERE last_active>NOW()-INTERVAL '7d')::int AS week FROM wa_sessions`),
      db.query(`SELECT COALESCE(SUM(total_kobo),0)::bigint AS total_revenue, COALESCE(SUM(total_kobo) FILTER(WHERE created_at>NOW()-INTERVAL '30d'),0)::bigint AS revenue_30d, COALESCE(SUM(total_kobo) FILTER(WHERE created_at>NOW()-INTERVAL '7d'),0)::bigint AS revenue_7d, COUNT(*) FILTER(WHERE status NOT IN ('CANCELLED','REFUNDED','PENDING_PAYMENT'))::int AS paid_orders FROM orders`),
      db.query(`SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status ORDER BY count DESC`),
      db.query(`SELECT o.id,o.phone,o.customer_name,o.status,o.total_kobo,o.created_at, s.name AS wa_name FROM orders o LEFT JOIN wa_sessions s ON s.phone=o.phone ORDER BY o.created_at DESC LIMIT 10`),
      db.query(`SELECT (item->>'title') AS title, COUNT(*)::int AS cnt, SUM(((item->>'priceKobo')::bigint)*((item->>'quantity')::int))::bigint AS revenue FROM orders, jsonb_array_elements(items::jsonb) AS item WHERE status NOT IN ('CANCELLED','REFUNDED') GROUP BY item->>'title' ORDER BY cnt DESC LIMIT 8`),
      db.query(`SELECT DATE_TRUNC('day',created_at)::date AS day, COUNT(*)::int AS orders, COALESCE(SUM(total_kobo),0)::bigint AS revenue FROM orders WHERE created_at>NOW()-INTERVAL '14d' AND status NOT IN ('CANCELLED','REFUNDED','PENDING_PAYMENT') GROUP BY day ORDER BY day`),
    ]);
    res.json({ sessions: sessions.rows[0], revenue: revenue.rows[0], statusBreakdown: statusBreak.rows, recentOrders: recentOrders.rows, topProducts: topProducts.rows, dailyOrders: daily.rows });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

export const listOrders = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string||'1')); const limit = 20; const offset=(page-1)*limit;
    const status = req.query.status as string;
    const where = status ? `WHERE o.status=$3` : '';
    const params = status ? [limit,offset,status] : [limit,offset];
    const [orders, count] = await Promise.all([
      db.query(`SELECT o.*,s.name AS wa_name FROM orders o LEFT JOIN wa_sessions s ON s.phone=o.phone ${where} ORDER BY o.created_at DESC LIMIT $1 OFFSET $2`, params),
      db.query(`SELECT COUNT(*)::int AS count FROM orders ${status?'WHERE status=$1':''}`, status?[status]:[]),
    ]);
    res.json({ orders: orders.rows, total: count.rows[0]?.count||0, page });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const getOrder = async (req: Request, res: Response) => {
  try {
    const { rows } = await db.query(`SELECT o.*,s.name AS wa_name,s.order_count FROM orders o LEFT JOIN wa_sessions s ON s.phone=o.phone WHERE o.id=$1`, [req.params.id]);
    if (!rows.length) { res.status(404).json({ error: 'Order not found' }); return; }
    res.json({ order: rows[0] });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { status, message } = req.body;
    const allowed = ['PROCESSING','OUT_FOR_DELIVERY','DELIVERED','CANCELLED','REFUNDED'];
    if (!allowed.includes(status)) { res.status(400).json({ error: `Allowed statuses: ${allowed.join(', ')}` }); return; }
    await chatbot.sendStatusUpdate(req.params.id, status, message);
    res.json({ ok: true });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const listSessions = async (req: Request, res: Response) => {
  try {
    const page=Math.max(1,parseInt(req.query.page as string||'1')); const limit=20; const offset=(page-1)*limit;
    const [sessions, count] = await Promise.all([
      db.query(`SELECT id,phone,name,state,order_count,last_active,created_at,jsonb_array_length(cart::jsonb) AS cart_items FROM wa_sessions ORDER BY last_active DESC LIMIT $1 OFFSET $2`, [limit,offset]),
      db.query(`SELECT COUNT(*)::int AS count FROM wa_sessions`),
    ]);
    res.json({ sessions: sessions.rows, total: count.rows[0]?.count||0, page });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const syncProducts = async (_req: Request, res: Response) => {
  try { const r = await shopify.syncProducts(); res.json({ ok:true, ...r }); }
  catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const listProducts = async (req: Request, res: Response) => {
  try {
    const page=Math.max(1,parseInt(req.query.page as string||'1')); const limit=20;
    const category = req.query.category as string|undefined;
    const r = await shopify.getAllProducts(page, limit, category);
    const cats = await shopify.getCategories();
    res.json({ ...r, categories: cats });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const broadcast = async (req: Request, res: Response) => {
  try {
    const { message, minOrders=0 } = req.body;
    if (!message?.trim()) { res.status(400).json({ error: 'message required' }); return; }
    const { rows } = await db.query(`SELECT phone FROM wa_sessions WHERE order_count>=$1 ORDER BY last_active DESC LIMIT 1000`, [minOrders]);
    res.json({ ok:true, recipients: rows.length });
    const delay=(ms:number)=>new Promise(r=>setTimeout(r,ms));
    let sent=0;
    for (const { phone } of rows) {
      await wa.sendText(phone, message).catch(()=>{});
      sent++;
      if (sent%10===0) await delay(130);
    }
    console.log(`[Broadcast] Sent ${sent}/${rows.length}`);
  } catch(e:any) { if(!res.headersSent) res.status(500).json({ error: e.message }); }
};

export const getAnalytics = async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, parseInt(req.query.days as string||'30'));
    const [funnel, daily, conv] = await Promise.all([
      db.query(`SELECT event, COUNT(DISTINCT phone)::int AS users, COUNT(*)::int AS total FROM analytics WHERE created_at>NOW()-INTERVAL '${days} days' AND event IN ('main_menu','categories','product_viewed','add_to_cart','checkout_started','order_created','payment_confirmed') GROUP BY event`),
      db.query(`SELECT DATE_TRUNC('day',created_at)::date AS day, COUNT(DISTINCT phone)::int AS users FROM analytics WHERE created_at>NOW()-INTERVAL '${days} days' GROUP BY day ORDER BY day`),
      db.query(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE order_count>0)::int AS converted, ROUND(100.0*COUNT(*) FILTER(WHERE order_count>0)/NULLIF(COUNT(*),0),1) AS rate FROM wa_sessions`),
    ]);
    res.json({ funnel: funnel.rows, daily: daily.rows, conversion: conv.rows[0] });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};

export const getSettings = async (_req: Request, res: Response) => {
  const { rows } = await db.query(`SELECT key,value FROM settings`);
  const s: any = {}; rows.forEach((r:any) => s[r.key]=r.value);
  res.json(s);
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    for (const [key, value] of Object.entries(req.body)) {
      await db.query(`INSERT INTO settings(key,value,updated_at) VALUES($1,$2,NOW()) ON CONFLICT(key) DO UPDATE SET value=$2,updated_at=NOW()`, [key, value]);
    }
    res.json({ ok: true });
  } catch(e:any) { res.status(500).json({ error: e.message }); }
};
