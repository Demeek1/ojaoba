'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money } from '@/lib/client';
import {
  ArrowLeft, TrendingUp, Receipt, Package, MessageCircle, Users, MessagesSquare, ExternalLink,
} from 'lucide-react';

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-brand-100 text-brand-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function VendorDetail({ params }: { params: { id: string } }) {
  const [d, setD] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api(`/api/admin/tenants/${params.id}`);
    setD(r);
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, [params.id]);

  async function toggle() {
    setBusy(true);
    try {
      const status = d.tenant.status === 'active' ? 'suspended' : 'active';
      await api('/api/admin/tenants', { method: 'PATCH', body: { tenantId: d.tenant.id, status } });
      await load();
    } finally { setBusy(false); }
  }

  if (error) return <p className="text-red-600">{error}</p>;
  if (!d) return <p className="text-forest-900/50">Loading…</p>;

  const t = d.tenant;
  const c = d.counts;

  return (
    <div>
      <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest-900/60 hover:text-forest-900">
        <ArrowLeft className="h-4 w-4" /> All vendors
      </Link>

      {/* Header */}
      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-forest-900 font-display text-2xl font-extrabold text-brand-400">
            {(t.business_name?.[0] || 'S').toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-3xl font-extrabold text-forest-900">{t.business_name}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-forest-900/60">
              <span>/{t.slug}</span>
              <Chip>{t.plan}</Chip>
              <Chip>{t.billing_status}</Chip>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === 'active' ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>{t.status}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/store/${t.slug}`} target="_blank" className="btn-ghost-dark px-4 py-2 text-sm">Storefront <ExternalLink className="h-4 w-4" /></Link>
          <button onClick={toggle} disabled={busy} className="btn-ghost-dark px-4 py-2 text-sm">
            {t.status === 'active' ? 'Suspend' : 'Activate'}
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Total GMV" value={money(d.gmvCents)} icon={<TrendingUp />} highlight sub={`${d.orders7d} orders in 7 days`} />
        <Stat label="Orders" value={c.orders} icon={<Receipt />} />
        <Stat label="Products" value={`${c.active_products}/${c.products}`} icon={<Package />} sub="active / total" />
        <Stat label="Channels" value={c.channels} icon={<MessageCircle />} />
        <Stat label="Conversations" value={c.conversations} icon={<MessagesSquare />} />
        <Stat label="Team members" value={c.users} icon={<Users />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Channels */}
        <Card title="Channels">
          {d.channels.length === 0 ? <Empty>No channels connected.</Empty> : (
            <ul className="divide-y divide-forest-900/5">
              {d.channels.map((ch: any, i: number) => (
                <li key={i} className="flex items-center justify-between py-3">
                  <span className="font-medium capitalize text-forest-900">{ch.type}{ch.display_name ? <span className="font-normal text-forest-900/50"> · {ch.display_name}</span> : ''}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${ch.status === 'connected' ? 'bg-brand-100 text-brand-700' : 'bg-forest-900/5 text-forest-900/50'}`}>{ch.status}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Team */}
        <Card title="Team">
          <ul className="divide-y divide-forest-900/5">
            {d.members.map((m: any, i: number) => (
              <li key={i} className="flex items-center justify-between py-3 text-sm">
                <span className="text-forest-900">{m.email}</span>
                <span className="capitalize text-forest-900/50">{m.role.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Recent orders */}
      <Card title="Recent orders" className="mt-6">
        {d.recentOrders.length === 0 ? <Empty>No orders yet.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-forest-900/5 text-left text-xs uppercase tracking-wide text-forest-900/40">
                  <th className="py-2 pr-4 font-semibold">When</th>
                  <th className="py-2 pr-4 font-semibold">Channel</th>
                  <th className="py-2 pr-4 font-semibold">Customer</th>
                  <th className="py-2 pr-4 font-semibold">Total</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.recentOrders.map((o: any) => (
                  <tr key={o.id} className="border-b border-forest-900/5 last:border-0">
                    <td className="whitespace-nowrap py-2.5 pr-4 text-forest-900/70">{new Date(o.created_at).toLocaleString()}</td>
                    <td className="py-2.5 pr-4 capitalize text-forest-900">{o.channel_type}</td>
                    <td className="py-2.5 pr-4 text-forest-900/70">{o.customer_ref}</td>
                    <td className="py-2.5 pr-4 font-display font-bold text-forest-900">{money(Number(o.total_cents), o.currency)}</td>
                    <td className="py-2.5"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyle[o.status] || 'bg-forest-900/5 text-forest-900/60'}`}>{o.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-forest-900/5 px-2.5 py-0.5 text-xs font-semibold capitalize text-forest-900/70">{children}</span>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-forest-900/40">{children}</p>;
}
function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      <h2 className="font-display text-lg font-extrabold text-forest-900">{title}</h2>
      <div className="mt-2">{children}</div>
    </div>
  );
}
function Stat({ label, value, icon, highlight, sub }: { label: string; value: any; icon: React.ReactNode; highlight?: boolean; sub?: string }) {
  return (
    <div className={`rounded-3xl border p-5 shadow-card ${highlight ? 'grad-lime border-transparent text-forest-900' : 'border-forest-900/5 bg-white text-forest-900'}`}>
      <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${highlight ? 'bg-forest-900/10' : 'bg-brand-50 text-brand-600'}`}>{icon}</span>
      <p className="mt-4 font-display text-3xl font-extrabold">{value}</p>
      <p className={`text-sm ${highlight ? 'text-forest-900/60' : 'text-forest-900/50'}`}>{label}</p>
      {sub && <p className={`mt-0.5 text-xs ${highlight ? 'text-forest-900/50' : 'text-forest-900/40'}`}>{sub}</p>}
    </div>
  );
}
