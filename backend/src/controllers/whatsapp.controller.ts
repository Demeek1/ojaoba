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
          o.paystack_ref, o.notes, o.created_at,
          o.source, o.shopify_order_id, o.shopify_error
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
    // Only send WA notification for WhatsApp-sourced orders
    const { rows } = await db.query(`SELECT source FROM orders WHERE id=$1`, [req.params.id]);
    if (!rows[0] || rows[0].source !== 'website') {
      await chatbot.sendStatusUpdate(req.params.id, dbStatus, req.body.message).catch(() => {});
    }
    res.json({ ok: true });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

// ── Website Order Endpoints ───────────────────────────────────────────────────

/** POST /api/orders — create a pending website order before Paystack payment */
export const createWebOrder = async (req: Request, res: Response) => {
  try {
    const { name, phone, email, address, items, subtotal_kobo, delivery_fee_kobo, total_kobo, notes } = req.body;
    if (!name || !phone || !items?.length || !total_kobo) {
      res.status(400).json({ error: 'Missing required fields' }); return;
    }
    const id  = uuidv4();
    const ref = `OJA-WEB-${Date.now()}-${id.slice(0, 6).toUpperCase()}`;
    const cleanPhone = String(phone).replace(/\D/g, '');

    await db.query(`
      INSERT INTO orders
        (id, phone, customer_name, customer_email, delivery_address,
         items, subtotal_kobo, delivery_fee_kobo, total_kobo,
         status, paystack_ref, notes, source)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'PENDING_PAYMENT',$10,$11,'website')
    `, [
      id, cleanPhone, name.trim(), email?.trim() || null, address?.trim() || null,
      JSON.stringify(items),
      Number(subtotal_kobo), Number(delivery_fee_kobo), Number(total_kobo),
      ref, notes?.trim() || null,
    ]);

    // Log checkout_started analytics event
    await db.query(`
      INSERT INTO analytics (id, phone, event, metadata, created_at)
      VALUES ($1,$2,'checkout_started',$3,NOW())
    `, [uuidv4(), cleanPhone, JSON.stringify({ source: 'website', orderId: id })]);

    res.json({ orderId: id, ref });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

/** POST /api/orders/verify — called by frontend after Paystack payment succeeds */
export const verifyWebOrder = async (req: Request, res: Response) => {
  try {
    const { ref } = req.body;
    if (!ref) { res.status(400).json({ error: 'ref required' }); return; }

    // Verify with Paystack API
    const psKey = process.env.PAYSTACK_SECRET_KEY;
    if (!psKey) { res.status(500).json({ error: 'Payment verification not configured' }); return; }

    const { data: ps } = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`,
      { headers: { Authorization: `Bearer ${psKey}` } }
    );

    if (ps.data?.status !== 'success') {
      res.status(400).json({ error: 'Payment not completed', paystackStatus: ps.data?.status }); return;
    }

    // Mark order as PAID
    const { rows } = await db.query(`
      UPDATE orders SET status='PAID', updated_at=NOW()
      WHERE paystack_ref=$1 AND source='website'
      RETURNING id, phone
    `, [ref]);

    if (!rows.length) {
      // Order may already be marked paid — still return ok
      res.json({ ok: true }); return;
    }

    const { id: orderId, phone } = rows[0];

    // Log analytics events
    await db.query(`
      INSERT INTO analytics (id, phone, event, metadata, created_at)
      VALUES ($1,$2,'payment_confirmed',$3,NOW())
    `, [uuidv4(), phone, JSON.stringify({ source: 'website', orderId, ref })]);

    // Fetch full order to use for Shopify sync
    const { rows: orderRows } = await db.query(`SELECT * FROM orders WHERE id=$1`, [orderId]);
    const fullOrder = orderRows[0];
    const paidItems = typeof fullOrder?.items === 'string' ? JSON.parse(fullOrder.items) : (fullOrder?.items || []);

    // Upsert customer profile so they can pre-fill on return visits
    await db.query(`
      INSERT INTO customer_profiles (phone, name, email, address, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (phone) DO UPDATE
        SET name=$2, email=COALESCE($3,customer_profiles.email),
            address=COALESCE($4,customer_profiles.address), updated_at=NOW()
    `, [
      rows[0].phone,
      fullOrder?.customer_name || '',
      fullOrder?.customer_email || null,
      fullOrder?.delivery_address || null,
    ]).catch(() => {});

    // Find or create Shopify customer by phone — links this order to existing Shopify customer base
    const shopifyCustomerId = await shopify.findOrCreateShopifyCustomer(
      phone, fullOrder?.customer_name || '', fullOrder?.customer_email
    ).catch(() => null);

    if (shopifyCustomerId) {
      await db.query(`UPDATE orders SET shopify_customer_id=$1 WHERE id=$2`, [shopifyCustomerId, orderId]).catch(() => {});
    }

    // Create Shopify order (web orders need this too — attaches to the customer record)
    shopify.createShopifyOrder({
      items: paidItems,
      customerName: fullOrder?.customer_name || '',
      customerPhone: phone,
      deliveryAddress: fullOrder?.delivery_address || '',
      orderRef: ref,
      customerId: shopifyCustomerId,
      source: fullOrder?.source || 'website',
    }).then(shopifyOrderId =>
      db.query(`UPDATE orders SET shopify_order_id=$1, shopify_error=NULL, status='PROCESSING', updated_at=NOW() WHERE id=$2`, [shopifyOrderId, orderId])
    ).catch(e => {
      // Record the failure on the order so it's visible in the admin (e.g. missing write_orders scope)
      const detail = e.response?.data ? JSON.stringify(e.response.data).slice(0, 500) : e.message;
      console.error('[Web] Shopify order creation failed:', detail);
      db.query(`UPDATE orders SET shopify_error=$1, updated_at=NOW() WHERE id=$2`, [detail, orderId]).catch(() => {});
    });

    // Increment purchase counts and sync collection order (non-blocking)
    shopify.incrementPurchaseCounts(paidItems).then(() => shopify.syncShopifyCollectionOrder()).catch(() => {});

    res.json({ ok: true, orderId });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

/** POST /admin/orders/:id/shopify-sync — manually (re)create the Shopify order for a paid order */
export const retryShopifySync = async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await db.query(`SELECT * FROM orders WHERE id=$1`, [req.params.id]);
    const order = rows[0];
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.shopify_order_id) { res.json({ ok: true, alreadySynced: true, shopifyOrderId: order.shopify_order_id }); return; }

    const items = typeof order.items === 'string' ? JSON.parse(order.items) : (order.items || []);
    if (!items.length) { res.status(400).json({ error: 'Order has no items' }); return; }

    // Try to attach an existing Shopify customer (best effort)
    const customerId = await shopify.findOrCreateShopifyCustomer(
      order.phone, order.customer_name || '', order.customer_email || null
    ).catch(() => null);

    try {
      const shopifyOrderId = await shopify.createShopifyOrder({
        items,
        customerName: order.customer_name || '',
        customerPhone: order.phone,
        deliveryAddress: order.delivery_address || '',
        orderRef: order.paystack_ref || order.id,
        customerId,
        source: order.source || 'website',
      });
      await db.query(
        `UPDATE orders SET shopify_order_id=$1, shopify_error=NULL, updated_at=NOW() WHERE id=$2`,
        [shopifyOrderId, order.id]
      );
      shopify.incrementPurchaseCounts(items).catch(() => {});
      res.json({ ok: true, shopifyOrderId });
    } catch (e: any) {
      const detail = e.response?.data ? JSON.stringify(e.response.data).slice(0, 500) : e.message;
      await db.query(`UPDATE orders SET shopify_error=$1, updated_at=NOW() WHERE id=$2`, [detail, order.id]).catch(() => {});
      res.status(502).json({ error: 'Shopify sync failed', detail });
    }
  } catch (e: any) { res.status(500).json({ error: e.message }); }
};

/** GET /api/whatsapp/orders/track?phone=XXXXXXXXXX — public profile + order history */
export const trackOrders = async (req: Request, res: Response) => {
  try {
    const raw   = String(req.query.phone || '');
    const phone = raw.replace(/\D/g, '');
    if (phone.length < 7) { res.status(400).json({ error: 'Valid phone number required' }); return; }

    // 1. Our local DB orders (WhatsApp + website)
    const { rows: localOrders } = await db.query(`
      SELECT id, status, items, subtotal_kobo, delivery_fee_kobo, total_kobo,
             delivery_address, customer_name, source, created_at, shopify_order_id
      FROM orders
      WHERE (phone=$1 OR phone=$2 OR phone=$3)
        AND status != 'PENDING_PAYMENT'
      ORDER BY created_at DESC LIMIT 30
    `, [
      phone,
      phone.startsWith('234') ? `0${phone.slice(3)}` : phone,
      phone.startsWith('0')   ? `234${phone.slice(1)}` : phone,
    ]);

    // 2. Shopify customer profile + their direct Shopify orders
    const email = String(req.query.email || '').trim() || null;
    const profile = await shopify.getCustomerProfile(phone, email).catch(() => null);

    // 3. Merge — deduplicate by shopify_order_id
    const localShopifyIds = new Set(localOrders.map((o: any) => o.shopify_order_id).filter(Boolean));
    const extraShopifyOrders = (profile?.shopifyOrders || []).filter(
      (o: any) => !localShopifyIds.has(o.id)
    );

    const allOrders = [
      ...localOrders.map((o: any) => ({
        ...o,
        items: typeof o.items === 'string' ? JSON.parse(o.items) : o.items,
      })),
      ...extraShopifyOrders,
    ].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    res.json({
      customer: profile?.found ? {
        name: profile.name,
        email: profile.email,
        shopifyCustomerId: profile.shopifyCustomerId,
      } : (localOrders[0] ? { name: (localOrders[0] as any).customer_name, email: null } : null),
      orders: allOrders,
    });
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

/** GET /api/whatsapp/profile?phone=XXX — load saved customer profile */
export const getCustomerProfileRecord = async (req: Request, res: Response) => {
  try {
    const phone = String(req.query.phone || '').replace(/\D/g, '');
    if (phone.length < 7) { res.status(400).json({ error: 'phone required' }); return; }
    const { rows } = await db.query(
      'SELECT name, email, address FROM customer_profiles WHERE phone=$1',
      [phone]
    );
    res.json(rows[0] || null);
  } catch(e: any) { res.status(500).json({ error: e.message }); }
};

/** POST /api/whatsapp/profile — save/update customer profile */
export const upsertCustomerProfile = async (req: Request, res: Response) => {
  try {
    const { phone, name, email, address } = req.body;
    if (!phone || !name) { res.status(400).json({ error: 'phone and name required' }); return; }
    const clean = String(phone).replace(/\D/g, '');
    await db.query(`
      INSERT INTO customer_profiles (phone, name, email, address, updated_at)
      VALUES ($1,$2,$3,$4,NOW())
      ON CONFLICT (phone) DO UPDATE
        SET name=$2, email=COALESCE($3,customer_profiles.email),
            address=COALESCE($4,customer_profiles.address), updated_at=NOW()
    `, [clean, name.trim(), email?.trim() || null, address?.trim() || null]);
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
        -- includes both WhatsApp and website orders
      `),
      db.query(`
        SELECT
          d.date,
          COALESCE(a.sessions, 0)::int AS sessions,
          COALESCE(o.orders, 0)::int AS orders,
          COALESCE(o.revenue_kobo, 0)::bigint AS revenue_kobo
        FROM (
          SELECT generate_series(
            (NOW()-INTERVAL '13d')::date,
            NOW()::date,
            '1 day'
          )::date AS date
        ) d
        LEFT JOIN (
          SELECT DATE_TRUNC('day', created_at)::date AS date,
                 COUNT(DISTINCT phone)::int AS sessions
          FROM analytics WHERE created_at > NOW()-INTERVAL '14d'
          GROUP BY 1
        ) a ON a.date = d.date
        LEFT JOIN (
          SELECT DATE_TRUNC('day', created_at)::date AS date,
                 COUNT(*)::int AS orders,
                 COALESCE(SUM(total_kobo),0)::bigint AS revenue_kobo
          FROM orders
          WHERE created_at > NOW()-INTERVAL '14d'
            AND status NOT IN ('PENDING_PAYMENT','CANCELLED','REFUNDED')
          GROUP BY 1
        ) o ON o.date = d.date
        ORDER BY d.date
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
