import { SignJWT } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { verifyToken as verifyTokenEdge, SESSION_COOKIE, type Session as EdgeSession } from './auth-edge';

/**
 * Authentication & sessions.
 *
 * A session is a signed (HS256) JWT in an httpOnly, Secure, SameSite=Lax cookie.
 * It carries the user's id, their tenant_id, and role. Vendor API handlers read
 * tenant_id from THIS token only — never from request input — which is what makes
 * cross-tenant access impossible.
 */

const COOKIE = SESSION_COOKIE;
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Session = EdgeSession;

function secret(): Uint8Array {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error('AUTH_SECRET is not set');
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 12);
}
export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function createSession(s: Session): Promise<string> {
  return new SignJWT({ tid: s.tid, role: s.role, email: s.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.uid)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
}

export async function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
  });
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}

/** Read & verify the session from cookies (server components / route handlers). */
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifyTokenEdge(token);
}

export const verifyToken = verifyTokenEdge;

/** Throw-style guard for vendor API routes. Returns a tenant-bound session. */
export async function requireVendor(): Promise<Session & { tid: string }> {
  const s = await getSession();
  if (!s || !s.tid) throw new AuthError('Unauthorized', 401);
  return s as Session & { tid: string };
}

export async function requireOwner(): Promise<Session> {
  const s = await getSession();
  if (!s || s.role !== 'platform_owner') throw new AuthError('Forbidden', 403);
  return s;
}

export class AuthError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export { SESSION_COOKIE };
