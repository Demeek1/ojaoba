import { ownerQuery } from '@/lib/db';
import { requireOwner, AuthError } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Owner-only, idempotent schema migrations. Visiting this while signed in as the
 * platform owner applies any new columns/tables the app needs, against the
 * app's own DATABASE_URL — so schema always lands in the right place. Safe to
 * run repeatedly (all statements use IF NOT EXISTS).
 */
const MIGRATIONS: [string, string][] = [
  ['users.email_verified', `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false;`],
  ['users.mfa_secret', `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_secret TEXT;`],
  ['users.mfa_enabled', `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT false;`],
  ['users.team_role', `ALTER TABLE users ADD COLUMN IF NOT EXISTS team_role TEXT NOT NULL DEFAULT 'owner';`],
  ['tenants.onboarding_state', `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS onboarding_state JSONB NOT NULL DEFAULT '{}'::jsonb;`],
  ['tenants.payment_config', `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_config JSONB NOT NULL DEFAULT '{}'::jsonb;`],
  ['auth_tokens', `CREATE TABLE IF NOT EXISTS auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['idx_auth_tokens_hash', `CREATE INDEX IF NOT EXISTS idx_auth_tokens_hash ON auth_tokens(token_hash);`],
  ['webhook_events', `CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['web_events', `CREATE TABLE IF NOT EXISTS web_events (
    id BIGSERIAL PRIMARY KEY,
    tenant_id UUID NOT NULL,
    session_id TEXT,
    type TEXT NOT NULL,
    meta JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now());`],
  ['idx_web_events_tenant', `CREATE INDEX IF NOT EXISTS idx_web_events_tenant ON web_events(tenant_id, created_at DESC);`],
];

export async function GET() {
  try {
    await requireOwner();
  } catch (e) {
    if (e instanceof AuthError) return Response.json({ error: e.message }, { status: e.status });
    throw e;
  }

  const done: string[] = [];
  for (const [name, sql] of MIGRATIONS) {
    try {
      await ownerQuery(sql);
      done.push(name);
    } catch (e: any) {
      return Response.json({ ok: false, failedAt: name, error: String(e?.message || e), completed: done });
    }
  }
  return Response.json({ ok: true, message: 'Schema up to date.', applied: done });
}
