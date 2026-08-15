import { clearSessionCookie } from '@/lib/auth';
import { json } from '@/lib/util';

export const runtime = 'nodejs';

export async function POST() {
  const res = json({ ok: true });
  clearSessionCookie(res);
  return res;
}
