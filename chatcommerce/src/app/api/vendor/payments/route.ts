import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How a vendor collects money from THEIR customers (not platform billing). */
const Config = z.object({
  method: z.enum(['none', 'bank', 'link']),
  bankName: z.string().max(80).optional().default(''),
  accountName: z.string().max(120).optional().default(''),
  accountNumber: z.string().max(40).optional().default(''),
  paymentLink: z.string().url().max(400).optional().or(z.literal('')).default(''),
  note: z.string().max(300).optional().default(''),
});

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    let config: any = { method: 'none' };
    try {
      const t = await ownerQuery(`SELECT payment_config FROM tenants WHERE id = $1`, [s.tid]);
      if (t[0]?.payment_config && Object.keys(t[0].payment_config).length) config = t[0].payment_config;
    } catch {
      /* column not migrated yet */
    }
    return json({ config });
  });
}

export async function PATCH(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = Config.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input: ' + parsed.error.issues[0]?.message, 422);
    if (parsed.data.method === 'link' && !parsed.data.paymentLink) return err('Add a payment link.', 422);
    if (parsed.data.method === 'bank' && (!parsed.data.accountNumber || !parsed.data.accountName)) {
      return err('Add your account name and number.', 422);
    }
    try {
      await ownerQuery(`UPDATE tenants SET payment_config = $2::jsonb, updated_at = now() WHERE id = $1`, [
        s.tid,
        JSON.stringify(parsed.data),
      ]);
      return json({ ok: true, persisted: true });
    } catch {
      return json({ ok: true, persisted: false });
    }
  });
}
