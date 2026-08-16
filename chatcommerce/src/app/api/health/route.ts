import { ownerQuery } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ownerQuery('SELECT 1');
    return Response.json({ ok: true, db: 'up', time: new Date().toISOString() });
  } catch (e: any) {
    // Temporary diagnostics: surface WHY the DB connection fails, without
    // leaking the password. We report the error message and a redacted view of
    // the connection string's shape (host + flags only).
    const raw = process.env.DATABASE_URL || '';
    let shape = 'DATABASE_URL is empty/unset';
    if (raw) {
      let host = 'unparseable';
      try {
        host = new URL(raw).host;
      } catch {
        /* keep unparseable */
      }
      shape = JSON.stringify({
        length: raw.length,
        startsWithPostgres: raw.startsWith('postgres'),
        host,
        hasPooler: raw.includes('-pooler'),
        hasSslmode: raw.includes('sslmode=require'),
        hasSpaces: /\s/.test(raw),
        hasQuotes: /^["']|["']$/.test(raw),
      });
    }
    return Response.json(
      { ok: false, db: 'down', error: String(e?.message || e), name: e?.name, shape },
      { status: 503 },
    );
  }
}
