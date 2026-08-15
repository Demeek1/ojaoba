import { ownerQuery } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ownerQuery('SELECT 1');
    return Response.json({ ok: true, db: 'up', time: new Date().toISOString() });
  } catch {
    return Response.json({ ok: false, db: 'down' }, { status: 503 });
  }
}
