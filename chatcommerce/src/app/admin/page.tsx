'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';

export default function AdminOverview() {
  const [m, setM] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/metrics').then((r) => setM(r.metrics)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!m) return <p className="text-slate-500">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Platform overview</h1>
      <p className="mt-1 text-sm text-forest-900/60">Live, aggregated view across every vendor on ChatCommerce.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vendors" value={m.tenants} />
        <Stat label="Active vendors" value={m.active_tenants} />
        <Stat label="Paying vendors" value={m.paying_tenants} />
        <Stat label="Channels" value={m.channels} />
        <Stat label="Products" value={m.products} />
        <Stat label="Orders" value={m.orders} />
        <Stat label="Total GMV" value={money(Number(m.gmv_cents))} highlight />
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-card ${highlight ? 'grad-lime border-transparent text-forest-900' : 'border-forest-900/5 bg-white text-forest-900'}`}>
      <p className={`text-sm ${highlight ? 'text-forest-900/60' : 'text-forest-900/50'}`}>{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold">{value}</p>
    </div>
  );
}
