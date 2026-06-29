'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Crown, Send, Plus, Check, ShoppingCart, Sparkles, MessageSquarePlus,
  Menu, X, Trash2, Store,
} from 'lucide-react';
import api, { fmt } from '@/lib/api';
import { loadCart, saveCart, CartItem } from '@/lib/cart';
import { track, getTrackSessionId } from '@/lib/track';

/* ── Brand ── */
const PURPLE = '#2D0A4E';
const PURPLE_DEEP = '#1E0735';
const PURPLE_NIGHT = '#170528';
const GOLD = '#F59E0B';
const GOLD_DK = '#D97706';
const GREEN = '#22C55E';

const STORE_URL = process.env.NEXT_PUBLIC_STORE_URL || '';

/* ── Types & storage ── */
interface Card { id: string; title: string; price_kobo: number; image_url: string | null; category: string; description?: string; }
interface Msg { role: 'user' | 'assistant'; content: string; products?: Card[]; chips?: string[]; }
interface Conversation { id: string; title: string; messages: Msg[]; updatedAt: number; }

const STORE_KEY = 'oja_assistant_chats_v1';
function loadChats(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch { return []; }
}
function saveChats(c: Conversation[]) { try { localStorage.setItem(STORE_KEY, JSON.stringify(c.slice(0, 50))); } catch {} }
function uid() { return crypto?.randomUUID?.() || `c_${Date.now()}_${Math.random().toString(36).slice(2)}`; }

const SUGGESTIONS = [
  { emoji: '🍲', label: 'Plan a meal', prompt: 'Help me plan a Nigerian dinner for 4 people and add the ingredients to my cart' },
  { emoji: '🛒', label: 'Restock my kitchen', prompt: 'I need to restock my kitchen essentials — rice, oil, seasoning and more' },
  { emoji: '🔥', label: "What's popular?", prompt: 'What are your most popular items right now?' },
  { emoji: '🐟', label: 'Find an item', prompt: 'Do you have fresh stockfish and ponmo?' },
];

const WELCOME: Msg = {
  role: 'assistant',
  content: "Hi, I'm Adaeze 👑 — your personal Ojaoba assistant. Tell me what you'd like to cook or buy and I'll find it, answer any question, and build your cart for you. How can I help today?",
};

