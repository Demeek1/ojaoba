'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '@/lib/client';
import { Users, UserCheck, CreditCard, MessageCircle, Package, Receipt, TrendingUp, ArrowRight } from 'lucide-react';

export default function AdminOverview() {
  const [m, setM] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/admin/metrics').then((r) => setM(r.metrics)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!m) return <p className="text-forest-900/50">Loading…</p>;

  const tenants = Number(m.tenants) || 0;
  const active = Number(m.active_tenants) || 0;
  const paying = Number(m.paying_tenants) || 0;
  const pct = (n: number) => (tenants ? Math.round((n / tenants) * 100) : 0);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Platform overview</h1>
      <p className="mt-1 text-sm text-forest-900/60">Live, aggregated view across every vendor on ChatCommerce.</p>

      {/* Hero KPI + health */}
      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <div className="grad-lime flex flex-col justify-between rounded-3xl p-6 text-forest-900 shadow-card lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-900/10"><TrendingUp className="h-5 w-5" /></span>
            <span className="rounded-full bg-forest-900/10 px-2 py-0.5 text-xs font-bold">GMV</span>
          </div>
          <div className="mt-6">
            <p className="font-display text-4xl font-extrabold">{money(Number(m.gmv_cents))}</p>
            <p className="text-sm text-forest-900/60">Total gross merchandise value</p>
          </div>
        </div>

        <div className="rounded-3xl border border-forest-900/5 bg-white p-6 shadow-card lg:col-span-2">
          <h2 className="font-display text-lg font-extrabold text-forest-900">Vendor health</h2>
          <div className="mt-5 space-y-5">
            <Bar label="Active vendors" value={active} total={tenants} pct={pct(active)} />
            <Bar label="Paying vendors" value={paying} total={tenants} pct={pct(paying)} accent />
          </div>
          <Link href="/admin/tenants" className="mt-6 inline-flex items-center gap-1.5 font-display text-sm font-bold text-brand-700">
            Manage vendors <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Stat grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Vendors" value={m.tenants} icon={<Users />} />
        <Stat label="Active vendors" value={m.active_tenants} icon={<UserCheck />} />
        <Stat label="Paying vendors" value={m.paying_tenants} icon={<CreditCard />} />
        <Stat label="Channels" value={m.channels} icon={<MessageCircle />} />
        <Stat label="Products" value={m.products} icon={<Package />} />
        <Stat label="Orders" value={m.orders} icon={<Receipt />} />
      </div>
    </div>
  );
}

function Bar({ label, value, total, pct, accent }: { label: string; value: number; total: number; pct: number; accent?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-forest-900/70">{label}</span>
        <span className="font-display text-sm font-bold text-forest-900">
          {value}<span className="text-forest-900/40"> / {total}</span> · {pct}%
        </span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-forest-900/5">
        <div className={`h-full rounded-full ${accent ? 'bg-grass' : 'grad-lime'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: any; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-forest-900/5 bg-white p-5 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</span>
      <p className="mt-4 font-display text-3xl font-extrabold text-forest-900">{value}</p>
      <p className="text-sm text-forest-900/50">{label}</p>
    </div>
  );
}
