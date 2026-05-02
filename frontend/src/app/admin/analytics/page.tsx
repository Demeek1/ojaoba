'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { BarChart3, TrendingUp, Users, ShoppingCart, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';

interface AnalyticsData {
  daily: Array<{ date: string; sessions: number; orders: number; revenue_kobo: number }>;
  top_products: Array<{ product_id: string; title: string; views: number; cart_adds: number; purchases: number }>;
  funnel: { browsed: number; added_to_cart: number; checked_out: number; paid: number };
  totals: { sessions: number; orders: number; revenue_kobo: number; avg_order_value: number };
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub?: string; icon: any; color: string;
}) {
  const colors: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-600 mt-0.5">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmt(kobo: number) {
  return `₦${(kobo / 100).toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
}

function MiniBar({ value, max, color = 'bg-emerald-500' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-right">{value}</span>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const res = await api.get('/whatsapp/admin/analytics');
      return res.data;
    },
    staleTime: 60000,
  });

  const funnel = data?.funnel;
  const conversionRate = funnel && funnel.browsed > 0
    ? ((funnel.paid / funnel.browsed) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">Analytics</h1>
        <p className="text-gray-500 text-sm mt-0.5">WhatsApp chatbot performance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatCard
          label="Total Sessions"
          value={isLoading ? '—' : (data?.totals.sessions || 0).toLocaleString()}
          sub="Unique WhatsApp users"
          icon={MessageCircle}
          color="emerald"
        />
        <StatCard
          label="Total Orders"
          value={isLoading ? '—' : (data?.totals.orders || 0).toLocaleString()}
          sub={`${conversionRate}% conversion`}
          icon={ShoppingCart}
          color="blue"
        />
        <StatCard
          label="Total Revenue"
          value={isLoading ? '—' : fmt(data?.totals.revenue_kobo || 0)}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          label="Avg Order Value"
          value={isLoading ? '—' : fmt(data?.totals.avg_order_value || 0)}
          icon={BarChart3}
          color="orange"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1">Conversion Funnel</h2>
          <p className="text-sm text-gray-400 mb-6">From first message to payment</p>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="animate-pulse space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-1/2" />
                  <div className="h-2 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : funnel ? (
            <div className="space-y-5">
              {[
                { label: '1. Browsed Products', value: funnel.browsed, color: 'bg-emerald-400' },
                { label: '2. Added to Cart', value: funnel.added_to_cart, color: 'bg-blue-400' },
                { label: '3. Started Checkout', value: funnel.checked_out, color: 'bg-yellow-400' },
                { label: '4. Completed Payment', value: funnel.paid, color: 'bg-green-500' },
              ].map(step => {
                const pct = funnel.browsed > 0 ? Math.round((step.value / funnel.browsed) * 100) : 0;
                return (
                  <div key={step.label}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm font-medium text-gray-700">{step.label}</span>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{step.value.toLocaleString()}</span>
                        <span className="text-xs text-gray-400 ml-2">({pct}%)</span>
                      </div>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-1000 ${step.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-bold text-gray-900 mb-1">Top Products</h2>
          <p className="text-sm text-gray-400 mb-5">By WhatsApp interactions</p>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="animate-pulse flex items-center gap-3">
                  <div className="w-6 h-6 bg-gray-100 rounded" />
                  <div className="flex-1 h-3 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {data?.top_products?.slice(0, 8).map((p, i) => (
                <div key={p.product_id}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 bg-gray-100 rounded-md flex items-center justify-center text-xs font-bold text-gray-500">{i + 1}</span>
                      <span className="text-sm font-medium text-gray-900 truncate max-w-52">{p.title}</span>
                    </div>
                    <span className="text-xs text-gray-400">{p.purchases} sold</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <MiniBar value={p.views} max={data.top_products[0]?.views || 1} color="bg-blue-300" />
                    <MiniBar value={p.cart_adds} max={data.top_products[0]?.views || 1} color="bg-orange-300" />
                    <MiniBar value={p.purchases} max={data.top_products[0]?.views || 1} color="bg-green-400" />
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-xs text-blue-400">👁 {p.views} views</span>
                    <span className="text-xs text-orange-400">🛒 {p.cart_adds} carts</span>
                    <span className="text-xs text-green-500">✓ {p.purchases} bought</span>
                  </div>
                </div>
              ))}
              {(!data?.top_products || data.top_products.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-6">No product activity yet</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Daily Activity */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-bold text-gray-900 mb-1">Daily Activity (Last 14 days)</h2>
        <p className="text-sm text-gray-400 mb-6">Sessions and orders per day</p>
        {isLoading ? (
          <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <div className="overflow-x-auto">
            <div className="flex items-end gap-2 min-w-max h-32">
              {data?.daily?.map(day => {
                const maxSessions = Math.max(...(data.daily?.map(d => d.sessions) || [1]));
                const pct = maxSessions > 0 ? (day.sessions / maxSessions) * 100 : 0;
                return (
                  <div key={day.date} className="flex flex-col items-center gap-1 group cursor-default">
                    <div className="relative">
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-gray-900 text-white text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {day.sessions} sessions, {day.orders} orders
                      </div>
                      <div
                        className="w-8 bg-emerald-400 rounded-t-md transition-all hover:bg-emerald-500"
                        style={{ height: `${Math.max(4, pct * 0.96)}px` }}
                      />
                    </div>
                    <span className="text-xs text-gray-400 rotate-45 origin-left mt-2 ml-1">
                      {new Date(day.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
