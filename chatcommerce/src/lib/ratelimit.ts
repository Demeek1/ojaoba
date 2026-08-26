import { ownerQuery } from './db';

/**
 * Lightweight DB-backed rate limiter for auth endpoints.
 *
 * Serverless functions are stateless, so an in-memory limiter is useless (each
 * request may hit a fresh instance). We instead count recent failures in the
 * shared audit_log table — which already exists — keyed by client IP. This
 * blunts credential-stuffing and mass-signup bots without new infrastructure.
 */

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]!.trim();
  return req.headers.get('x-real-ip') || 'unknown';
}

/** True if this key has hit `max` failures within the last `windowMin` minutes. */
export async function isRateLimited(key: string, max = 10, windowMin = 15): Promise<boolean> {
  try {
    const rows = await ownerQuery(
      `SELECT count(*)::int AS n FROM audit_log
        WHERE action = 'auth_fail' AND actor = $1
          AND created_at > now() - ($2 || ' minutes')::interval`,
      [key, String(windowMin)],
    );
    return (rows[0]?.n ?? 0) >= max;
  } catch {
    // Fail open on limiter errors — never lock out real users over a logging hiccup.
    return false;
  }
}

/** Record a failed/abusive attempt for `key`. */
export async function recordFail(key: string): Promise<void> {
  try {
    await ownerQuery(
      `INSERT INTO audit_log (tenant_id, actor, action, meta) VALUES (NULL, $1, 'auth_fail', '{}'::jsonb)`,
      [key],
    );
  } catch {
    /* best effort */
  }
}
