'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api, { fmt } from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Search, ChevronLeft, ChevronRight, Eye, MessageCircle,
  CheckCircle, Clock, XCircle, Package, Truck, X
} from 'lucide-react';

interface OrderItem {
  title: string;
  // cart stores camelCase; some older records may have snake_case
  quantity?: number;  qty?: number;
  priceKobo?: number; price_kobo?: number;
  note?: string;
  imageUrl?: string;
}

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  address: string;
  items: OrderItem[];
  subtotal_kobo: number;
  delivery_fee_kobo: number;
  total_kobo: number;
  status: string;
  paystack_ref: string;
  notes: string;
  created_at: string;
}

const STATUSES = ['all', 'pending', 'paid', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  paid: 'bg-green-50 text-green-700 border-green-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  processing: 'bg-blue-50 text-blue-700 border-blue-200',
  shipped: 'bg-purple-50 text-purple-700 border-purple-200',
  delivered: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
};

const nextStatus: Record<string, string> = {
  paid: 'confirmed',
  confirmed: 'processing',
  processing: 'shipped',
  shipped: 'delivered',
};

function OrderDetailModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const qc = useQueryClient();
  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      await api.patch(`/whatsapp/admin/orders/${order.id}`, { status });
    },
    onSuccess: (_, status) => {
      toast.success(`Order marked as ${status}`);
      qc.invalidateQueries({ queryKey: ['admin-orders'] });
      qc.invalidateQueries({ queryKey: ['admin-dashboard'] });
      onClose();
    },
    onError: () => toast.error('Failed to update order'),
  });

  const WA = process.env.NEXT_PUBLIC_WA_NUMBER || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="font-black text-gray-900 text-lg">Order #{order.id.slice(-8).toUpperCase()}</h2>
            <p className="text-sm text-gray-400">{new Date(order.created_at).toLocaleString('en-NG')}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Customer */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Customer</h3>
            <p className="font-semibold text-gray-900">{order.customer_name}</p>
            <p className="text-sm text-gray-600">{order.customer_phone}</p>
            <p className="text-sm text-gray-600 mt-1">{order.address}</p>
          </div>

          {/* Items */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Items</h3>
            <div className="space-y-3">
              {order.items?.map((item, i) => {
                const qty   = item.quantity   ?? item.qty        ?? 1;
                const price = item.priceKobo  ?? item.price_kobo ?? 0;
                return (
                  <div key={i} className="flex items-start justify-between text-sm gap-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-gray-700 font-medium">{qty}× {item.title}</span>
                      {item.note && (
                        <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-2 py-1 mt-1 border border-amber-100">
                          📝 {item.note}
                        </p>
                      )}
                    </div>
                    <span className="font-semibold text-gray-900 shrink-0">{fmt(price * qty)}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t mt-3 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Subtotal</span><span>{fmt(order.subtotal_kobo)}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>Delivery</span><span>{fmt(order.delivery_fee_kobo)}</span>
              </div>
              <div className="flex justify-between font-bold text-gray-900">
                <span>Total</span><span>{fmt(order.total_kobo)}</span>
              </div>
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Status</h3>
            <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full border capitalize ${statusColors[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {order.status}
            </span>
            {order.notes && <p className="text-sm text-gray-500 mt-2">Note: {order.notes}</p>}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3 pt-2">
            {nextStatus[order.status] && (
              <button
                onClick={() => updateStatus.mutate(nextStatus[order.status])}
                disabled={updateStatus.isPending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
              >
                <Package className="w-4 h-4" />
                Mark as {nextStatus[order.status]}
              </button>
            )}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
              <button
                onClick={() => updateStatus.mutate('cancelled')}
                disabled={updateStatus.isPending}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
            )}
            <a
              href={`https://wa.me/${order.customer_phone.replace(/\D/g, '')}?text=Hi ${order.customer_name}, regarding your Ojaoba order...`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', statusFilter, search, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search) params.search = search;
      const res = await api.get('/whatsapp/admin/orders', { params });
      return res.data as { orders: Order[]; total: number; totalPages: number };
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage all customer orders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${statusFilter === s ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-50 bg-gray-50/50">
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-6 py-4">Order</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-4">Customer</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-4 hidden md:table-cell">Date</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-4">Total</th>
                <th className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-4 py-4">Status</th>
                <th className="px-4 py-4" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4">
                        <div className="h-4 bg-gray-100 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : data?.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center text-gray-400">
                    <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No orders found</p>
                  </td>
                </tr>
              ) : (
                data?.orders.map(order => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSelectedOrder(order)}>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-gray-500">#{order.id.slice(-8).toUpperCase()}</span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-semibold text-gray-900 text-sm">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_phone}</p>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <p className="text-sm text-gray-600">
                        {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(order.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-gray-900 text-sm">{fmt(order.total_kobo)}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${statusColors[order.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(data?.totalPages || 0) > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-50">
            <p className="text-sm text-gray-500">{data?.total} orders total</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-700">Page {page} of {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages || 1)} className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 hover:bg-gray-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}
