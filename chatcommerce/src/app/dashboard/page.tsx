'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '@/lib/client';

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
  if (!me) return <p className="text-slate-500">Loading…</p>;

  const liveUrl = `/store/${me.tenant.slug}`;

  return (
    <div>
      <h1 className="text-2xl font-bold">Welcome, {me.tenant.business_name}</h1>
      <p className="mt-1 text-sm text-slate-600">
        Plan: <span className="font-medium capitalize">{me.tenant.plan}</span> · Status:{' '}
        <span className="font-medium capitalize">{me.tenant.status}</span> ·{' '}
        <Link href={liveUrl} className="text-brand-600" target="_blank">
          View your storefront →
        </Link>
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Products" value={counts.products} href="/dashboard/products" />
        <Stat label="Channels" value={counts.channels} href="/dashboard/channels" />
        <Stat label="Orders" value={counts.orders} href="/dashboard/orders" />
        <Stat label="Revenue" value={money(counts.gmv)} href="/dashboard/orders" />
      </div>

      <div className="card mt-6">
        <h2 className="font-semibold">Get set up in 3 steps</h2>
        <ol className="mt-3 space-y-2 text-sm text-slate-600">
          <li>1. <Link className="text-brand-600" href="/dashboard/stores">Connect your store</Link> (Shopify / WooCommerce) and import products — or add them manually.</li>
          <li>2. <Link className="text-brand-600" href="/dashboard/channels">Connect a channel</Link> (WhatsApp, Telegram or Instagram) and copy your webhook URL.</li>
          <li>3. Message your bot “menu” and place a test order. 🎉</li>
        </ol>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: any; href: string }) {
  return (
    <Link href={href} className="card transition hover:shadow-md">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </Link>
  );
}
