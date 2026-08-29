import { ownerQuery } from './db';

/** Append a privileged-action entry to the tenant's audit log. Best-effort. */
export async function writeAudit(tenantId: string, actor: string, action: string, meta: Record<string, any> = {}) {
  try {
    await ownerQuery(
      `INSERT INTO audit_log (tenant_id, actor, action, meta) VALUES ($1,$2,$3,$4::jsonb)`,
      [tenantId, actor.slice(0, 200), action.slice(0, 80), JSON.stringify(meta).slice(0, 2000)],
    );
  } catch {
    /* audit table always exists, but never let logging break the action */
  }
}

/** A user's role within their tenant (owner | admin | staff). Column-safe. */
export async function teamRole(userId: string): Promise<'owner' | 'admin' | 'staff'> {
  try {
    const r = await ownerQuery(`SELECT team_role FROM users WHERE id = $1`, [userId]);
    const tr = r[0]?.team_role;
    return tr === 'admin' || tr === 'staff' ? tr : 'owner';
  } catch {
    return 'owner'; // pre-migration: single-user tenants are owners
  }
}
