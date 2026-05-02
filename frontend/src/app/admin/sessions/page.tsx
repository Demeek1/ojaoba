'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { MessageCircle, Search, ShoppingCart, Clock, User } from 'lucide-react';

interface Session {
  id: string;
  phone: string;
  name: string | null;
  state: string;
  cart: Array<{ title: string; qty: number; price_kobo: number }>;
  last_activity: string;
  created_at: string;
  message_count: number;
}

const stateColors: Record<string, string> = {
  IDLE: 'bg-gray-100 text-gray-600',
  MAIN_MENU: 'bg-blue-50 text-blue-600',
  CATEGORIES: 'bg-purple-50 text-purple-600',
  PRODUCTS: 'bg-indigo-50 text-indigo-600',
  PRODUCT_DETAIL: 'bg-indigo-50 text-indigo-600',
  CART: 'bg-orange-50 text-orange-600',
  CHECKOUT_NAME: 'bg-yellow-50 text-yellow-600',
  CHECKOUT_ADDRESS: 'bg-yellow-50 text-yellow-600',
  CHECKOUT_CONFIRM: 'bg-amber-50 text-amber-600',
  AWAITING_PAYMENT: 'bg-red-50 text-red-600',
  ORDER_TRACKING: 'bg-green-50 text-green-600',
  SUPPORT: 'bg-gray-50 text-gray-600',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SessionsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-sessions', page],
    queryFn: async () => {
      const res = await api.get('/whatsapp/admin/sessions', { params: { page, limit: 20 } });
      return res.data as { sessions: Session[]; total: number; totalPages: number };
    },
    refetchInterval: 15000,
  });

  const WA = process.env.NEXT_PUBLIC_WA_NUMBER || '';

  const sessions = data?.sessions.filter(s =>
    !search || s.phone.includes(search) || (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-900">WhatsApp Sessions</h1>
        <p className="text-gray-500 text-sm mt-0.5">Active and recent customer conversations</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Sessions list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-5 flex items-start gap-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-full shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-40" />
                  <div className="h-3 bg-gray-100 rounded w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : sessions?.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">No WhatsApp sessions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {sessions?.map(session => {
              const cartItems = session.cart?.length || 0;
              const isActive = Date.now() - new Date(session.last_activity).getTime() < 10 * 60 * 1000;
              return (
                <div key={session.id} className="p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 bg-green-50 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-green-600" />
                    </div>
                    {isActive && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">
                          {session.name || 'Unknown'}
                          {session.name && <span className="text-gray-400 font-normal ml-1.5 text-xs">{session.phone}</span>}
                        </p>
                        {!session.name && <p className="text-xs text-gray-500">{session.phone}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${stateColors[session.state] || 'bg-gray-100 text-gray-600'}`}>
                          {session.state.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock className="w-3 h-3" />
                        {timeAgo(session.last_activity)}
                      </span>
                      {cartItems > 0 && (
                        <span className="flex items-center gap-1 text-xs text-orange-500 font-medium">
                          <ShoppingCart className="w-3 h-3" />
                          {cartItems} item{cartItems !== 1 ? 's' : ''} in cart
                        </span>
                      )}
                      {session.message_count > 0 && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <MessageCircle className="w-3 h-3" />
                          {session.message_count} messages
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <a
                    href={`https://wa.me/${session.phone.replace(/\D/g, '')}?text=Hi ${session.name || ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 p-2 text-green-500 hover:bg-green-50 rounded-xl transition-colors"
                    title="Open in WhatsApp"
                  >
                    <MessageCircle className="w-5 h-5" />
                  </a>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {(data?.totalPages || 0) > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
            <p className="text-sm text-gray-500">{data?.total} sessions total</p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
                Prev
              </button>
              <span className="text-sm text-gray-600">{page} / {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages || 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
