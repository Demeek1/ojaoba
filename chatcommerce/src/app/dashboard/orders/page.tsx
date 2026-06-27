'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';
import { Receipt } from 'lucide-react';

const statusStyle: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  paid: 'bg-brand-100 text-brand-700',
  fulfilled: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function Orders() {
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/api/vendor/orders')
      .then((r) => setOrders(r.orders))
      .catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Orders</h1>
      <p className="mt-1 text-sm text-forest-900/60">Orders placed by your customers through chat.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="card mt-6 overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-forest-900/5 text-left text-xs uppercase tracking-wide text-forest-900/40">
              <th className="px-5 py-3 font-semibold">When</th>
              <th className="px-5 py-3 font-semibold">Channel</th>
              <th className="px-5 py-3 font-semibold">Customer</th>
              <th className="px-5 py-3 font-semibold">Items</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-forest-900/5 last:border-0 hover:bg-cream/60">
                <td className="whitespace-nowrap px-5 py-3.5 text-forest-900/70">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-5 py-3.5 capitalize text-forest-900">{o.channel_type}</td>
                <td className="px-5 py-3.5 text-forest-900/70">{o.customer_ref}</td>
                <td className="px-5 py-3.5 text-forest-900">{(o.items || []).reduce((s: number, i: any) => s + i.qty, 0)}</td>
                <td className="px-5 py-3.5 font-display font-bold text-forest-900">{money(Number(o.total_cents), o.currency)}</td>
                <td className="px-5 py-3.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${statusStyle[o.status] || 'bg-forest-900/5 text-forest-900/60'}`}>{o.status}</span>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-forest-900/50">
                  <Receipt className="mx-auto h-9 w-9 opacity-30" />
                  <p className="mt-2 text-sm">No orders yet.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
