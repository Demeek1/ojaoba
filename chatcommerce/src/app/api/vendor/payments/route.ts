import { z } from 'zod';
import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, err, guard } from '@/lib/util';
import { encryptSecrets } from '@/lib/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** How a vendor collects money from THEIR customers (not platform billing). */
const Config = z.object({
  method: z.enum(['none', 'bank', 'link', 'paystack_auto']),
  bankName: z.string().max(80).optional().default(''),
  accountName: z.string().max(120).optional().default(''),
  accountNumber: z.string().max(40).optional().default(''),
  paymentLink: z.string().url().max(400).optional().or(z.literal('')).default(''),
  note: z.string().max(300).optional().default(''),
  paystackSecret: z.string().max(120).optional().default(''), // write-only, never returned
});

async function readConfig(tid: string): Promise<any> {
  try {
    const t = await ownerQuery(`SELECT payment_config FROM tenants WHERE id = $1`, [tid]);
    return t[0]?.payment_config ?? {};
  } catch {
    return {};
  }
}

export async function GET() {
  return guard(async () => {
    const s = await requireVendor();
    const cfg = await readConfig(s.tid);
    // Never send the encrypted secret to the browser — just whether it's set.
    const { paystackSecretEnc, ...safe } = cfg;
    const base = process.env.NEXT_PUBLIC_APP_URL || '';
    return json({
      config: { method: 'none', ...safe },
      paystackConfigured: !!paystackSecretEnc,
      webhookUrl: `${base}/api/payments/paystack/${s.tid}`,
    });
  });
}

export async function PATCH(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const parsed = Config.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return err('Invalid input: ' + parsed.error.issues[0]?.message, 422);
    const d = parsed.data;

    if (d.method === 'link' && !d.paymentLink) return err('Add a payment link.', 422);
    if (d.method === 'bank' && (!d.accountNumber || !d.accountName)) return err('Add your account name and number.', 422);

    const existing = await readConfig(s.tid);
    const { paystackSecret, ...rest } = d;
    const store: any = { ...rest };

    if (d.method === 'paystack_auto') {
      if (paystackSecret) {
        if (!/^sk_/.test(paystackSecret)) return err('That does not look like a Paystack secret key (starts with sk_).', 422);
        store.paystackSecretEnc = encryptSecrets({ sk: paystackSecret }); // AES-256-GCM
      } else if (existing.paystackSecretEnc) {
        store.paystackSecretEnc = existing.paystackSecretEnc; // keep previously saved key
      } else {
        return err('Add your Paystack secret key to enable automatic payments.', 422);
      }
    }

    try {
      await ownerQuery(`UPDATE tenants SET payment_config = $2::jsonb, updated_at = now() WHERE id = $1`, [
        s.tid,
        JSON.stringify(store),
      ]);
      return json({ ok: true, persisted: true });
    } catch {
      return json({ ok: true, persisted: false });
    }
  });
}
