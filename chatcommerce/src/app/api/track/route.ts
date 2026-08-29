import { logEvent } from '@/lib/track';
import { clientIp, isRateLimited } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: cors });
}

/** Public, anonymous, privacy-friendly event tracking (no PII). */
export async function POST(req: Request) {
  if (await isRateLimited(`track:${clientIp(req)}`, 120, 15)) {
    return new Response(null, { status: 204, headers: cors });
  }
  const b = await req.json().catch(() => ({}));
  await logEvent(String(b?.tenantId || ''), b?.sessionId ? String(b.sessionId) : null, String(b?.type || ''), b?.meta || {});
  return new Response(null, { status: 204, headers: cors });
}
