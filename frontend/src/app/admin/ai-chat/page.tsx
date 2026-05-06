'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import api, { fmt } from '@/lib/api';
import {
  Search, Phone, Package, ShoppingCart, RefreshCw,
  Bot, Users, Clock, Send, MessageCircle, ChevronLeft,
  CheckCheck, User,
} from 'lucide-react';

interface WaMessage {
  id: string;
  direction: 'inbound' | 'outbound';
  content: string;
  msg_type: string;
  created_at: string;
}

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

function timeAgo(d: string) {
  if (!d) return '—';
  const diff = Date.now() - new Date(d).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function stateLabel(state: string) {
  const map: Record<string, { label: string; color: string }> = {
    IDLE:             { label: 'Idle',          color: 'bg-gray-100 text-gray-500' },
    MAIN_MENU:        { label: 'Menu',           color: 'bg-blue-50 text-blue-600' },
    CATEGORIES:       { label: 'Browsing',       color: 'bg-purple-50 text-purple-600' },
    PRODUCTS:         { label: 'Products',       color: 'bg-indigo-50 text-indigo-600' },
    PRODUCT_DETAIL:   { label: 'Product',        color: 'bg-indigo-50 text-indigo-600' },
    SEARCH_INPUT:     { label: 'Searching',      color: 'bg-cyan-50 text-cyan-600' },
    QTY_SELECT:       { label: 'Qty',            color: 'bg-yellow-50 text-yellow-700' },
    CART:             { label: '🛒 Cart',         color: 'bg-orange-50 text-orange-600' },
    CHECKOUT_NAME:    { label: 'Checkout',       color: 'bg-emerald-50 text-emerald-600' },
    CHECKOUT_ADDRESS: { label: 'Checkout',       color: 'bg-emerald-50 text-emerald-600' },
    CHECKOUT_CONFIRM: { label: 'Confirming',     color: 'bg-emerald-100 text-emerald-700' },
    AWAITING_PAYMENT: { label: '⏳ Payment',     color: 'bg-amber-50 text-amber-700' },
    ORDER_TRACKING:   { label: 'Tracking',       color: 'bg-blue-50 text-blue-600' },
    ITEM_NOTE_PROMPT: { label: 'Note Prompt',    color: 'bg-yellow-50 text-yellow-600' },
    SUPPORT:          { label: '🆘 Support',     color: 'bg-red-50 text-red-600' },
  };
  return map[state] || { label: state, color: 'bg-gray-100 text-gray-500' };
}

export default function BotSessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Session | null>(null);
  const [messages, setMessages] = useState<WaMessage[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'chat' | 'info'>('chat');
  const [activeCount, setActiveCount] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await api.get('/whatsapp/admin/sessions?page=1');
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
      const now = Date.now();
      setActiveCount((res.data.sessions || []).filter(
        (s: Session) => s.last_activity && now - new Date(s.last_activity).getTime() < 5 * 60 * 1000
      ).length);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);

  const fetchMessages = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/admin/sessions/${phone}/messages`);
      setMessages(res.data.messages || []);
    } catch { /* ignore */ }
  }, []);

  const fetchOrders = useCallback(async (phone: string) => {
    try {
      const res = await api.get(`/whatsapp/admin/orders?search=${encodeURIComponent(phone)}`);
      setOrders(res.data.orders || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchSessions();
    const iv = setInterval(fetchSessions, 15000);
    return () => clearInterval(iv);
  }, [fetchSessions]);

  useEffect(() => {
    if (!selected) return;
    fetchMessages(selected.phone);
    fetchOrders(selected.phone);
    const iv = setInterval(() => fetchMessages(selected.phone), 4000);
    return () => clearInterval(iv);
  }, [selected, fetchMessages, fetchOrders]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const selectSession = (s: Session) => {
    setSelected(s);
    setMessages([]);
    setOrders([]);
    setView('chat');
  };

  const sendReply = async () => {
    if (!reply.trim() || !selected || sending) return;
    setSending(true);
    const text = reply.trim();
    setReply('');
    try {
      await api.post(`/whatsapp/admin/sessions/${selected.phone}/reply`, { message: text });
      await fetchMessages(selected.phone);
    } catch { /* ignore */ }
    setSending(false);
    inputRef.current?.focus();
  };

  const filtered = sessions.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (s.name || '').toLowerCase().includes(q) || s.phone.includes(q);
  });

  const cartTotal = (cart: any[]) =>
    (cart || []).reduce((sum: number, i: any) => sum + (i.priceKobo || 0) * (i.quantity || 0), 0);

  const statusColor: Record<string, string> = {
    paid:             'bg-emerald-50 text-emerald-700',
    delivered:        'bg-emerald-50 text-emerald-700',
    processing:       'bg-blue-50 text-blue-700',
    out_for_delivery: 'bg-purple-50 text-purple-700',
    pending_payment:  'bg-yellow-50 text-yellow-700',
    cancelled:        'bg-red-50 text-red-600',
  };

  // ── Panels ─────────────────────────────────────────────────────────────────

  const SessionList = (
    <div className={`${selected ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 flex-col bg-white border-r border-gray-100 shrink-0 overflow-hidden`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h1 className="font-black text-gray-900 flex items-center gap-2 text-base">
            <Bot className="w-5 h-5 text-emerald-600" /> Bot Sessions
          </h1>
          <button onClick={fetchSessions} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        {/* Mini stats */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Total', value: total, color: 'text-gray-700' },
            { label: 'Active', value: activeCount, color: 'text-emerald-600' },
            { label: 'In Cart', value: sessions.filter(s => s.cart_item_count > 0).length, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
              <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search name or phone..."
            className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Session rows */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {loading ? Array.from({length:6}).map((_,i) => (
          <div key={i} className="p-3 flex gap-3 animate-pulse">
            <div className="w-9 h-9 bg-gray-100 rounded-full shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 bg-gray-100 rounded w-24" />
              <div className="h-2.5 bg-gray-100 rounded w-16" />
            </div>
          </div>
        )) : filtered.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-xs">No sessions found</p>
          </div>
        ) : filtered.map(sess => {
          const isActive = sess.last_activity && Date.now() - new Date(sess.last_activity).getTime() < 5 * 60 * 1000;
          const isSel = selected?.id === sess.id;
          const st = stateLabel(sess.state);
          return (
            <button key={sess.id} onClick={() => selectSession(sess)}
              className={`w-full p-3 flex items-start gap-3 text-left transition-colors ${isSel ? 'bg-emerald-50 border-l-2 border-emerald-500' : 'hover:bg-gray-50'}`}
            >
              <div className="relative shrink-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${isSel ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                  {(sess.name || sess.phone).slice(0,2).toUpperCase()}
                </div>
                {isActive && <span className="absolute bottom-0 right-0 w-2 h-2 bg-green-400 rounded-full border border-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-semibold text-gray-900 truncate">{sess.name || 'Customer'}</p>
                  <span className="text-xs text-gray-400 shrink-0">{timeAgo(sess.last_activity)}</span>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                  <Phone className="w-2.5 h-2.5" />{sess.phone.slice(0,4)}***{sess.phone.slice(-4)}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                  {sess.cart_item_count > 0 && <span className="text-xs text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-full">🛒{sess.cart_item_count}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );

  // ── Chat thread ─────────────────────────────────────────────────────────────
  const ChatPanel = selected && (
    <div className={`${view === 'chat' ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-hidden`}>
      {/* Chat header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => setSelected(null)} className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">
          {(selected.name || selected.phone).slice(0,2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{selected.name || 'Customer'}</p>
          <p className="text-xs text-gray-400 flex items-center gap-1"><Phone className="w-3 h-3" />{selected.phone}</p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${stateLabel(selected.state).color}`}>
          {stateLabel(selected.state).label}
        </span>
        {/* Toggle to info panel (mobile) */}
        <button onClick={() => setView(v => v === 'chat' ? 'info' : 'chat')}
          className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-20" />
              <p className="text-sm">No messages yet for this session</p>
              <p className="text-xs mt-1 text-gray-300">Messages will appear here once the customer texts the bot</p>
            </div>
          </div>
        ) : (
          messages.map(msg => {
            const isIn = msg.direction === 'inbound';
            return (
              <div key={msg.id} className={`flex items-end gap-2 ${isIn ? '' : 'flex-row-reverse'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${isIn ? 'bg-gray-200' : 'bg-emerald-600'}`}>
                  {isIn ? <User className="w-3 h-3 text-gray-500" /> : <Bot className="w-3 h-3 text-white" />}
                </div>
                <div className={`max-w-[72%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  isIn
                    ? 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                    : 'bg-emerald-600 text-white rounded-br-sm'
                }`}>
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <p className={`text-xs mt-0.5 ${isIn ? 'text-gray-400' : 'text-emerald-200'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}
                    {!isIn && <CheckCheck className="w-3 h-3 inline ml-1" />}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply bar */}
      <div className="bg-white border-t border-gray-100 p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendReply(); } }}
            placeholder="Type a reply to customer... (Enter to send)"
            rows={2}
            className="flex-1 resize-none border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center hover:bg-emerald-700 transition-colors disabled:opacity-40 shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">Reply goes directly to customer's WhatsApp</p>
      </div>
    </div>
  );

  // ── Customer info panel ─────────────────────────────────────────────────────
  const InfoPanel = selected && (
    <div className={`${view === 'info' || !selected ? 'flex' : 'hidden md:flex'} w-full md:w-72 lg:w-80 flex-col bg-white border-l border-gray-100 shrink-0 overflow-hidden`}>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Back button on mobile */}
        <button onClick={() => setView('chat')} className="md:hidden flex items-center gap-1 text-xs text-gray-500 mb-2">
          <ChevronLeft className="w-3.5 h-3.5" /> Back to chat
        </button>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Orders', value: selected.order_count, color: 'text-blue-600' },
            { label: 'Cart Items', value: selected.cart_item_count, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500">Customer Since</p>
          <p className="text-sm font-bold text-gray-800">{new Date(selected.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}</p>
        </div>

        {/* Cart */}
        {selected.cart?.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-50 flex items-center gap-2">
              <ShoppingCart className="w-3.5 h-3.5 text-orange-500" />
              <p className="text-xs font-semibold text-gray-800">Items in Cart</p>
              <span className="ml-auto text-xs text-gray-400">{fmt(cartTotal(selected.cart))}</span>
            </div>
            {selected.cart.map((item: any, i: number) => (
              <div key={i} className="px-3 py-2.5 flex items-center gap-2 border-b border-gray-50 last:border-0">
                {item.imageUrl
                  ? <img src={item.imageUrl} alt={item.title} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                  : <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0"><Package className="w-3.5 h-3.5 text-gray-400" /></div>
                }
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{item.title}</p>
                  <p className="text-xs text-gray-400">{fmt(item.priceKobo)} × {item.quantity}</p>
                  {item.note && <p className="text-xs text-amber-600 truncate">📝 {item.note}</p>}
                </div>
                <p className="text-xs font-bold text-gray-900 shrink-0">{fmt(item.priceKobo * item.quantity)}</p>
              </div>
            ))}
          </div>
        )}

        {/* Orders */}
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-50 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-blue-500" />
            <p className="text-xs font-semibold text-gray-800">Order History</p>
          </div>
          {orders.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">No orders yet</p>
          ) : orders.map((o: any) => (
            <div key={o.id} className="px-3 py-2.5 flex items-center gap-2 border-b border-gray-50 last:border-0">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800">#{o.id.slice(-6).toUpperCase()}</p>
                <p className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}</p>
              </div>
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${statusColor[o.status] || 'bg-gray-50 text-gray-500'}`}>
                {o.status?.replace(/_/g,' ')}
              </span>
              <p className="text-xs font-bold text-gray-900 shrink-0">{fmt(o.total_kobo)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-full overflow-hidden">
      {SessionList}

      {/* Empty state */}
      {!selected && (
        <div className="hidden md:flex flex-1 items-center justify-center text-gray-400 bg-gray-50">
          <div className="text-center">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Select a session to view the chat</p>
          </div>
        </div>
      )}

      {ChatPanel}
      {InfoPanel}
    </div>
  );
}
