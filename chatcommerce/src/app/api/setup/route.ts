import { ownerQuery } from '@/lib/db';

export const runtime = 'nodejs';

/**
 * TEMPORARY one-shot schema setup. Visiting this runs the full schema against
 * the SAME database the app connects to (via DATABASE_URL), so the tables land
 * in exactly the right place regardless of which DB the SQL Editor used.
 * Idempotent (IF NOT EXISTS). Delete after running.
 */
const STATEMENTS: [string, string][] = [
  ['pgcrypto', `CREATE EXTENSION IF NOT EXISTS pgcrypto;`],
  ['tenants', `CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    business_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    plan TEXT NOT NULL DEFAULT 'trial',
    billing_status TEXT NOT NULL DEFAULT 'inactive',
    stripe_customer_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['users', `CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'vendor',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['channels', `CREATE TABLE IF NOT EXISTS channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    display_name TEXT,
    external_id TEXT,
    credentials JSONB NOT NULL DEFAULT '{}',
    webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
    status TEXT NOT NULL DEFAULT 'disconnected',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['stores', `CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    domain TEXT,
    credentials JSONB NOT NULL DEFAULT '{}',
    last_synced_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'connected',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['products', `CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    external_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    price_cents BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    image_url TEXT,
    stock INTEGER,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, store_id, external_id));`],
  ['conversations', `CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    channel_id UUID REFERENCES channels(id) ON DELETE SET NULL,
    customer_ref TEXT NOT NULL,
    state JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (tenant_id, channel_id, customer_ref));`],
  ['orders', `CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    channel_type TEXT,
    customer_ref TEXT,
    items JSONB NOT NULL DEFAULT '[]',
    total_cents BIGINT NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['audit_log', `CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    actor TEXT,
    action TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['idx_users', `CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);`],
  ['idx_channels', `CREATE INDEX IF NOT EXISTS idx_channels_tenant ON channels(tenant_id);`],
  ['idx_stores', `CREATE INDEX IF NOT EXISTS idx_stores_tenant ON stores(tenant_id);`],
  ['idx_products', `CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id, active);`],
  ['idx_conv', `CREATE INDEX IF NOT EXISTS idx_conv_tenant ON conversations(tenant_id, channel_id);`],
  ['idx_orders', `CREATE INDEX IF NOT EXISTS idx_orders_tenant ON orders(tenant_id, created_at DESC);`],
  ['idx_audit', `CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_log(tenant_id, created_at DESC);`],
  ['rls', `DO $$
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
    END $$;`],
];

export async function GET() {
  const done: string[] = [];
  for (const [name, sql] of STATEMENTS) {
    try {
      await ownerQuery(sql);
      done.push(name);
    } catch (e: any) {
      return Response.json({
        ok: false,
        failedAt: name,
        error: String(e?.message || e),
        completed: done,
      });
    }
  }
  return Response.json({ ok: true, message: 'Schema created. You can sign up now.', created: done });
}
