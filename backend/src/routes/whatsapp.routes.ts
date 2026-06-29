import express from 'express';
import { requireAdmin } from '../middleware/auth';
import * as ctrl from '../controllers/whatsapp.controller';

const r = express.Router();

r.get('/webhook',           ctrl.verifyWebhook);
r.post('/webhook',          ctrl.receiveMessage);
r.get('/payment/callback',  ctrl.paymentCallback);
r.post('/shopify/products', express.raw({ type: 'application/json' }), ctrl.shopifyWebhook);

// ── Public website order endpoints (no auth required) ──
r.post('/orders',        ctrl.createWebOrder);
r.post('/orders/verify', ctrl.verifyWebOrder);
r.get('/orders/track',   ctrl.trackOrders);
r.get('/profile',        ctrl.getCustomerProfileRecord);
r.post('/profile',       ctrl.upsertCustomerProfile);

// Admin routes
r.get('/admin/dashboard',          requireAdmin, ctrl.getDashboard);
r.get('/admin/orders',             requireAdmin, ctrl.listOrders);
r.get('/admin/orders/:id',         requireAdmin, ctrl.getOrder);
r.put('/admin/orders/:id/status',  requireAdmin, ctrl.updateOrderStatus);
r.patch('/admin/orders/:id',       requireAdmin, ctrl.updateOrderStatus); // frontend sends PATCH
r.post('/admin/orders/:id/shopify-sync', requireAdmin, ctrl.retryShopifySync);
r.get('/admin/sessions',                       requireAdmin, ctrl.listSessions);
r.get('/admin/sessions/:phone/messages',       requireAdmin, ctrl.getSessionMessages);
r.post('/admin/sessions/:phone/reply',         requireAdmin, ctrl.adminReply);
r.post('/admin/sync',              requireAdmin, ctrl.syncProducts);
r.get('/admin/products',           requireAdmin, ctrl.listProducts);
r.post('/admin/broadcast',         requireAdmin, ctrl.broadcast);
r.get('/admin/analytics',          requireAdmin, ctrl.getAnalytics);
r.get('/admin/settings',           requireAdmin, ctrl.getSettings);
r.put('/admin/settings',           requireAdmin, ctrl.updateSettings);

export default r;
