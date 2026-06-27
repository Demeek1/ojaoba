'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function Tenants() {
  const [tenants, setTenants] = useState<any[]>([]);
  const [error, setError] = useState('');

  async function load() {
    const r = await api('/api/admin/tenants');
    setTenants(r.tenants);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function toggle(t: any) {
    const status = t.status === 'active' ? 'suspended' : 'active';
    await api('/api/admin/tenants', { method: 'PATCH', body: { tenantId: t.id, status } });
    await load();
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Vendors</h1>
      <p className="mt-1 text-sm text-forest-900/60">
        Every vendor is fully isolated — this console is the only place their data is visible together,
        and only to you.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-forest-900/5 text-left text-xs uppercase tracking-wide text-forest-900/40">
              <th className="px-5 py-3 font-semibold">Business</th>
              <th className="px-5 py-3 font-semibold">Handle</th>
              <th className="px-5 py-3 font-semibold">Plan</th>
              <th className="px-5 py-3 font-semibold">Billing</th>
              <th className="px-5 py-3 font-semibold">Products</th>
              <th className="px-5 py-3 font-semibold">Channels</th>
              <th className="px-5 py-3 font-semibold">Orders</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-forest-900/5 last:border-0 hover:bg-cream/60">
                <td className="px-5 py-3.5 font-display font-bold text-forest-900">{t.business_name}</td>
                <td className="px-5 py-3.5 text-forest-900/50">/{t.slug}</td>
                <td className="px-5 py-3.5 capitalize text-forest-900">{t.plan}</td>
                <td className="px-5 py-3.5 capitalize text-forest-900/70">{t.billing_status}</td>
                <td className="px-5 py-3.5 text-forest-900">{t.products}</td>
                <td className="px-5 py-3.5 text-forest-900">{t.channels}</td>
                <td className="px-5 py-3.5 text-forest-900">{t.orders}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === 'active' ? 'bg-brand-100 text-brand-700' : 'bg-red-100 text-red-700'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <button className="btn-ghost-dark px-3.5 py-1.5 text-xs" onClick={() => toggle(t)}>
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={9} className="px-5 py-10 text-center text-forest-900/50">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
