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
      <h1 className="text-2xl font-bold">Platform overview</h1>
      <p className="mt-1 text-sm text-slate-600">Live, aggregated view across every vendor on ChatCommerce.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vendors" value={m.tenants} />
        <Stat label="Active vendors" value={m.active_tenants} />
        <Stat label="Paying vendors" value={m.paying_tenants} />
        <Stat label="Channels" value={m.channels} />
        <Stat label="Products" value={m.products} />
        <Stat label="Orders" value={m.orders} />
        <Stat label="Total GMV" value={money(Number(m.gmv_cents))} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="card">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}
