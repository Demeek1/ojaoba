'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '@/lib/client';
import { Package, MessageCircle, Receipt, TrendingUp, ArrowUpRight, ExternalLink } from 'lucide-react';

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
        <Link
          href={`/store/${me.tenant.slug}`}
          target="_blank"
          className="btn-ghost-dark text-sm"
        >
          View storefront <ExternalLink className="h-4 w-4" />
        </Link>
      </div>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={counts.products} icon={<Package />} href="/dashboard/products" />
        <Stat label="Channels" value={counts.channels} icon={<MessageCircle />} href="/dashboard/channels" />
        <Stat label="Orders" value={counts.orders} icon={<Receipt />} href="/dashboard/orders" />
        <Stat label="Revenue" value={money(counts.gmv)} icon={<TrendingUp />} href="/dashboard/orders" highlight />
      </div>

      <div className="mt-6 rounded-3xl border border-forest-900/5 bg-forest-900 p-7 text-white shadow-card">
        <h2 className="font-display text-xl font-extrabold">Get set up in 3 steps</h2>
        <ol className="mt-4 space-y-3 text-sm text-white/75">
          <li className="flex gap-3"><Num n="1" /> <span><Link className="font-semibold text-brand-400" href="/dashboard/stores">Connect your store</Link> (Shopify / WooCommerce) and import products — or add them manually.</span></li>
          <li className="flex gap-3"><Num n="2" /> <span><Link className="font-semibold text-brand-400" href="/dashboard/channels">Connect a channel</Link> (WhatsApp, Telegram or Instagram) and copy your webhook URL.</span></li>
          <li className="flex gap-3"><Num n="3" /> <span>Message your bot “menu” and place a test order. 🎉</span></li>
        </ol>
      </div>
    </div>
  );
}

function Num({ n }: { n: string }) {
  return <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-500 font-display text-xs font-bold text-forest-900">{n}</span>;
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
