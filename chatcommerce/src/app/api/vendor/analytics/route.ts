import { requireVendor } from '@/lib/auth';
import { ownerQuery } from '@/lib/db';
import { json, guard } from '@/lib/util';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  return guard(async () => {
    const s = await requireVendor();
    const tid = s.tid;
    const win = [7, 30, 90].includes(Number(new URL(req.url).searchParams.get('window')))
      ? Number(new URL(req.url).searchParams.get('window'))
      : 30;
    const since = `now() - interval '${win} days'`;

    // Orders + conversations always exist.
    const [ord, conv] = await Promise.all([
      ownerQuery(
        `SELECT count(*)::int AS orders,
                count(*) FILTER (WHERE status='paid')::int AS paid,
                COALESCE(SUM(total_cents),0)::bigint AS gmv
           FROM orders WHERE tenant_id=$1 AND created_at > ${since}`,
        [tid],
      ),
      ownerQuery(`SELECT count(*)::int AS n FROM conversations WHERE tenant_id=$1 AND updated_at > ${since}`, [tid]),
    ]);

    // web_events may not be migrated — default to zeros/empties.
    let ev = { sessions: 0, views: 0, add_to_cart: 0, ai_messages: 0, ai_sessions: 0 };
    let topSearches: any[] = [];
    try {
      ev = (
        await ownerQuery(
          `SELECT
             count(DISTINCT session_id)::int AS sessions,
             count(*) FILTER (WHERE type='store_view')::int AS views,
             count(*) FILTER (WHERE type='add_to_cart')::int AS add_to_cart,
             count(*) FILTER (WHERE type='ai_message')::int AS ai_messages,
             count(DISTINCT session_id) FILTER (WHERE type='ai_message')::int AS ai_sessions
           FROM web_events WHERE tenant_id=$1 AND created_at > ${since}`,
          [tid],
        )
      )[0] as any;
      topSearches = await ownerQuery(
        `SELECT lower(meta->>'text') AS term, count(*)::int AS n
           FROM web_events WHERE tenant_id=$1 AND type='ai_message' AND meta->>'text' IS NOT NULL AND created_at > ${since}
          GROUP BY 1 ORDER BY 2 DESC LIMIT 10`,
        [tid],
      );
    } catch {
      /* not migrated */
    }

    let topProducts: any[] = [];
    try {
      topProducts = await ownerQuery(
        `SELECT item->>'title' AS title, SUM((item->>'qty')::int)::int AS qty
           FROM orders, jsonb_array_elements(items) item
          WHERE tenant_id=$1 AND created_at > ${since}
          GROUP BY 1 ORDER BY 2 DESC LIMIT 8`,
        [tid],
      );
    } catch {
      /* ignore */
    }

    const o = ord[0] as any;
    return json({
      window: win,
      kpis: {
        sessions: ev.sessions,
        views: ev.views,
        addToCart: ev.add_to_cart,
        orders: o.orders,
        paid: o.paid,
        gmvCents: Number(o.gmv),
        conversations: conv[0]?.n ?? 0,
        aiMessages: ev.ai_messages,
        aiSessions: ev.ai_sessions,
      },
      funnel: [
        { label: 'Sessions', value: ev.sessions },
        { label: 'Added to cart', value: ev.add_to_cart },
        { label: 'Orders', value: o.orders },
        { label: 'Paid', value: o.paid },
      ],
      topProducts,
      topSearches,
    });
  });
}
