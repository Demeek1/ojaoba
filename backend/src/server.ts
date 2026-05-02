import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import db from './db';

import whatsappRoutes from './routes/whatsapp.routes';
import adminRoutes    from './routes/admin.routes';
import productRoutes  from './routes/product.routes';

dotenv.config();

const app = express();

// ── Security & middleware ──────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: (_origin, cb) => cb(null, true),
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','PATCH','OPTIONS'],
}));
app.options('*', cors());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Raw body for webhooks (must come before json middleware)
app.use('/api/whatsapp/shopify', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
if (process.env.NODE_ENV !== 'production') app.use(morgan('dev'));

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) =>
  res.json({ status: 'ok', service: 'Ojaoba API', version: '1.0.0' })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/admin',    adminRoutes);
app.use('/api/products', productRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Database tables ───────────────────────────────────────────────────────────
async function setupDatabase() {
  try {
    // Products synced from Shopify
    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id               TEXT PRIMARY KEY,
        shopify_id       TEXT UNIQUE NOT NULL,
        title            TEXT NOT NULL,
        description      TEXT,
        category         TEXT NOT NULL DEFAULT 'General',
        tags             TEXT[] DEFAULT '{}',
        price_kobo       BIGINT NOT NULL DEFAULT 0,
        compare_price_kobo BIGINT,
        image_url        TEXT,
        available        BOOLEAN DEFAULT TRUE,
        inventory        INTEGER,
        variants         JSONB DEFAULT '[]',
        handle           TEXT,
        shopify_url      TEXT,
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_products_available ON products(available)`);

    // WhatsApp customer sessions
    await db.query(`
      CREATE TABLE IF NOT EXISTS wa_sessions (
        id             TEXT PRIMARY KEY,
        phone          TEXT UNIQUE NOT NULL,
        name           TEXT,
        state          TEXT NOT NULL DEFAULT 'IDLE',
        context        JSONB DEFAULT '{}',
        cart           JSONB DEFAULT '[]',
        order_count    INTEGER DEFAULT 0,
        favorite_items TEXT[] DEFAULT '{}',
        last_active    TIMESTAMPTZ DEFAULT NOW(),
        created_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_wa_sessions_last ON wa_sessions(last_active)`);

    // Orders placed via WhatsApp
    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id                TEXT PRIMARY KEY,
        phone             TEXT NOT NULL,
        customer_name     TEXT,
        delivery_address  TEXT,
        items             JSONB DEFAULT '[]',
        subtotal_kobo     BIGINT DEFAULT 0,
        delivery_fee_kobo BIGINT DEFAULT 0,
        total_kobo        BIGINT DEFAULT 0,
        status            TEXT DEFAULT 'PENDING_PAYMENT',
        paystack_ref      TEXT UNIQUE,
        paystack_url      TEXT,
        shopify_order_id  TEXT,
        notes             TEXT,
        created_at        TIMESTAMPTZ DEFAULT NOW(),
        updated_at        TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_phone   ON orders(phone)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_status  ON orders(status)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at)`);

    // Analytics events
    await db.query(`
      CREATE TABLE IF NOT EXISTS analytics (
        id         TEXT PRIMARY KEY,
        phone      TEXT NOT NULL,
        event      TEXT NOT NULL,
        metadata   JSONB DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_event   ON analytics(event)`);
    await db.query(`CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics(created_at)`);

    // Admin users
    await db.query(`
      CREATE TABLE IF NOT EXISTS admins (
        id            TEXT PRIMARY KEY,
        email         TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name          TEXT,
        created_at    TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Site settings (delivery fee, support contact, etc.)
    await db.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key        TEXT PRIMARY KEY,
        value      TEXT NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Seed default settings
    await db.query(`
      INSERT INTO settings (key, value) VALUES
        ('delivery_fee_kobo', $1),
        ('support_phone',     $2),
        ('support_email',     $3),
        ('store_name',        'Ojaoba Food Market'),
        ('welcome_message',   'Welcome to Ojaoba! 🛒 Nigeria''s freshest food marketplace.')
      ON CONFLICT (key) DO NOTHING
    `, [
      process.env.DELIVERY_FEE_KOBO || '50000',
      process.env.SUPPORT_PHONE     || '+234 800 000 0000',
      process.env.SUPPORT_EMAIL     || 'support@ojaoba.com',
    ]);

    // Seed default admin (from env)
    const bcrypt = require('bcryptjs');
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ojaoba.com';
    const adminPass  = process.env.ADMIN_PASSWORD || 'admin123';
    const hash = await bcrypt.hash(adminPass, 10);
    const { v4: uuidv4 } = require('uuid');
    await db.query(`
      INSERT INTO admins (id, email, password_hash, name)
      VALUES ($1, $2, $3, 'Admin')
      ON CONFLICT (email) DO NOTHING
    `, [uuidv4(), adminEmail, hash]);

    console.log('✅ Ojaoba database ready');
  } catch (e: any) {
    console.error('Database setup error:', e.message);
  }
}

const PORT = parseInt(process.env.PORT || '4000');
app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Ojaoba API running on port ${PORT}`);
  await setupDatabase();
});

export default app;
