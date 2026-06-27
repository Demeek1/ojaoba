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
      <h1 className="text-2xl font-bold">Vendors</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every vendor is fully isolated — this console is the only place their data is visible together,
        and only to you.
      </p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">Business</th>
              <th className="py-2 pr-4">Handle</th>
              <th className="py-2 pr-4">Plan</th>
              <th className="py-2 pr-4">Billing</th>
              <th className="py-2 pr-4">Products</th>
              <th className="py-2 pr-4">Channels</th>
              <th className="py-2 pr-4">Orders</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {tenants.map((t) => (
              <tr key={t.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 font-medium">{t.business_name}</td>
                <td className="py-2 pr-4 text-slate-500">/{t.slug}</td>
                <td className="py-2 pr-4 capitalize">{t.plan}</td>
                <td className="py-2 pr-4 capitalize">{t.billing_status}</td>
                <td className="py-2 pr-4">{t.products}</td>
                <td className="py-2 pr-4">{t.channels}</td>
                <td className="py-2 pr-4">{t.orders}</td>
                <td className="py-2 pr-4">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${t.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {t.status}
                  </span>
                </td>
                <td className="py-2">
                  <button className="btn-ghost text-xs" onClick={() => toggle(t)}>
                    {t.status === 'active' ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
            {tenants.length === 0 && (
              <tr><td colSpan={9} className="py-4 text-center text-slate-500">No vendors yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
