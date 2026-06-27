'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';

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
      <h1 className="text-2xl font-bold">Orders</h1>
      <p className="mt-1 text-sm text-slate-600">Orders placed by your customers through chat.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="card mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="py-2 pr-4">When</th>
              <th className="py-2 pr-4">Channel</th>
              <th className="py-2 pr-4">Customer</th>
              <th className="py-2 pr-4">Items</th>
              <th className="py-2 pr-4">Total</th>
              <th className="py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-slate-100">
                <td className="py-2 pr-4 whitespace-nowrap">{new Date(o.created_at).toLocaleString()}</td>
                <td className="py-2 pr-4 capitalize">{o.channel_type}</td>
                <td className="py-2 pr-4">{o.customer_ref}</td>
                <td className="py-2 pr-4">{(o.items || []).reduce((s: number, i: any) => s + i.qty, 0)}</td>
                <td className="py-2 pr-4">{money(Number(o.total_cents), o.currency)}</td>
                <td className="py-2 capitalize">{o.status}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={6} className="py-4 text-center text-slate-500">No orders yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
