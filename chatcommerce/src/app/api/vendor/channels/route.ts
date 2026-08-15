import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { tenantDb } from '@/lib/db';
import { encryptSecrets } from '@/lib/crypto';
import { SUPPORTED_CHANNELS } from '@/lib/channels';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const db = tenantDb(s.tid);
    // NOTE: credentials are intentionally NOT selected — secrets never leave the server.
    const rows = await db.query(
      `SELECT id, type, display_name, external_id, status, webhook_secret, created_at
         FROM channels WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [s.tid],
    );
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    const channels = rows.map((c: any) => ({
      ...c,
      webhookUrl: `${appUrl}/api/webhooks/${c.type}/${s.tid}?s=${c.webhook_secret}`,
      webhook_secret: undefined,
    }));
    return json({ channels });
  });
}

const NewChannel = z.object({
  type: z.enum(['whatsapp', 'telegram', 'instagram']),
  displayName: z.string().max(80).optional().default(''),
  externalId: z.string().max(120).optional().default(''),
  // free-form secret bundle (accessToken, phoneNumberId, botToken, verifyToken, …)
  credentials: z.record(z.string()).default({}),
});

export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = NewChannel.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid channel config', 422);
    const { type, displayName, externalId, credentials } = parsed.data;
    if (!SUPPORTED_CHANNELS.includes(type)) return err('Unsupported channel', 400);

    const enc = encryptSecrets(credentials); // AES-256-GCM at rest
    const db = tenantDb(s.tid);
    const row = (
      await db.query(
        `INSERT INTO channels (tenant_id, type, display_name, external_id, credentials, status)
         VALUES ($1,$2,$3,$4,$5::jsonb,'connected') RETURNING id, webhook_secret`,
        [s.tid, type, displayName, externalId, JSON.stringify(enc)],
      )
    )[0];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    return json(
      {
        ok: true,
        id: row.id,
        webhookUrl: `${appUrl}/api/webhooks/${type}/${s.tid}?s=${row.webhook_secret}`,
      },
      201,
    );
  });
}
