import { jwtVerify } from 'jose';

/**
 * Edge-safe auth helpers (no bcrypt / Node APIs) — used by middleware, which
 * runs on the Edge runtime. Only depends on `jose`, which is edge-compatible.
 */

export const SESSION_COOKIE = 'cc_session';

export interface Session {
  uid: string;
  tid: string | null;
  role: 'vendor' | 'platform_owner';
  email: string;
}

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function verifyToken(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      uid: String(payload.sub),
      tid: (payload.tid as string) ?? null,
      role: (payload.role as Session['role']) ?? 'vendor',
      email: (payload.email as string) ?? '',
    };
  } catch {
    return null;
  }
}
