'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '@/lib/client';
import {
  Package, MessageCircle, Receipt, TrendingUp, ArrowUpRight, ExternalLink, Check, ArrowRight,
} from 'lucide-react';

export default function Overview() {
  const [me, setMe] = useState<any>(null);
  const [counts, setCounts] = useState({ products: 0, channels: 0, orders: 0, gmv: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [m, p, c, o] = await Promise.all([
          api('/api/vendor/me'),
          api('/api/vendor/products'),
          api('/api/vendor/channels'),
          api('/api/vendor/orders'),
        ]);
        setMe(m);
        const gmv = (o.orders || []).reduce((s: number, x: any) => s + Number(x.total_cents), 0);
        setCounts({ products: p.products.length, channels: c.channels.length, orders: o.orders.length, gmv });
      } catch (e: any) {
        setError(e.message);
      }
    })();
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!me) return <p className="text-forest-900/50">Loading…</p>;

  const steps = [
    { done: counts.products > 0, label: 'Add your first product', href: '/dashboard/products', cta: 'Add product' },
    { done: counts.channels > 0, label: 'Connect a chat channel', href: '/dashboard/channels', cta: 'Connect channel' },
    { done: counts.orders > 0, label: 'Receive your first order', href: '/dashboard/channels', cta: 'Test it' },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold text-forest-900">Welcome, {me.tenant.business_name}</h1>
          <p className="mt-1 text-sm text-forest-900/60">
            Plan <span className="font-semibold capitalize text-forest-900">{me.tenant.plan}</span> ·{' '}
            Status <span className="font-semibold capitalize text-forest-900">{me.tenant.status}</span>
          </p>
        </div>
        <Link href={`/store/${me.tenant.slug}`} target="_blank" className="btn-ghost-dark text-sm">
          View storefront <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={counts.products} icon={<Package />} href="/dashboard/products" />
        <Stat label="Channels" value={counts.channels} icon={<MessageCircle />} href="/dashboard/channels" />
        <Stat label="Orders" value={counts.orders} icon={<Receipt />} href="/dashboard/orders" />
        <Stat label="Revenue" value={money(counts.gmv)} icon={<TrendingUp />} href="/dashboard/orders" highlight />
      </div>

      {/* Onboarding checklist */}
      {completed < steps.length && (
        <div className="mt-6 rounded-3xl border border-forest-900/5 bg-forest-900 p-7 text-white shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-extrabold">Finish setting up your store</h2>
              <p className="mt-1 text-sm text-white/60">{completed} of {steps.length} done — you’re almost ready to sell.</p>
            </div>
            <span className="font-display text-2xl font-extrabold text-brand-400">{pct}%</span>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="grad-lime h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <ul className="mt-6 space-y-3">
            {steps.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${s.done ? 'bg-brand-500 text-forest-900' : 'border border-white/25 text-white/40'}`}>
                    {s.done ? <Check className="h-4 w-4" /> : ''}
                  </span>
                  <span className={s.done ? 'text-white/50 line-through' : 'font-medium text-white'}>{s.label}</span>
                </span>
                {!s.done && (
                  <Link href={s.href} className="inline-flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1.5 font-display text-xs font-bold text-forest-900">
                    {s.cta} <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, icon, href, highlight }: { label: string; value: any; icon: React.ReactNode; href: string; highlight?: boolean }) {
  return (
    <Link href={href} className={`group relative overflow-hidden rounded-3xl border p-5 shadow-card transition hover:-translate-y-0.5 ${highlight ? 'grad-lime border-transparent text-forest-900' : 'border-forest-900/5 bg-white text-forest-900'}`}>
      <div className="flex items-center justify-between">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${highlight ? 'bg-forest-900/10' : 'bg-brand-50 text-brand-600'}`}>{icon}</span>
        <ArrowUpRight className="h-4 w-4 opacity-30 transition group-hover:opacity-70" />
      </div>
      <p className="mt-4 font-display text-3xl font-extrabold">{value}</p>
      <p className={`text-sm ${highlight ? 'text-forest-900/60' : 'text-forest-900/50'}`}>{label}</p>
    </Link>
  );
}
