import { ownerQuery } from '@/lib/db';
import { hashPassword, createSession } from '@/lib/auth';

export const runtime = 'nodejs';

/**
 * TEMPORARY diagnostic — runs each signup step and reports which one fails.
 * Delete after debugging. Uses throwaway data and cleans up.
 */
export async function GET() {
  const steps: Record<string, any> = {};
  const email = `debug-${Date.now()}@example.com`;
  const slug = `debug-${Date.now()}`;
  let tenantId: string | undefined;

  try {
    steps.select = (await ownerQuery('SELECT 1 as x'))[0]?.x;
  } catch (e: any) {
    return Response.json({ failed: 'select', error: String(e?.message || e), name: e?.name });
  }

  try {
    tenantId = (
      await ownerQuery(
        `INSERT INTO tenants (slug, business_name, status, plan) VALUES ($1,$2,'active','trial') RETURNING id`,
        [slug, 'Debug Store'],
      )
    )[0]?.id;
    steps.tenant = tenantId;
  } catch (e: any) {
    return Response.json({ failed: 'insert_tenant', error: String(e?.message || e), name: e?.name });
  }

  try {
    steps.hash = (await hashPassword('testpassword123')).slice(0, 7);
  } catch (e: any) {
    return Response.json({ failed: 'hash_password', error: String(e?.message || e), name: e?.name });
  }

  try {
    steps.user = (
      await ownerQuery(
        `INSERT INTO users (tenant_id, email, password_hash, role) VALUES ($1,$2,$3,$4) RETURNING id`,
        [tenantId, email, 'x', 'vendor'],
      )
    )[0]?.id;
  } catch (e: any) {
    await cleanup(tenantId);
    return Response.json({ failed: 'insert_user', error: String(e?.message || e), name: e?.name });
  }

  try {
    await ownerQuery(
      `INSERT INTO audit_log (tenant_id, actor, action, meta) VALUES ($1,$2,$3,$4::jsonb)`,
      [tenantId, email, 'debug', JSON.stringify({ slug })],
    );
    steps.audit = 'ok';
  } catch (e: any) {
    await cleanup(tenantId);
    return Response.json({ failed: 'insert_audit', error: String(e?.message || e), name: e?.name });
  }

  try {
    steps.session = (
      await createSession({ uid: steps.user, tid: tenantId!, role: 'vendor', email })
    ).slice(0, 12);
  } catch (e: any) {
    await cleanup(tenantId);
    return Response.json({ failed: 'create_session', error: String(e?.message || e), name: e?.name });
  }

  await cleanup(tenantId);
  return Response.json({ ok: true, allStepsPassed: true, steps });
}

async function cleanup(tenantId?: string) {
  if (!tenantId) return;
  try {
    await ownerQuery(`DELETE FROM tenants WHERE id = $1`, [tenantId]);
  } catch {
    /* ignore */
  }
}
