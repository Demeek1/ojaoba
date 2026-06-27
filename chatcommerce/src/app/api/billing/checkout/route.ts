import { requireVendor } from '@/lib/auth';
import { createCheckout } from '@/lib/billing';
import { json, err, guard } from '@/lib/util';

export const runtime = 'nodejs';

export async function POST() {
  return guard(async () => {
    const s = await requireVendor();
    try {
      const url = await createCheckout(s.tid, s.email);
      return json({ url });
    } catch (e: any) {
      return err(e.message, 400);
    }
  });
}
