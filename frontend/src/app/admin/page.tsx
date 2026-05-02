'use client';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api, { fmt } from '@/lib/api';
import {
  ShoppingCart, Users, Package, TrendingUp, ArrowRight,
  MessageCircle, CheckCircle, Clock, XCircle, RefreshCw
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

const statusStyles: Record<string, string> = {
  paid: 'bg-green-50 text-green-700',
  pending: 'bg-yellow-50 text-yellow-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-blue-50 text-blue-700',
  shipped: 'bg-purple-50 text-purple-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === 'delivered' || status === 'paid') return <CheckCircle className="w-3.5 h-3.5" />;
  if (status === 'cancelled') return <XCircle className="w-3.5 h-3.5" />;
  return <Clock className="w-3.5 h-3.5" />;
};

export default function AdminOverviewPage() {
  const { data, isLoading, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/admin/dashboard');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const stats = [
    {
      label: 'Total Orders',
      value: isLoading ? '—' : data?.orders.total.toLocaleString(),
      sub: `${data?.orders.today || 0} today`,
      icon: ShoppingCart,
      color: 'emerald',
      href: '/admin/orders',
    },
    {
      label: 'Total Revenue',
      value: isLoading ? '—' : fmt(data?.orders.revenue_kobo || 0),
      sub: `${fmt(data?.orders.today_revenue || 0)} today`,
      icon: TrendingUp,
      color: 'blue',
      href: '/admin/orders',
    },
    {
      label: 'WhatsApp Sessions',
      value: isLoading ? '—' : data?.sessions.total.toLocaleString(),
      sub: `${data?.sessions.active || 0} active now`,
      icon: MessageCircle,
      color: 'green',
      href: '/admin/sessions',
    },
    {
      label: 'Products',
      value: isLoading ? '—' : data?.products.total.toLocaleString(),
      sub: `${data?.products.out_of_stock || 0} out of stock`,
      icon: Package,
      color: 'orange',
      href: '/admin/products',
    },
  ];

  const colorMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  const funnel = data?.funnel;
  const funnelSteps = funnel ? [
    { label: 'Browsed', value: funnel.browsed, pct: 100 },
    { label: 'Added to Cart', value: funnel.added_to_cart, pct: funnel.browsed > 0 ? Math.round((funnel.added_to_cart / funnel.browsed) * 100) : 0 },
    { label: 'Checked Out', value: funnel.checked_out, pct: funnel.browsed > 0 ? Math.round((funnel.checked_out / funnel.browsed) * 100) : 0 },
    { label: 'Paid', value: funnel.paid, pct: funnel.browsed > 0 ? Math.round((funnel.paid / funnel.browsed) * 100) : 0 },
  ] : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-500 text-sm mt-0.5">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {stats.map(stat => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${colorMap[stat.color]}`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-black text-gray-900 mb-0.5">{stat.value}</p>
              <p className="text-xs text-gray-400 font-medium">{stat.sub}</p>
              <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
            </Link>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Recent Orders</h2>
            <Link href="/admin/orders" className="text-sm text-emerald-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-6 py-4 flex items-center gap-4 animate-pulse">
                  <div className="w-8 h-8 bg-gray-100 rounded-full" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-40" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                  <div className="h-4 bg-gray-100 rounded w-20" />
                </div>
              ))
            ) : data?.recent_orders.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No orders yet</p>
              </div>
            ) : (
              data?.recent_orders.map(order => (
                <Link key={order.id} href={`/admin/orders/${order.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="w-9 h-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 text-xs font-bold shrink-0">
                    {order.customer_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{order.customer_name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-900 text-sm">{fmt(order.total_kobo)}</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${statusStyles[order.status] || 'bg-gray-50 text-gray-600'}`}>
                      <StatusIcon status={order.status} />
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-50">
            <h2 className="font-bold text-gray-900">Conversion Funnel</h2>
            <p className="text-xs text-gray-400 mt-0.5">WhatsApp to purchase</p>
          </div>
          <div className="p-6 space-y-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-1.5">
                  <div className="h-3 bg-gray-100 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded" />
                </div>
              ))
            ) : (
              funnelSteps.map((step, i) => (
                <div key={step.label}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-medium text-gray-700">{step.label}</span>
                    <span className="text-sm font-bold text-gray-900">{step.value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${step.pct}%`,
                        backgroundColor: ['#059669', '#3b82f6', '#f59e0b', '#10b981'][i],
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{step.pct}% conversion</p>
                </div>
              ))
            )}
          </div>

          <div className="px-6 pb-6">
            <Link
              href="/admin/analytics"
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-emerald-600 border border-emerald-200 py-2.5 rounded-xl hover:bg-emerald-50 transition-colors"
            >
              Full Analytics <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
