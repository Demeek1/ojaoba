-- ============================================================================
-- ChatCommerce — multi-tenant schema
--
-- Isolation model (two layers, defense in depth):
--   1. APPLICATION layer: every vendor query goes through a TenantClient that
--      injects `tenant_id = <session tenant>` into every statement. A vendor
--      can never name another tenant's id — it comes from their signed session.
--   2. DATABASE layer: Row-Level Security (RLS) policies below ensure that even
--      a buggy/forgotten WHERE clause cannot read across tenants, as long as the
--      connection sets `app.tenant_id`. The platform-owner role bypasses RLS to
--      monitor everything.
--
-- Designed for scale: tenant_id is the leading column of every composite index,
-- so the planner partitions work per vendor and stays fast with millions of rows.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Tenants (vendors) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT UNIQUE NOT NULL,                 -- public storefront handle
  business_name TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'active',       -- active | suspended | pending
  plan          TEXT NOT NULL DEFAULT 'trial',        -- trial | starter | pro | enterprise
  billing_status TEXT NOT NULL DEFAULT 'inactive',    -- inactive | active | past_due
  stripe_customer_id TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Users (belong to exactly one tenant; or platform owner with NULL tenant) ─
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'vendor',       -- vendor | platform_owner
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Channels: a vendor's connected chat surfaces ────────────────────────────
-- `credentials` holds AES-256-GCM-encrypted secrets (tokens). Never plaintext.
CREATE TABLE IF NOT EXISTS channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type          TEXT NOT NULL,                        -- whatsapp | telegram | instagram
  display_name  TEXT,
  external_id   TEXT,                                 -- phone number id / bot id / ig id
  credentials   JSONB NOT NULL DEFAULT '{}',          -- ENCRYPTED secret bundle
  webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  status        TEXT NOT NULL DEFAULT 'disconnected', -- connected | disconnected | error
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Store connections: Shopify / WooCommerce / manual ───────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,                        -- shopify | woocommerce | manual
  domain        TEXT,                                 -- myshop.myshopify.com etc.
  credentials   JSONB NOT NULL DEFAULT '{}',          -- ENCRYPTED
  last_synced_at TIMESTAMPTZ,
  status        TEXT NOT NULL DEFAULT 'connected',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Products (imported from store or added manually) ────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  store_id      UUID REFERENCES stores(id) ON DELETE SET NULL,
  external_id   TEXT,                                 -- id in the source store
  title         TEXT NOT NULL,
  description   TEXT,
  price_cents   BIGINT NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  image_url     TEXT,
  stock         INTEGER,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, store_id, external_id)
);

-- ── Conversations & orders captured from chat ───────────────────────────────
CREATE TABLE IF NOT EXISTS conversations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id    UUID REFERENCES channels(id) ON DELETE SET NULL,
  customer_ref  TEXT NOT NULL,                        -- phone / chat id (per channel)
  state         JSONB NOT NULL DEFAULT '{}',          -- cart + bot state machine
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, channel_id, customer_ref)
);

CREATE TABLE IF NOT EXISTS orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  channel_type  TEXT,
  customer_ref  TEXT,
  items         JSONB NOT NULL DEFAULT '[]',
  total_cents   BIGINT NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'USD',
  status        TEXT NOT NULL DEFAULT 'pending',      -- pending | paid | fulfilled | cancelled
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Audit log (platform-owner visibility; also useful for vendors) ──────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID REFERENCES tenants(id) ON DELETE CASCADE,
  actor         TEXT,
  action        TEXT NOT NULL,
  meta          JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes: tenant_id first for per-vendor locality at scale ───────────────
CREATE INDEX IF NOT EXISTS idx_users_tenant       ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_channels_tenant    ON channels(tenant_id);
CREATE INDEX IF NOT EXISTS idx_stores_tenant      ON stores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant     ON products(tenant_id, active);
CREATE INDEX IF NOT EXISTS idx_conv_tenant        ON conversations(tenant_id, channel_id);
CREATE INDEX IF NOT EXISTS idx_orders_tenant      ON orders(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_tenant       ON audit_log(tenant_id, created_at DESC);

-- ── Row-Level Security (database-enforced isolation) ────────────────────────
-- The app sets `SET app.tenant_id = '<uuid>'` per request. Policies below then
-- physically prevent any row from a different tenant being seen or written,
-- even if the application query forgets its WHERE clause.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['channels','stores','products','conversations','orders']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', t);
    EXECUTE format($f$
      DROP POLICY IF EXISTS tenant_isolation ON %I;
      CREATE POLICY tenant_isolation ON %I
        USING (tenant_id::text = current_setting('app.tenant_id', true))
        WITH CHECK (tenant_id::text = current_setting('app.tenant_id', true));
    $f$, t, t);
  END LOOP;
END $$;
