'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';
import { Users, Eye, ShoppingCart, Receipt, CheckCircle2, MessageCircle, Sparkles, TrendingUp } from 'lucide-react';

export default function Analytics() {
  const [win, setWin] = useState(30);
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setD(null);
    api(`/api/vendor/analytics?window=${win}`).then(setD).catch((e) => setError(e.message));
  }, [win]);

  if (error) return <p className="text-red-600">{error}</p>;

  const k = d?.kpis;
  const funnelMax = d ? Math.max(1, ...d.funnel.map((f: any) => f.value)) : 1;
  const conv = k && k.sessions ? Math.round((k.orders / k.sessions) * 100) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-forest-900">Analytics</h1>
          <p className="mt-1 text-sm text-forest-900/60">How customers browse, chat and buy from your store.</p>
        </div>
        <div className="flex items-center gap-1 rounded-full border border-forest-900/10 bg-white p-1">
          {[7, 30, 90].map((w) => (
            <button key={w} onClick={() => setWin(w)} className={`rounded-full px-3 py-1.5 text-sm font-bold transition ${win === w ? 'bg-forest-900 text-white' : 'text-forest-900/50 hover:text-forest-900'}`}>{w}d</button>
          ))}
        </div>
      </div>

      {!d ? (
        <p className="mt-8 text-forest-900/50">Loading…</p>
      ) : (
        <>
          <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Kpi label="Sessions" value={k.sessions} icon={<Users />} />
            <Kpi label="Store views" value={k.views} icon={<Eye />} />
            <Kpi label="Added to cart" value={k.addToCart} icon={<ShoppingCart />} />
            <Kpi label="Conversion" value={`${conv}%`} icon={<TrendingUp />} highlight />
            <Kpi label="Orders" value={k.orders} icon={<Receipt />} />
            <Kpi label="Paid orders" value={k.paid} icon={<CheckCircle2 />} />
            <Kpi label="Chat conversations" value={k.conversations} icon={<MessageCircle />} />
            <Kpi label="AI replies" value={k.aiMessages} icon={<Sparkles />} sub={`${k.aiSessions} sessions`} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card title="Conversion funnel">
              <div className="space-y-4">
                {d.funnel.map((f: any) => (
                  <div key={f.label}>
                    <div className="flex justify-between text-sm">
                      <span className="text-forest-900/70">{f.label}</span>
                      <span className="font-display font-bold text-forest-900">{f.value}</span>
                    </div>
                    <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-forest-900/5">
                      <div className="grad-lime h-full rounded-full" style={{ width: `${Math.round((f.value / funnelMax) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-sm text-forest-900/50">Revenue in period: <span className="font-display font-bold text-forest-900">{money(k.gmvCents)}</span></p>
            </Card>

            <Card title="Top products">
              {d.topProducts.length === 0 ? <Empty>No sales in this period.</Empty> : (
                <ul className="space-y-2">
                  {d.topProducts.map((p: any, i: number) => (
                    <li key={i} className="flex items-center justify-between text-sm">
                      <span className="truncate text-forest-900">{i + 1}. {p.title}</span>
                      <span className="font-display font-bold text-forest-900">{p.qty} sold</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card title="Top customer searches" className="mt-6">
            {d.topSearches.length === 0 ? <Empty>No chat searches yet — add the widget or connect a channel.</Empty> : (
              <div className="flex flex-wrap gap-2">
                {d.topSearches.map((s: any, i: number) => (
                  <span key={i} className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700">{s.term} <span className="text-brand-700/50">×{s.n}</span></span>
                ))}
              </div>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, highlight, sub }: { label: string; value: any; icon: React.ReactNode; highlight?: boolean; sub?: string }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-card ${highlight ? 'grad-lime border-transparent text-forest-900' : 'border-forest-900/5 bg-white text-forest-900'}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${highlight ? 'bg-forest-900/10' : 'bg-brand-50 text-brand-600'}`}>{icon}</span>
      <p className="mt-4 font-display text-3xl font-extrabold">{value}</p>
      <p className={`text-sm ${highlight ? 'text-forest-900/60' : 'text-forest-900/50'}`}>{label}</p>
      {sub && <p className="mt-0.5 text-xs text-forest-900/40">{sub}</p>}
    </div>
  );
}
function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      <h2 className="font-display text-lg font-extrabold text-forest-900">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-forest-900/40">{children}</p>;
}
