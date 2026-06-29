'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, Send, X, Crown, Plus, Check, ShoppingCart, Mic } from 'lucide-react';
import api, { fmt } from '@/lib/api';
import { loadCart, saveCart, CartItem } from '@/lib/cart';
import { track, getTrackSessionId } from '@/lib/track';

const PURPLE = '#2D0A4E';
const PURPLE_DEEP = '#1E0735';
const GOLD = '#F59E0B';
const GOLD_DK = '#D97706';
const GREEN = '#22C55E';

interface Card {
  id: string; title: string; price_kobo: number;
  image_url: string | null; category: string; description?: string;
  shopify_id?: string | null;
}
interface Msg {
  role: 'user' | 'assistant';
  content: string;
  products?: Card[];
  chips?: string[];
}

const GREETING: Msg = {
  role: 'assistant',
  content: "Hi, I'm Adaeze 👑 your Ojaoba shopping assistant. Tell me what you need, tap a suggestion, or browse — I'll add everything to your cart for you.",
  chips: ['🍚 Rice & grains', '🥬 Fresh vegetables', '🐟 Fish & meat', '🔥 What\'s popular?', '🍲 Help me plan a meal'],
};

export default function AiAssistant() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState<Record<string, number>>({});
  const [cartCount, setCartCount] = useState(0);
  const [hintSeen, setHintSeen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sessionId = useRef<string>('');

  useEffect(() => { sessionId.current = getTrackSessionId(); }, []);

  // Keep cart count in sync with the rest of the app
  const refreshCount = useCallback(() => {
    setCartCount(loadCart().reduce((s, c) => s + c.qty, 0));
  }, []);
  useEffect(() => {
    refreshCount();
    const h = () => refreshCount();
    window.addEventListener('oja-cart-changed', h);
    window.addEventListener('storage', h);
    return () => { window.removeEventListener('oja-cart-changed', h); window.removeEventListener('storage', h); };
  }, [refreshCount]);

  // Pulse the launcher once on first load to invite engagement
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem('oja_ai_seen')) {
      setHintSeen(false);
      const t = setTimeout(() => { setHintSeen(true); localStorage.setItem('oja_ai_seen', '1'); }, 6000);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    if (open) scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, loading, open]);

  function openPanel() {
    setOpen(true);
    setHintSeen(true);
    if (typeof window !== 'undefined') localStorage.setItem('oja_ai_seen', '1');
    track('page_view', { path: '/ai-assistant', metadata: { surface: 'ai_assistant' } });
  }

  async function send(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;

    // Checkout shortcut — frictionless exit to payment
    if (/checkout|pay\b|check out/i.test(clean) && loadCart().length) {
      track('checkout_start', { metadata: { via: 'ai_assistant' } });
      router.push('/checkout');
      return;
    }

    const next = [...msgs, { role: 'user' as const, content: clean }];
    setMsgs(next);
    setInput('');
    setLoading(true);
    try {
      const history = next.map((m) => ({ role: m.role, content: m.content }));
      const cartPayload = loadCart().map((c) => ({ id: c.id, title: c.title, qty: c.qty, price_kobo: c.price_kobo, image_url: c.image_url }));
      const { data } = await api.post('/ai/chat', { sessionId: sessionId.current, messages: history, cart: cartPayload });
      if (data.cartActions?.length) applyCartActions(data.cartActions);
      setMsgs((m) => [...m, {
        role: 'assistant',
        content: data.reply || "Here you go 😊",
        products: data.products || [],
        chips: data.chips || [],
      }]);
    } catch {
      setMsgs((m) => [...m, {
        role: 'assistant',
        content: "Sorry, I had a little hiccup — please try that again 🙏",
        chips: ['Try again', 'Browse categories'],
      }]);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(p: Card) {
    const cart = loadCart();
    const ex = cart.find((c) => c.id === p.id);
    let nextCart: CartItem[];
    if (ex) nextCart = cart.map((c) => c.id === p.id ? { ...c, qty: c.qty + 1 } : c);
    else nextCart = [...cart, { id: p.id, qty: 1, title: p.title, price_kobo: p.price_kobo, image_url: p.image_url || '', note: '', shopify_id: p.shopify_id ?? null }];
    saveCart(nextCart);
    window.dispatchEvent(new Event('oja-cart-changed'));
    refreshCount();
    setAdded((a) => ({ ...a, [p.id]: (a[p.id] || 0) + 1 }));
    track('add_to_cart', { productId: p.id, valueKobo: p.price_kobo, metadata: { via: 'ai_assistant', title: p.title } });
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
      else if (a.title != null && a.price_kobo != null) cart.push({ id: a.id, qty: q, title: a.title, price_kobo: a.price_kobo, image_url: a.image_url || '', note: '', shopify_id: a.shopify_id ?? null });
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

  return (
    <>
      {/* ── Launcher ── */}
      {!open && (
        <button onClick={openPanel} aria-label="Open Ojaoba AI assistant"
          style={{
            position: 'fixed', bottom: 22, right: 16, zIndex: 90,
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 16px 12px 12px', borderRadius: 999, cursor: 'pointer',
            border: `1.5px solid ${GOLD}`,
            background: `linear-gradient(135deg, ${GOLD}, ${GOLD_DK})`,
            boxShadow: '0 8px 28px rgba(245,158,11,0.45)',
            animation: hintSeen ? 'none' : 'ai-pulse 1.6s ease-in-out infinite',
          }}>
          <span style={{ width: 30, height: 30, borderRadius: '50%', background: PURPLE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Crown size={17} color={GOLD} fill={GOLD} />
          </span>
          <span style={{ color: PURPLE_DEEP, fontWeight: 800, fontSize: 14, letterSpacing: .2 }}>Ask Adaeze</span>
        </button>
      )}

      {/* ── Panel ── */}
      {open && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-end', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 440, height: '88dvh', background: PURPLE,
              borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
              display: 'flex', flexDirection: 'column', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)',
              animation: 'ai-slide-up 0.3s cubic-bezier(0.22,1,0.36,1)',
            }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '14px 14px', background: `linear-gradient(135deg, ${PURPLE_DEEP}, ${PURPLE})`, borderBottom: '1px solid rgba(245,158,11,0.18)' }}>
              <div style={{ position: 'relative', width: 42, height: 42, borderRadius: '50%', background: `linear-gradient(135deg,${GOLD},${GOLD_DK})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Crown size={22} color={PURPLE_DEEP} fill={PURPLE_DEEP} />
                <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: GREEN, border: `2px solid ${PURPLE_DEEP}` }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'white', fontWeight: 800, fontSize: 15, margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                  Adaeze <Sparkles size={13} color={GOLD} />
                </p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, margin: 0 }}>Your AI shopping assistant · Online</p>
              </div>
              <button onClick={() => { setOpen(false); refreshCount(); }} aria-label="Close"
                style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={19} color="white" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '16px 12px 8px', scrollbarWidth: 'none' }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  {/* Bubble */}
                  <div style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '85%', padding: '10px 14px', borderRadius: 18, fontSize: 14, lineHeight: 1.5,
                      ...(m.role === 'user'
                        ? { background: `linear-gradient(135deg,${GOLD},${GOLD_DK})`, color: PURPLE_DEEP, fontWeight: 600, borderBottomRightRadius: 5 }
                        : { background: 'rgba(255,255,255,0.08)', color: 'white', borderBottomLeftRadius: 5, border: '1px solid rgba(255,255,255,0.08)' }),
                    }}>
                      {m.content}
                    </div>
                  </div>

                  {/* Product cards — swipe horizontally, tap to add */}
                  {!!m.products?.length && (
                    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '12px 2px 4px', scrollbarWidth: 'none', scrollSnapType: 'x mandatory' }}>
                      {m.products.map((p) => {
                        const cnt = added[p.id] || 0;
                        return (
                          <div key={p.id} onClick={() => addToCart(p)}
                            style={{
                              flexShrink: 0, width: 132, scrollSnapAlign: 'start', cursor: 'pointer',
                              borderRadius: 14, overflow: 'hidden', background: PURPLE_DEEP,
                              border: `1.5px solid ${cnt > 0 ? GOLD : 'rgba(255,255,255,0.1)'}`,
                              boxShadow: cnt > 0 ? '0 0 12px rgba(245,158,11,0.3)' : 'none', transition: 'all 0.2s',
                            }}>
                            <div style={{ position: 'relative', width: '100%', height: 110, background: PURPLE }}>
                              {p.image_url
                                ? <img src={p.image_url} alt={p.title} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🛒</div>}
                              <div style={{ position: 'absolute', bottom: 6, right: 6, width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: cnt > 0 ? GOLD : 'rgba(45,10,78,0.9)', border: `1.5px solid ${GOLD}`, boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                                {cnt > 0 ? <Check size={15} color={PURPLE_DEEP} strokeWidth={3} /> : <Plus size={15} color={GOLD} strokeWidth={3} />}
                              </div>
                              {cnt > 0 && (
                                <span style={{ position: 'absolute', top: 6, left: 6, minWidth: 18, height: 18, padding: '0 4px', borderRadius: 9, background: GREEN, color: 'white', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{cnt}</span>
                              )}
                            </div>
                            <div style={{ padding: '7px 8px 9px' }}>
                              <p style={{ color: 'white', fontSize: 11.5, fontWeight: 700, margin: '0 0 3px', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any, minHeight: 29 }}>{p.title}</p>
                              <p style={{ color: GOLD, fontSize: 13, fontWeight: 900, margin: 0 }}>{fmt(p.price_kobo)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quick-reply chips — tap to select */}
                  {!!m.chips?.length && i === msgs.length - 1 && !loading && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginTop: 10 }}>
                      {m.chips.map((c) => (
                        <button key={c} onClick={() => send(c)}
                          style={{ padding: '7px 13px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, cursor: 'pointer', color: GOLD, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.35)' }}>
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px' }}>
                  {[0, 1, 2].map((d) => (
                    <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', background: GOLD, animation: `ai-blink 1.2s ${d * 0.2}s infinite` }} />
                  ))}
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginLeft: 4 }}>Adaeze is typing…</span>
                </div>
              )}
            </div>

            {/* Cart bar */}
            {cartCount > 0 && (
              <button onClick={() => { track('checkout_start', { metadata: { via: 'ai_assistant' } }); router.push('/checkout'); }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 12px 8px', padding: '11px', borderRadius: 14, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg,${GREEN},#16A34A)`, color: 'white', fontWeight: 800, fontSize: 14 }}>
                <ShoppingCart size={17} /> Review cart &amp; checkout · {cartCount} item{cartCount > 1 ? 's' : ''}
              </button>
            )}

            {/* Input */}
            <div style={{ padding: '8px 12px 16px', borderTop: '1px solid rgba(255,255,255,0.07)', background: PURPLE_DEEP }}>
              <form onSubmit={(e) => { e.preventDefault(); send(input); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 999, padding: '5px 5px 5px 16px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type what you need…" enterKeyHint="send"
                  style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'white', fontSize: 14 }} />
                <button type="submit" aria-label="Send" disabled={!input.trim() || loading}
                  style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: input.trim() ? 'pointer' : 'default', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: input.trim() ? `linear-gradient(135deg,${GOLD},${GOLD_DK})` : 'rgba(255,255,255,0.12)', opacity: loading ? 0.6 : 1 }}>
                  <Send size={18} color={input.trim() ? PURPLE_DEEP : 'rgba(255,255,255,0.5)'} />
                </button>
              </form>
              <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 10, margin: '7px 0 0' }}>
                Type · tap a suggestion · or swipe the cards to shop
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
