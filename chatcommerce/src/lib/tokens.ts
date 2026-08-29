import { randomBytes, createHash } from 'crypto';
import { ownerQuery } from './db';

/**
 * One-time tokens for email verification and password reset.
 * We store only a SHA-256 hash of the token; the raw token lives only in the
 * emailed link. Tokens expire and are single-use.
 */

export type TokenKind = 'verify_email' | 'reset_password';

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Create a token, persist its hash, and return the RAW token for the link. */
export async function createToken(userId: string, kind: TokenKind, ttlMinutes: number): Promise<string> {
  const raw = randomBytes(32).toString('hex');
  await ownerQuery(
    `INSERT INTO auth_tokens (user_id, kind, token_hash, expires_at)
     VALUES ($1, $2, $3, now() + ($4 || ' minutes')::interval)`,
    [userId, kind, sha256(raw), String(ttlMinutes)],
  );
  return raw;
}

/** Validate + consume a token. Returns the user_id if valid, else null. */
export async function consumeToken(raw: string, kind: TokenKind): Promise<string | null> {
  if (!raw || raw.length < 32) return null;
  const rows = await ownerQuery(
    `UPDATE auth_tokens SET used_at = now()
      WHERE token_hash = $1 AND kind = $2 AND used_at IS NULL AND expires_at > now()
      RETURNING user_id`,
    [sha256(raw), kind],
  );
  return rows[0]?.user_id ?? null;
}
