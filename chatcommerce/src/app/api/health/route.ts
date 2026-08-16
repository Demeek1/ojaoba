import { ownerQuery } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await ownerQuery('SELECT 1');
    return Response.json({ ok: true, db: 'up', time: new Date().toISOString() });
  } catch (e: any) {
    return Response.json({ ok: false, db: 'down', error: String(e?.message || e) }, { status: 503 });
  }
}
