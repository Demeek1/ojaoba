import { ownerQuery } from './db';

/** Anonymous, privacy-friendly event logging (no PII). Best-effort. */
const ALLOWED = new Set(['store_view', 'product_view', 'add_to_cart', 'ai_message', 'search', 'checkout_click']);

export async function logEvent(tenantId: string, sessionId: string | null, type: string, meta: Record<string, any> = {}) {
  if (!/^[0-9a-f-]{36}$/i.test(tenantId) || !ALLOWED.has(type)) return;
  try {
    await ownerQuery(
      `INSERT INTO web_events (tenant_id, session_id, type, meta) VALUES ($1,$2,$3,$4::jsonb)`,
      [tenantId, (sessionId || '').slice(0, 64) || null, type, JSON.stringify(meta).slice(0, 2000)],
    );
  } catch {
    /* table not migrated yet — analytics is non-critical */
  }
}
