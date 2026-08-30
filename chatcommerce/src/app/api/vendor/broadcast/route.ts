import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';
import { decryptSecrets } from '@/lib/crypto';
import { getChannel } from '@/lib/channels';
import { writeAudit, teamRole } from '@/lib/audit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RECIPIENTS = 300;

/** GET → connected channels and how many customers can be reached. */
export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const channels = await ownerQuery(
      `SELECT c.id, c.type, c.display_name, c.status,
              (SELECT count(*) FROM conversations v WHERE v.channel_id = c.id) AS total,
              (SELECT count(*) FROM conversations v WHERE v.channel_id = c.id AND v.updated_at > now() - interval '24 hours') AS recent
         FROM channels c WHERE c.tenant_id = $1 ORDER BY c.created_at`,
      [s.tid],
    );
    return json({ channels });
  });
}

const Body = z.object({ channelId: z.string().uuid(), message: z.string().min(1).max(1000) });

/** POST → send a broadcast to eligible recipients on one channel. */
export async function POST(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    if (!['owner', 'admin'].includes(await teamRole(s.uid))) return err('Only owners/admins can send broadcasts.', 403);

    const parsed = Body.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input', 422);

    const ch = (
      await ownerQuery(`SELECT id, type, credentials FROM channels WHERE id = $1 AND tenant_id = $2`, [parsed.data.channelId, s.tid])
    )[0];
    if (!ch) return err('Channel not found.', 404);
    const connector = getChannel(ch.type);
    if (!connector) return err('Unsupported channel.', 400);
    const creds = decryptSecrets(ch.credentials);

    // WhatsApp only permits free-form messages within 24h of the customer's last
    // message; outside that window a business needs approved templates (not yet
    // supported). Telegram has no such rule.
    const windowClause = ch.type === 'whatsapp' ? `AND updated_at > now() - interval '24 hours'` : '';
    const recipients = await ownerQuery(
      `SELECT DISTINCT customer_ref FROM conversations
        WHERE tenant_id = $1 AND channel_id = $2 ${windowClause}
        LIMIT ${MAX_RECIPIENTS}`,
      [s.tid, ch.id],
    );

    let sent = 0;
    for (const r of recipients) {
      try {
        await connector.send(creds, { customerRef: r.customer_ref, text: parsed.data.message });
        sent++;
      } catch {
        /* skip individual failures */
      }
    }

    await writeAudit(s.tid, s.email, 'broadcast.send', { channel: ch.type, sent });
    return json({ ok: true, sent, capped: recipients.length >= MAX_RECIPIENTS });
  });
}
