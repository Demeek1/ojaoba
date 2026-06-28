/**
 * Audit logging — records every privileged admin action.
 * Every staff/permission/settings/order/product mutation should call writeAudit()
 * so the admin "Activity Log" gives a tamper-evident trail of who did what.
 */
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export interface AuditActor {
  id: string;
  email: string;
}

export async function writeAudit(
  actor: AuditActor | undefined,
  action: string,
  opts: {
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, any>;
    ip?: string;
  } = {}
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO audit_log (id, actor_id, actor_email, action, target_type, target_id, metadata, ip)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        uuidv4(),
        actor?.id || null,
        actor?.email || 'system',
        action,
        opts.targetType || null,
        opts.targetId || null,
        JSON.stringify(opts.metadata || {}),
        opts.ip || null,
      ]
    );
  } catch (e: any) {
    // Never let an audit failure break the actual request
    console.error('[audit] failed to write:', e.message);
  }
}

export function clientIp(req: any): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.ip ||
    req.socket?.remoteAddress ||
    ''
  );
}
