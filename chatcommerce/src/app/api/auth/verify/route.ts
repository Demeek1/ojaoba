import { ownerQuery } from '@/lib/db';
import { consumeToken } from '@/lib/tokens';
import { appUrl } from '@/lib/email';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/auth/verify?token=... — marks the user's email verified. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token') || '';
  const userId = await consumeToken(token, 'verify_email');
  if (!userId) {
    return Response.redirect(`${appUrl()}/login?verify=invalid`, 302);
  }
  await ownerQuery(`UPDATE users SET email_verified = true WHERE id = $1`, [userId]);
  return Response.redirect(`${appUrl()}/dashboard?verified=1`, 302);
}
