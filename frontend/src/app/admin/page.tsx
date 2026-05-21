'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api, { fmt } from '@/lib/api';
import {
  ShoppingCart, Package, TrendingUp, ArrowRight,
  MessageCircle, CheckCircle, Clock, XCircle, RefreshCw,
} from 'lucide-react';

interface DashboardData {
  orders: { total: number; revenue_kobo: number; today: number; today_revenue: number };
  sessions: { total: number; active: number };
  products: { total: number; out_of_stock: number };
  recent_orders: Array<{
    id: string; customer_name: string; total_kobo: number; status: string; created_at: string;
  }>;
  funnel: { browsed: number; added_to_cart: number; checked_out: number; paid: number };
}

const statusStyles: Record<string, { bg: string; text: string }> = {
  paid:        { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  delivered:   { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  confirmed:   { bg: 'bg-blue-50',    text: 'text-blue-700' },
  processing:  { bg: 'bg-blue-50',    text: 'text-blue-700' },
  shipped:     { bg: 'bg-purple-50',  text: 'text-purple-700' },
  pending:     { bg: 'bg-yellow-50',  text: 'text-yellow-700' },
  cancelled:   { bg: 'bg-red-50',     text: 'text-red-600' },
};

function StatusBadge({ status }: { status: string }) {
  const s = statusStyles[status] || { bg: 'bg-gray-50', text: 'text-gray-600' };
  const Icon = status === 'delivered' || status === 'paid' ? CheckCircle
    : status === 'cancelled' ? XCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" />{status}
    </span>
  );
}

function timeLabel(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' }) + ' at ' +
    d.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' });
}

export default function AdminOverviewPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => (await api.get('/whatsapp/admin/dashboard')).data,
    refetchInterval: 30000,
  });

  const funnel = data?.funnel;
  const funnelSteps = funnel ? [
    { label: 'Browsed',       value: funnel.browsed,        pct: 100,   color: '#059669' },
    { label: 'Added to Cart', value: funnel.added_to_cart,  pct: funnel.browsed > 0 ? Math.round(funnel.added_to_cart / funnel.browsed * 100) : 0, color: '#3b82f6' },
    { label: 'Checked Out',   value: funnel.checked_out,    pct: funnel.browsed > 0 ? Math.round(funnel.checked_out  / funnel.browsed * 100) : 0, color: '#f59e0b' },
    { label: 'Paid',          value: funnel.paid,            pct: funnel.browsed > 0 ? Math.round(funnel.paid         / funnel.browsed * 100) : 0, color: '#10b981' },
  ] : [];

  return (
    <div className="min-h-full bg-gray-50">
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-black text-gray-900 leading-tight">Dashboard Overview</h1>
          <p className="text-xs text-gray-400 mt-0.5">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 border border-gray-200 bg-white px-3 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="px-4 sm:px-6 py-4 space-y-4 max-w-7xl mx-auto">

        {/* Stats — 2 col on mobile, 4 col on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: 'Total Orders', href: '/admin/orders',
              value: isLoading ? '—' : (data?.orders?.total ?? 0).toLocaleString(),
              sub: `${data?.orders?.today ?? 0} today`,
              icon: ShoppingCart, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600',
              valueBg: 'from-emerald-500 to-emerald-600',
            },
            {
              label: 'Total Revenue', href: '/admin/orders',
              value: isLoading ? '—' : fmt(data?.orders?.revenue_kobo ?? 0),
              sub: `${fmt(data?.orders?.today_revenue ?? 0)} today`,
              icon: TrendingUp, iconBg: 'bg-blue-50', iconColor: 'text-blue-600',
              valueBg: 'from-blue-500 to-blue-600',
            },
            {
              label: 'WA Sessions', href: '/admin/sessions',
              value: isLoading ? '—' : (data?.sessions?.total ?? 0).toLocaleString(),
              sub: `${data?.sessions?.active ?? 0} active now`,
              icon: MessageCircle, iconBg: 'bg-green-50', iconColor: 'text-green-600',
              valueBg: 'from-green-500 to-green-600',
            },
            {
              label: 'Products', href: '/admin/products',
              value: isLoading ? '—' : (data?.products?.total ?? 0).toLocaleString(),
              sub: `${data?.products?.out_of_stock ?? 0} out of stock`,
              icon: Package, iconBg: 'bg-orange-50', iconColor: 'text-orange-500',
              valueBg: 'from-orange-400 to-orange-500',
            },
          ].map(s => {
            const Icon = s.icon;
            return (
              <Link
                key={s.label}
                href={s.href}
                className="bg-white rounded-2xl p-4 border border-gray-100 active:scale-95 transition-transform"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${s.iconBg}`}>
                  <Icon className={`w-4 h-4 ${s.iconColor}`} />
                </div>
                <p className={`text-xl sm:text-2xl font-black text-gray-900 leading-none mb-1 ${isLoading ? 'animate-pulse' : ''}`}>
                  {s.value}
                </p>
                <p className="text-xs text-gray-400 leading-tight">{s.sub}</p>
                <p className="text-xs font-semibold text-gray-600 mt-1.5">{s.label}</p>
              </Link>
            );
          })}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-50">
            <h2 className="font-bold text-gray-900 text-sm sm:text-base">Recent Orders</h2>
            <Link href="/admin/orders" className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {isLoading ? (
            <div className="divide-y divide-gray-50">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-4 sm:px-6 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-8 bg-gray-100 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-gray-100 rounded w-32" />
                    <div className="h-2.5 bg-gray-100 rounded w-20" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-16 shrink-0" />
                </div>
              ))}
            </div>
          ) : !data?.recent_orders?.length ? (
            <div className="py-12 text-center text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No orders yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recent_orders.map(order => (
                <Link
                  key={order.id}
                  href={`/admin/orders`}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                    {order.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeLabel(order.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="font-bold text-gray-900 text-sm">{fmt(order.total_kobo)}</p>
                    <StatusBadge status={order.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-gray-50">
            <div>
              <h2 className="font-bold text-gray-900 text-sm sm:text-base">Conversion Funnel</h2>
              <p className="text-xs text-gray-400 mt-0.5">Browse to purchase (all channels)</p>
            </div>
            <Link href="/admin/analytics" className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
              Analytics <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="px-4 sm:px-6 py-4 space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="flex justify-between">
                    <div className="h-3 bg-gray-100 rounded w-24" />
                    <div className="h-3 bg-gray-100 rounded w-12" />
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full" />
                </div>
              ))
            ) : (
              funnelSteps.map(step => (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-gray-600">{step.label}</span>
                    <span className="text-xs font-bold text-gray-900">{step.value.toLocaleString()} · {step.pct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${step.pct}%`, backgroundColor: step.color }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
