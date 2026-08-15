import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Envelope encryption for vendor secrets at rest (channel tokens, store API keys).
 *
 * Algorithm: AES-256-GCM (authenticated encryption — tamper-evident).
 * Key: ENCRYPTION_KEY env var, 32 raw bytes, base64-encoded.
 *
 * Stored format (string): base64(iv).base64(authTag).base64(ciphertext)
 *
 * Nothing sensitive is ever written to the database in plaintext. The decryption
 * key lives only in the runtime environment, never in the repo or the DB, so a
 * database breach alone does not leak any vendor credentials.
 */

function key(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error('ENCRYPTION_KEY is not set');
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)');
  }
  return buf;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${ct.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, ctB64] = payload.split('.');
  if (!ivB64 || !tagB64 || !ctB64) throw new Error('Malformed ciphertext');
  const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64')), decipher.final()]).toString('utf8');
}

/** Encrypt a JSON secret bundle for storage in a JSONB `credentials` column. */
export function encryptSecrets(obj: Record<string, unknown>): { enc: string } {
  return { enc: encrypt(JSON.stringify(obj)) };
}

/** Decrypt a stored secret bundle. Returns {} if not present. */
export function decryptSecrets(stored: any): Record<string, any> {
  if (!stored || typeof stored.enc !== 'string') return {};
  try {
    return JSON.parse(decrypt(stored.enc));
  } catch {
    return {};
  }
}

/** Constant-time-ish secret compare for webhook verification tokens. */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
