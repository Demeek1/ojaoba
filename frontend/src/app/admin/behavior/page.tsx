'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Activity, Eye, ShoppingCart, TrendingUp, Users,
  Search, MessageCircle, Smartphone, Monitor,
} from 'lucide-react';

const PURPLE = '#2D0A4E';
const GOLD = '#F59E0B';
const GREEN = '#16A34A';

interface Behavior {
  days: number;
  funnel: {
    visitors: number; productViews: number; addToCart: number; checkoutStart: number; purchases: number;
    viewToCartRate: number; cartToCheckoutRate: number; checkoutToPurchaseRate: number; overallConversion: number;
  };
  topViewed: { product_id: string; title: string | null; image_url: string | null; views: number }[];
  topSearches: { term: string; count: number }[];
  daily: { day: string; views: number; adds: number; checkouts: number; purchases: number; visitors: number }[];
  ai: { messages: number; conversations: number };
  devices: { device: string; sessions: number }[];
}

export default function BehaviorPage() {
  const [data, setData] = useState<Behavior | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  const load = (d: number) => {
    setLoading(true);
    api.get('/admin/behavior', { params: { days: d } })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.error || 'Failed to load insights'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(days); }, [days]);

  const maxViews = Math.max(1, ...(data?.daily.map((d) => d.views) || [1]));

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: PURPLE }}>
            <Activity className="w-6 h-6" /> Customer Insights
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">How shoppers browse, search, and convert across the store and AI assistant.</p>
        </div>
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: 'rgba(45,10,78,0.06)' }}>
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setDays(d)} className="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all"
              style={days === d ? { background: PURPLE, color: 'white' } : { color: '#6B7280' }}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading || !data ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: GOLD }} /></div>
      ) : (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Kpi icon={Users} label="Visitors" value={data.funnel.visitors.toLocaleString()} color={PURPLE} />
            <Kpi icon={Eye} label="Product views" value={data.funnel.productViews.toLocaleString()} color="#7C3AED" />
            <Kpi icon={ShoppingCart} label="Add to cart" value={data.funnel.addToCart.toLocaleString()} color={GOLD} />
            <Kpi icon={TrendingUp} label="Conversion" value={`${data.funnel.overallConversion}%`} color={GREEN} />
          </div>

          {/* Funnel */}
          <Card title="Conversion funnel" icon={TrendingUp}>
            <div className="space-y-2.5 mt-2">
              <FunnelRow label="Product views" value={data.funnel.productViews} pct={100} color="#7C3AED" />
              <FunnelRow label="Added to cart" value={data.funnel.addToCart} pct={data.funnel.viewToCartRate} color={GOLD} note={`${data.funnel.viewToCartRate}% of views`} />
              <FunnelRow label="Started checkout" value={data.funnel.checkoutStart} pct={data.funnel.viewToCartRate ? (data.funnel.checkoutStart / Math.max(1, data.funnel.productViews) * 100) : 0} color="#0EA5E9" note={`${data.funnel.cartToCheckoutRate}% of carts`} />
              <FunnelRow label="Purchased" value={data.funnel.purchases} pct={data.funnel.overallConversion} color={GREEN} note={`${data.funnel.checkoutToPurchaseRate}% of checkouts`} />
            </div>
          </Card>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Daily activity */}
            <Card title="Daily activity" icon={Activity}>
              {data.daily.length === 0 ? <Empty text="No activity yet" /> : (
                <div className="flex items-end gap-1 h-36 mt-3">
                  {data.daily.slice(-30).map((d) => (
                    <div key={d.day} className="flex-1 h-full flex flex-col justify-end group relative" title={`${d.day}: ${d.views} views, ${d.purchases} purchases`}>
                      <div className="rounded-t" style={{ height: `${(d.views / maxViews) * 100}%`, background: 'linear-gradient(to top,#7C3AED,#A78BFA)', minHeight: d.views ? 3 : 0 }} />
                      <div className="rounded-b" style={{ height: `${(d.purchases / maxViews) * 100}%`, background: GREEN, minHeight: d.purchases ? 2 : 0 }} />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-4 mt-3 text-[11px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: '#7C3AED' }} /> Views</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: GREEN }} /> Purchases</span>
              </div>
            </Card>

            {/* AI engagement + devices */}
            <Card title="AI assistant & devices" icon={MessageCircle}>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Mini label="AI conversations" value={data.ai.conversations.toLocaleString()} icon={MessageCircle} />
                <Mini label="AI messages" value={data.ai.messages.toLocaleString()} icon={MessageCircle} />
              </div>
              <div className="mt-4 space-y-2">
                {data.devices.map((dv) => {
                  const total = data.devices.reduce((s, x) => s + x.sessions, 0) || 1;
                  const Icon = dv.device === 'mobile' ? Smartphone : Monitor;
                  return (
                    <div key={dv.device} className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="text-xs text-gray-600 capitalize w-16">{dv.device}</span>
                      <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${(dv.sessions / total) * 100}%`, background: PURPLE }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 w-10 text-right">{Math.round((dv.sessions / total) * 100)}%</span>
                    </div>
                  );
                })}
                {!data.devices.length && <Empty text="No device data yet" />}
              </div>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-4">
            {/* Top viewed */}
            <Card title="Most-viewed products" icon={Eye}>
              {!data.topViewed.length ? <Empty text="No product views yet" /> : (
                <div className="space-y-2 mt-2">
                  {data.topViewed.map((p, i) => (
                    <div key={p.product_id} className="flex items-center gap-3">
                      <span className="text-xs font-black w-5 text-center" style={{ color: GOLD }}>{i + 1}</span>
                      {p.image_url
                        ? <img src={p.image_url} alt="" className="w-9 h-9 rounded-lg object-cover" />
                        : <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(45,10,78,0.08)' }}>🛒</div>}
                      <span className="flex-1 text-sm text-gray-700 truncate">{p.title || 'Unknown product'}</span>
                      <span className="text-xs font-bold text-gray-500">{p.views} views</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Top searches */}
            <Card title="What customers search for" icon={Search}>
              {!data.topSearches.length ? <Empty text="No searches yet" /> : (
                <div className="flex flex-wrap gap-2 mt-3">
                  {data.topSearches.map((s) => (
                    <span key={s.term} className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5" style={{ background: 'rgba(245,158,11,0.1)', color: '#B45309' }}>
                      {s.term} <span className="text-xs font-bold opacity-70">{s.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5" style={{ background: `${color}15` }}>
        <Icon className="w-4.5 h-4.5" style={{ color }} />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}
function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <h3 className="text-sm font-black flex items-center gap-2" style={{ color: PURPLE }}><Icon className="w-4 h-4" /> {title}</h3>
      {children}
    </div>
  );
}
function FunnelRow({ label, value, pct, color, note }: { label: string; value: number; pct: number; color: string; note?: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value.toLocaleString()}{note && <span className="text-gray-400 font-normal"> · {note}</span>}</span>
      </div>
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: color }} />
      </div>
    </div>
  );
}
function Mini({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="rounded-xl p-3" style={{ background: 'rgba(45,10,78,0.05)' }}>
      <Icon className="w-4 h-4 mb-1.5" style={{ color: PURPLE }} />
      <p className="text-xl font-black text-gray-900">{value}</p>
      <p className="text-[11px] text-gray-400">{label}</p>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="text-sm text-gray-400 text-center py-6">{text}</p>;
}