export default function AssistantPage() {
  const router = useRouter();
  const [chats, setChats] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Record<string, number>>({});
  const [cartCount, setCartCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const active = chats.find((c) => c.id === activeId);
  const messages = active?.messages || [WELCOME];
  const isEmpty = !active || active.messages.length <= 1;

  const refreshCount = useCallback(() => { setCartCount(loadCart().reduce((s, c) => s + c.qty, 0)); }, []);

  useEffect(() => {
    getTrackSessionId();
    const existing = loadChats();
    setChats(existing);
    if (existing.length) setActiveId(existing[0].id);
    refreshCount();
    track('page_view', { path: '/' });
    const sync = () => refreshCount();
    window.addEventListener('oja-cart-changed', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('oja-cart-changed', sync); window.removeEventListener('storage', sync); };
  }, [refreshCount]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  function persist(next: Conversation[]) { setChats(next); saveChats(next); }
  function newChat() { setActiveId(''); setInput(''); setSidebarOpen(false); setTimeout(() => inputRef.current?.focus(), 50); }
  function selectChat(id: string) { setActiveId(id); setSidebarOpen(false); }
  function deleteChat(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = chats.filter((c) => c.id !== id);
    persist(next);
    if (activeId === id) setActiveId(next[0]?.id || '');
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;
    if (/^(checkout|pay|check out|go to checkout)/i.test(clean) && loadCart().length) {
      track('checkout_start', { metadata: { via: 'command' } });
      router.push('/checkout');
      return;
    }
    setInput('');

    let convo = active;
    let working = [...chats];
    if (!convo) {
      convo = { id: uid(), title: clean.slice(0, 40), messages: [WELCOME], updatedAt: Date.now() };
      working = [convo, ...chats];
      setActiveId(convo.id);
    }
    const userMsg: Msg = { role: 'user', content: clean };
    const withUser: Conversation = { ...convo, messages: [...convo.messages, userMsg], updatedAt: Date.now(),
      title: convo.messages.length <= 1 ? clean.slice(0, 40) : convo.title };
    working = working.map((c) => (c.id === convo!.id ? withUser : c));
    persist(working);
    setLoading(true);

    try {
      const history = withUser.messages.map((m) => ({ role: m.role, content: m.content }));
      const cartPayload = loadCart().map((c) => ({ id: c.id, title: c.title, qty: c.qty, price_kobo: c.price_kobo, image_url: c.image_url }));
      const { data } = await api.post('/ai/chat', { sessionId: convo.id, messages: history, cart: cartPayload });
      if (data.cartActions?.length) applyCartActions(data.cartActions);
      const reply: Msg = { role: 'assistant', content: data.reply || 'Here you go 😊', products: data.products || [], chips: data.chips || [] };
      persist(working.map((c) => (c.id === convo!.id ? { ...withUser, messages: [...withUser.messages, reply], updatedAt: Date.now() } : c)));
    } catch {
      const reply: Msg = { role: 'assistant', content: 'Sorry, I had a little hiccup — please try that again 🙏', chips: ['Try again'] };
      persist(working.map((c) => (c.id === convo!.id ? { ...withUser, messages: [...withUser.messages, reply], updatedAt: Date.now() } : c)));
    } finally {
      setLoading(false);
    }
  }

  function addToCart(p: Card) {
    const cart = loadCart();
    const ex = cart.find((c) => c.id === p.id);
    const next: CartItem[] = ex
      ? cart.map((c) => (c.id === p.id ? { ...c, qty: c.qty + 1 } : c))
      : [...cart, { id: p.id, qty: 1, title: p.title, price_kobo: p.price_kobo, image_url: p.image_url || '', note: '' }];
    saveCart(next);
    window.dispatchEvent(new Event('oja-cart-changed'));
    refreshCount();
    setAdded((a) => ({ ...a, [p.id]: (a[p.id] || 0) + 1 }));
    track('add_to_cart', { productId: p.id, valueKobo: p.price_kobo, metadata: { title: p.title } });
  }

  // Apply cart changes Adaeze made herself (add / change quantity / remove)
  function applyCartActions(actions: any[]) {
    const cart = loadCart();
    for (const a of actions) {
      if (!a || !a.id) continue;
      const q = Math.max(0, Math.floor(Number(a.quantity)) || 0);
      const idx = cart.findIndex((c) => c.id === a.id);
      if (q <= 0) { if (idx >= 0) cart.splice(idx, 1); continue; }
      if (idx >= 0) cart[idx] = { ...cart[idx], qty: q };
      else if (a.title != null && a.price_kobo != null) cart.push({ id: a.id, qty: q, title: a.title, price_kobo: a.price_kobo, image_url: a.image_url || '', note: '' });
    }
    saveCart(cart);
    window.dispatchEvent(new Event('oja-cart-changed'));
    refreshCount();
    setAdded((prev) => {
      const next = { ...prev };
      for (const a of actions) if (a?.id) next[a.id] = Math.max(0, Math.floor(Number(a.quantity)) || 0);
      return next;
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input); }
  }

  function goToStore() {
    if (STORE_URL) window.open(STORE_URL, '_blank');
  }

  return (
    <div className="flex h-[100dvh] overflow-hidden text-white" style={{ background: PURPLE_NIGHT }}>
      {/* ── Sidebar ── */}
      <aside
        className={`fixed md:static z-40 h-full w-[270px] flex flex-col transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        style={{ background: PURPLE_DEEP, borderRight: '1px solid rgba(245,158,11,0.12)' }}
      >
        <div className="p-4 flex items-center gap-2.5" style={{ borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg,${GOLD},${GOLD_DK})` }}>
            <Crown size={18} color={PURPLE_DEEP} fill={PURPLE_DEEP} />
          </div>
          <div className="leading-tight">
            <p className="font-black text-[15px]">Ojaoba</p>
            <p className="text-[11px]" style={{ color: GOLD }}>AI Assistant</p>
          </div>
          <button className="md:hidden ml-auto" onClick={() => setSidebarOpen(false)}><X size={20} className="text-white/60" /></button>
        </div>

        <div className="p-3">
          <button onClick={newChat} className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl font-bold text-sm"
            style={{ background: `linear-gradient(135deg,${GOLD},${GOLD_DK})`, color: PURPLE_DEEP }}>
            <MessageSquarePlus size={17} /> New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
          {chats.length === 0 && <p className="text-xs text-white/30 px-3 py-4">Your conversations will appear here.</p>}
          {chats.map((c) => (
            <button key={c.id} onClick={() => selectChat(c.id)}
              className="group w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-colors"
              style={c.id === activeId ? { background: 'rgba(245,158,11,0.13)' } : {}}>
              <Sparkles size={14} style={{ color: c.id === activeId ? GOLD : 'rgba(255,255,255,0.35)' }} className="shrink-0" />
              <span className="flex-1 truncate text-[13px]" style={{ color: c.id === activeId ? 'white' : 'rgba(255,255,255,0.65)' }}>
                {c.title || 'New conversation'}
              </span>
              <span onClick={(e) => deleteChat(c.id, e)} className="opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 size={14} className="text-white/40 hover:text-red-400" />
              </span>
            </button>
          ))}
        </div>

        <div className="p-3 space-y-1.5" style={{ borderTop: '1px solid rgba(245,158,11,0.12)' }}>
          {cartCount > 0 && (
            <button onClick={() => { track('checkout_start', { metadata: { via: 'sidebar' } }); router.push('/checkout'); }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-sm"
              style={{ background: `linear-gradient(135deg,${GREEN},#16A34A)`, color: 'white' }}>
              <ShoppingCart size={16} /> Checkout · {cartCount}
            </button>
          )}
          {STORE_URL && (
            <button onClick={goToStore} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-white/55 hover:text-white transition-colors">
              <Store size={16} /> Go to full store
            </button>
          )}
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col min-w-0" style={{ background: `radial-gradient(120% 80% at 50% 0%, ${PURPLE} 0%, ${PURPLE_NIGHT} 70%)` }}>
        <header className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button className="md:hidden" onClick={() => setSidebarOpen(true)}><Menu size={22} className="text-white/70" /></button>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="relative w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg,${GOLD},${GOLD_DK})` }}>
              <Crown size={15} color={PURPLE_DEEP} fill={PURPLE_DEEP} />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full" style={{ background: GREEN, border: `2px solid ${PURPLE_NIGHT}` }} />
            </div>
            <div className="leading-tight min-w-0">
              <p className="font-bold text-sm truncate flex items-center gap-1.5">Adaeze <Sparkles size={12} color={GOLD} /></p>
              <p className="text-[11px] text-white/45">Online · Ojaoba shopping assistant</p>
            </div>
          </div>
          {cartCount > 0 && (
            <button onClick={() => router.push('/checkout')} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold"
              style={{ background: 'rgba(245,158,11,0.15)', color: GOLD, border: '1px solid rgba(245,158,11,0.3)' }}>
              <ShoppingCart size={14} /> {cartCount}
            </button>
          )}
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6">
            {isEmpty ? (
              <EmptyState onPick={send} />
            ) : (
              messages.map((m, i) => (
                <MessageBlock key={i} m={m} last={i === messages.length - 1} loading={loading} added={added} onAdd={addToCart} onChip={send} />
              ))
            )}
            {loading && <TypingDots />}
          </div>
        </div>

        <div className="shrink-0 px-4 pb-5 pt-2" style={{ background: `linear-gradient(to top, ${PURPLE_NIGHT} 60%, transparent)` }}>
          <div className="max-w-3xl mx-auto">
            <div className="flex items-end gap-2 rounded-2xl px-3 py-2" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}>
              <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} rows={1}
                placeholder="Message Adaeze…  (e.g. “I want to make jollof rice”)"
                className="flex-1 bg-transparent outline-none resize-none text-[15px] py-2 max-h-32 placeholder:text-white/35" />
              <button onClick={() => send(input)} disabled={!input.trim() || loading} aria-label="Send"
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
                style={{ background: input.trim() ? `linear-gradient(135deg,${GOLD},${GOLD_DK})` : 'rgba(255,255,255,0.12)' }}>
                <Send size={18} color={input.trim() ? PURPLE_DEEP : 'rgba(255,255,255,0.5)'} />
              </button>
            </div>
            <p className="text-center text-[11px] text-white/30 mt-2">
              Adaeze can shop, answer questions and build your cart. Always confirm your order at checkout.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center text-center pt-10 pb-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ background: `linear-gradient(135deg,${GOLD},${GOLD_DK})`, boxShadow: '0 14px 40px rgba(245,158,11,0.4)' }}>
        <Crown size={30} color={PURPLE_DEEP} fill={PURPLE_DEEP} />
      </div>
      <h1 className="text-2xl md:text-3xl font-black">How can I help you shop today?</h1>
      <p className="text-white/55 mt-2 max-w-md text-sm md:text-base">
        I'm Adaeze, your Ojaoba assistant. Ask me anything, find products, or let me plan a meal and fill your cart — just chat.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-8 w-full max-w-xl">
        {SUGGESTIONS.map((s) => (
          <button key={s.label} onClick={() => onPick(s.prompt)}
            className="flex items-center gap-3 p-4 rounded-2xl text-left transition-colors hover:bg-white/[0.07]"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)' }}>
            <span className="text-2xl">{s.emoji}</span>
            <div className="min-w-0">
              <p className="font-bold text-sm">{s.label}</p>
              <p className="text-white/45 text-xs truncate">{s.prompt}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBlock({ m, last, loading, added, onAdd, onChip }: {
  m: Msg; last: boolean; loading: boolean;
  added: Record<string, number>; onAdd: (p: Card) => void; onChip: (t: string) => void;
}) {
  const isUser = m.role === 'user';
  return (
    <div className="mb-6">
      <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
        {!isUser && (
          <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `linear-gradient(135deg,${GOLD},${GOLD_DK})` }}>
            <Crown size={15} color={PURPLE_DEEP} fill={PURPLE_DEEP} />
          </div>
        )}
        <div className={`max-w-[82%] px-4 py-2.5 text-[15px] leading-relaxed ${isUser ? 'rounded-2xl rounded-br-md' : 'rounded-2xl rounded-bl-md'}`}
          style={isUser
            ? { background: `linear-gradient(135deg,${GOLD},${GOLD_DK})`, color: PURPLE_DEEP, fontWeight: 600 }
            : { background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
          {m.content}
        </div>
      </div>

      {!!m.products?.length && (
        <div className="ml-11 mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {m.products.map((p) => {
            const cnt = added[p.id] || 0;
            return (
              <div key={p.id} onClick={() => onAdd(p)} className="rounded-2xl overflow-hidden cursor-pointer transition-all"
                style={{ background: PURPLE_DEEP, border: `1.5px solid ${cnt > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`, boxShadow: cnt > 0 ? '0 0 14px rgba(245,158,11,0.25)' : 'none' }}>
                <div className="relative w-full" style={{ height: 110, background: PURPLE }}>
                  {p.image_url
                    ? <img src={p.image_url} alt={p.title} loading="lazy" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl">🛒</div>}
                  <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ background: cnt > 0 ? GOLD : 'rgba(30,7,53,0.9)', border: `1.5px solid ${GOLD}` }}>
                    {cnt > 0 ? <Check size={14} color={PURPLE_DEEP} strokeWidth={3} /> : <Plus size={14} color={GOLD} strokeWidth={3} />}
                  </div>
                  {cnt > 0 && <span className="absolute top-2 left-2 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black flex items-center justify-center" style={{ background: GREEN, color: 'white' }}>{cnt}</span>}
                </div>
                <div className="p-2.5">
                  <p className="text-xs font-bold leading-snug line-clamp-2" style={{ minHeight: 30 }}>{p.title}</p>
                  <p className="text-sm font-black mt-0.5" style={{ color: GOLD }}>{fmt(p.price_kobo)}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!!m.chips?.length && last && !loading && (
        <div className="ml-11 mt-3 flex flex-wrap gap-2">
          {m.chips.map((c) => (
            <button key={c} onClick={() => onChip(c)} className="px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-colors"
              style={{ color: GOLD, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.32)' }}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="ml-11 flex items-center gap-1.5 mb-6">
      {[0, 1, 2].map((d) => (
        <span key={d} className="w-2 h-2 rounded-full" style={{ background: GOLD, animation: `ai-blink 1.2s ${d * 0.2}s infinite` }} />
      ))}
      <span className="text-white/40 text-xs ml-1.5">Adaeze is typing…</span>
    </div>
  );
}
