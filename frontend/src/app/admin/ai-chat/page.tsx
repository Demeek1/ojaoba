'use client';
import { useState, useEffect } from 'react';
import api, { fmt } from '@/lib/api';
import {
  MessageCircle, Search, Clock, ShoppingCart, RefreshCw,
  Bot, BarChart3, Users, CheckCheck, Phone, Package,
} from 'lucide-react';

interface Session {
  id: string;
  phone: string;
  name: string | null;
  state: string;
  order_count: number;
  cart: any[];
  cart_item_count: number;
  last_activity: string;
  created_at: string;
}

interface SessionsResponse {
  sessions: Session[];
  total: number;
  page: number;
  totalPages: number;
}

function timeAgo(dateStr: string) {
  if (!dateStr) return '—';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function stateLabel(state: string) {
  const map: Record<string, { label: string; color: string }> = {
    IDLE:             { label: 'Idle',         color: 'bg-gray-100 text-gray-600' },
    MAIN_MENU:        { label: 'Main Menu',    color: 'bg-blue-50 text-blue-600' },
    CATEGORIES:       { label: 'Browsing',     color: 'bg-purple-50 text-purple-600' },
    PRODUCTS:         { label: 'Viewing Products', color: 'bg-indigo-50 text-indigo-600' },
    PRODUCT_DETAIL:   { label: 'Product Detail', color: 'bg-indigo-50 text-indigo-600' },
    QTY_SELECT:       { label: 'Choosing Qty', color: 'bg-yellow-50 text-yellow-700' },
    QTY_TYPE:         { label: 'Typing Qty',   color: 'bg-yellow-50 text-yellow-700' },
    SEARCH_INPUT:     { label: 'Searching',    color: 'bg-cyan-50 text-cyan-600' },
    CART:             { label: '🛒 Cart',       color: 'bg-orange-50 text-orange-600' },
    CHECKOUT_NAME:    { label: 'Checkout',     color: 'bg-emerald-50 text-emerald-600' },
    CHECKOUT_ADDRESS: { label: 'Checkout',     color: 'bg-emerald-50 text-emerald-600' },
    CHECKOUT_CONFIRM: { label: 'Confirming',   color: 'bg-emerald-50 text-emerald-700' },
    AWAITING_PAYMENT: { label: '⏳ Payment',   color: 'bg-amber-50 text-amber-700' },
    ORDER_TRACKING:   { label: 'Tracking',     color: 'bg-blue-50 text-blue-600' },
    SUPPORT:          { label: '🆘 Support',   color: 'bg-red-50 text-red-600' },
  };
  return map[state] || { label: state, color: 'bg-gray-100 text-gray-500' };
}

function maskPhone(phone: string) {
  if (phone.length < 7) return phone;
  return phone.slice(0, 4) + '***' + phone.slice(-4);
}

export default function WhatsAppSessionsPage() {
  const [data, setData] = useState<SessionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Session | null>(null);
  const [page, setPage] = useState(1);
  const [activeCount, setActiveCount] = useState(0);

  const fetchSessions = async (p = page) => {
    try {
      const res = await api.get<SessionsResponse>(`/whatsapp/admin/sessions?page=${p}`);
      setData(res.data);
      const now = Date.now();
      const active = res.data.sessions.filter(
        s => s.last_activity && now - new Date(s.last_activity).getTime() < 5 * 60 * 1000
      ).length;
      setActiveCount(active);
    } catch {/* ignore */}
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(page); }, [page]);
  useEffect(() => {
    const iv = setInterval(() => fetchSessions(page), 15000);
    return () => clearInterval(iv);
  }, [page]);

  const sessions = data?.sessions || [];
  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.name || '').toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      s.state.toLowerCase().includes(q)
    );
  });

  const cartTotal = (cart: any[]) =>
    (cart || []).reduce((sum: number, i: any) => sum + (i.priceKobo || 0) * (i.quantity || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 sm:px-6 py-5 border-b border-gray-100 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2">
              <Bot className="w-6 h-6 text-emerald-600" />
              WhatsApp Bot Sessions
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">Live customer activity on the bot</p>
          </div>
          <button
            onClick={() => fetchSessions(page)}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total Sessions', value: data?.total ?? '—', icon: Users, color: 'text-gray-600 bg-gray-50' },
            { label: 'Active Now', value: activeCount, icon: MessageCircle, color: 'text-emerald-600 bg-emerald-50' },
            { label: 'With Items in Cart', value: sessions.filter(s => s.cart_item_count > 0).length, icon: ShoppingCart, color: 'text-orange-500 bg-orange-50' },
            { label: 'Awaiting Payment', value: sessions.filter(s => s.state === 'AWAITING_PAYMENT').length, icon: Clock, color: 'text-amber-600 bg-amber-50' },
          ].map(stat => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl p-3 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-lg font-black text-gray-900 leading-none">{stat.value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: session list */}
        <div className={`${selected ? 'hidden sm:flex' : 'flex'} w-full sm:w-80 lg:w-96 border-r border-gray-100 bg-white flex-col shrink-0 overflow-hidden`}>
          <div className="p-3 border-b border-gray-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or phone..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 flex items-start gap-3 animate-pulse">
                  <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-32" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400">
                <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No sessions found</p>
              </div>
            ) : (
              filtered.map(session => {
                const isActive = session.last_activity &&
                  Date.now() - new Date(session.last_activity).getTime() < 5 * 60 * 1000;
                const isSelected = selected?.id === session.id;
                const st = stateLabel(session.state);
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelected(session)}
                    className={`w-full p-4 flex items-start gap-3 text-left transition-colors ${
                      isSelected ? 'bg-emerald-50 border-l-2 border-emerald-500' : 'hover:bg-gray-50/70'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        {(session.name || session.phone).slice(0, 2).toUpperCase()}
                      </div>
                      {isActive && (
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {session.name || 'Customer'}
                        </p>
                        <span className="text-xs text-gray-400 shrink-0">{timeAgo(session.last_activity)}</span>
                      </div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {maskPhone(session.phone)}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>
                          {st.label}
                        </span>
                        {session.cart_item_count > 0 && (
                          <span className="text-xs text-orange-600 bg-orange-50 font-semibold px-2 py-0.5 rounded-full">
                            🛒 {session.cart_item_count} items
                          </span>
                        )}
                        {session.order_count > 0 && (
                          <span className="text-xs text-blue-600 bg-blue-50 font-semibold px-2 py-0.5 rounded-full">
                            {session.order_count} order{session.order_count > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="border-t border-gray-100 p-3 flex items-center justify-between bg-white">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                ← Prev
              </button>
              <span className="text-xs text-gray-500">Page {page} of {data.totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gray-100 text-gray-600 disabled:opacity-40 hover:bg-gray-200 transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right: session detail */}
        <div className={`${selected ? 'flex' : 'hidden sm:flex'} flex-1 flex-col bg-gray-50 overflow-hidden`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
              <Bot className="w-14 h-14 opacity-15" />
              <p className="text-sm font-medium">Select a session to view details</p>
            </div>
          ) : (
            <>
              {/* Detail header */}
              <div className="bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelected(null)}
                    className="sm:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"
                  >
                    ←
                  </button>
                  <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-sm font-bold">
                    {(selected.name || selected.phone).slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">
                      {selected.name || 'Customer'}
                    </p>
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {selected.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stateLabel(selected.state).color}`}>
                    {stateLabel(selected.state).label}
                  </span>
                  <span className="text-xs text-gray-400">Last: {timeAgo(selected.last_activity)}</span>
                </div>
              </div>

              {/* Session details */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Info cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Orders Placed</p>
                    <p className="text-2xl font-black text-gray-900">{selected.order_count}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4">
                    <p className="text-xs text-gray-500 mb-1">Cart Items</p>
                    <p className="text-2xl font-black text-gray-900">{selected.cart_item_count}</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 p-4 col-span-2 sm:col-span-1">
                    <p className="text-xs text-gray-500 mb-1">Customer Since</p>
                    <p className="text-sm font-bold text-gray-900">
                      {new Date(selected.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Current Cart */}
                {selected.cart && selected.cart.length > 0 && (
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-orange-500" />
                      <h3 className="font-semibold text-sm text-gray-900">Items in Cart</h3>
                      <span className="ml-auto text-xs text-gray-400">
                        Cart total: {fmt(cartTotal(selected.cart))}
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {selected.cart.map((item: any, i: number) => (
                        <div key={i} className="px-4 py-3 flex items-center gap-3">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} alt={item.title} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">{fmt(item.priceKobo)} × {item.quantity}</p>
                          </div>
                          <p className="text-sm font-bold text-gray-900 shrink-0">
                            {fmt(item.priceKobo * item.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Empty cart note */}
                {(!selected.cart || selected.cart.length === 0) && (
                  <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
                    <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    <p className="text-sm text-gray-400">Cart is empty</p>
                  </div>
                )}

                {/* Customer Orders */}
                <CustomerOrders phone={selected.phone} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function CustomerOrders({ phone }: { phone: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/whatsapp/admin/orders?search=${encodeURIComponent(phone)}&limit=5`)
      .then(r => setOrders(r.data.orders || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [phone]);

  const statusColor: Record<string, string> = {
    paid:             'bg-emerald-50 text-emerald-700',
    delivered:        'bg-emerald-50 text-emerald-700',
    processing:       'bg-blue-50 text-blue-700',
    out_for_delivery: 'bg-purple-50 text-purple-700',
    pending_payment:  'bg-yellow-50 text-yellow-700',
    cancelled:        'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
        <Package className="w-4 h-4 text-blue-500" />
        <h3 className="font-semibold text-sm text-gray-900">Order History</h3>
      </div>
      {loading ? (
        <div className="p-4 space-y-2">
          {[1,2].map(i => <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-400">No orders yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {orders.map((order: any) => (
            <div key={order.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  #{order.id.slice(-6).toUpperCase()}
                </p>
                <p className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })}
                </p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${statusColor[order.status] || 'bg-gray-50 text-gray-500'}`}>
                {order.status?.replace(/_/g, ' ')}
              </span>
              <p className="text-sm font-bold text-gray-900 shrink-0">
                {fmt(order.total_kobo)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
