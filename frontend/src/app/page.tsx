'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, Minus, Heart, Bell, X, Check,
  MessageCircle, Search,
} from 'lucide-react';
import api, { fmt } from '@/lib/api';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';

const CAT_ICONS: Record<string, string> = {
  grains:'🌾', rice:'🍚', vegetables:'🥦', veggies:'🥦',
  fruits:'🍎', meat:'🥩', fish:'🐟', seafood:'🦐',
  dairy:'🥛', beverages:'🥤', drinks:'🥤', snacks:'🍿',
  condiments:'🫙', spices:'🌶️', cooking:'🍳', frozen:'❄️',
  poultry:'🍗', chicken:'🍗', eggs:'🥚', alcoholic:'🍾',
  baby:'👶', baking:'🧁', cereals:'🥣', household:'🏠',
  oils:'🫙', pasta:'🍝', provision:'🛒',
};
const FALLBACKS = ['🥕','🍅','🌽','🧅','🧄','🫚','🍋','🥝','🌿','🛒'];
const GRADS = [
  ['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#10B981','#059669'],
  ['#8B5CF6','#7C3AED'],['#3B82F6','#1D4ED8'],['#F97316','#EA580C'],
  ['#EC4899','#DB2777'],['#14B8A6','#0D9488'],['#A78BFA','#7C3AED'],
];
function icon(n: string) {
  const lo = n.toLowerCase();
  for (const [k, v] of Object.entries(CAT_ICONS)) if (lo.includes(k)) return v;
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return FALLBACKS[h % FALLBACKS.length];
}
function grad(n: string): [string, string] {
  let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return GRADS[h % GRADS.length] as [string, string];
}

interface Product {
  id: string; title: string; price_kobo: number;
  compare_price_kobo: number | null; image_url: string;
  category: string; description: string; inventory: number;
}
type CartItem = { id: string; qty: number; title: string; price_kobo: number; image_url: string };

export default function HomePage() {
  const [cat, setCat]         = useState('');
  const [idx, setIdx]         = useState(0);
  const [qtys, setQtys]       = useState<Record<string, number>>({});
  const [cart, setCart]       = useState<CartItem[]>([]);
  const [favs, setFavs]       = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [added, setAdded]     = useState<string[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const slideMap  = useRef<Map<number, HTMLDivElement>>(new Map());

  /* ── Fetch ── */
  const { data: rawCats = [] } = useQuery<string[]>({
    queryKey: ['cats'],
    queryFn: () => api.get('/products/categories').then(r =>
      Array.isArray(r.data) ? r.data.map((c: any) => typeof c === 'string' ? c : c.name) : []
    ),
  });

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed', cat],
    queryFn: () => {
      const p: Record<string, string> = { page: '1', limit: '30' };
      if (cat) p.category = cat;
      return api.get('/products', { params: p }).then(r => r.data);
    },
    staleTime: 30000,
  });

  const products: Product[] = feed?.products ?? [];

  /* Reset scroll on category change */
  const prevCat = useRef(cat);
  if (prevCat.current !== cat) {
    prevCat.current = cat;
    scrollRef.current?.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    setIdx(0);
  }

  /* IntersectionObserver → track visible slide */
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !products.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const i = Number((e.target as HTMLElement).dataset.i);
          if (!isNaN(i)) setIdx(i);
        }
      });
    }, { root, threshold: 0.6 });
    slideMap.current.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [products]);

  /* ── Helpers ── */
  const getQty = (id: string) => qtys[id] ?? 1;
  const bumpQty = (id: string, delta: number) =>
    setQtys(p => ({ ...p, [id]: Math.max(1, (p[id] ?? 1) + delta) }));
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.price_kobo * c.qty, 0);

  function addToCart(p: Product) {
    const q = getQty(p.id);
    setCart(prev => {
      const ex = prev.find(c => c.id === p.id);
      if (ex) return prev.map(c => c.id === p.id ? { ...c, qty: c.qty + q } : c);
      return [...prev, { id: p.id, qty: q, title: p.title, price_kobo: p.price_kobo, image_url: p.image_url }];
    });
    setAdded(a => [...a, p.id]);
    setTimeout(() => setAdded(a => a.filter(x => x !== p.id)), 1300);
    setQtys(q2 => ({ ...q2, [p.id]: 1 }));
  }

  return (
    /* Outer — black gutters on desktop, full-screen on mobile */
    <div style={{ height: '100dvh', background: '#000', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>

      {/* ── Phone container (max 430px, full height) ── */}
      <div style={{ position: 'relative', width: '100%', maxWidth: 430, height: '100dvh', overflow: 'hidden', background: '#0D001A' }}>

        {/* ── HEADER ── */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%)',
        }}>
          <button style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <Bell size={19} color="#F59E0B" />
          </button>

          <img src="/OJAOBA.LOGO.jpg" alt="OjaOba" style={{ height: 34, borderRadius: 8, objectFit: 'contain' }} />

          <button onClick={() => setCartOpen(true)} style={{
            position: 'relative', width: 38, height: 38, borderRadius: '50%',
            background: 'rgba(245,158,11,0.18)', border: '1.5px solid rgba(245,158,11,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          }}>
            <ShoppingCart size={19} color="#F59E0B" />
            {cartCount > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, padding: '0 4px',
                borderRadius: 9, background: '#EF4444', color: 'white', fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>{cartCount}</span>
            )}
          </button>
        </div>

        {/* ── STORIES ── */}
        <div style={{
          position: 'absolute', top: 54, left: 0, right: 0, zIndex: 40,
          display: 'flex', gap: 10, overflowX: 'auto', padding: '6px 12px 8px',
          scrollbarWidth: 'none',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)',
        }}>
          {[{ id: '', name: 'All', ic: '🛒', g: ['#F59E0B', '#D97706'] as [string,string] },
            ...rawCats.map(c => ({ id: c, name: c, ic: icon(c), g: grad(c) }))
          ].map(c => {
            const active = cat === c.id;
            return (
              <button key={c.id || 'all'} onClick={() => setCat(c.id)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                <div style={{
                  borderRadius: '50%', padding: 2.5, transition: 'all 0.2s',
                  background: active ? `linear-gradient(135deg,${c.g[0]},${c.g[1]})` : 'rgba(255,255,255,0.18)',
                  boxShadow: active ? `0 0 14px ${c.g[0]}88` : 'none',
                }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: '50%', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: active ? `${c.g[0]}28` : 'rgba(10,0,20,0.7)',
                    border: active ? 'none' : '1.5px solid rgba(255,255,255,0.1)',
                  }}>{c.ic}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? c.g[0] : 'rgba(255,255,255,0.55)', maxWidth: 52, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {c.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SNAP SCROLL FEED ── */}
        <div ref={scrollRef} style={{ width: '100%', height: '100%', overflowY: 'scroll', scrollSnapType: 'y mandatory', scrollbarWidth: 'none' }}>

          {isLoading && (
            <div style={{ height: '100dvh', scrollSnapAlign: 'start', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: 36, height: 36, border: '3px solid rgba(245,158,11,0.15)', borderTop: '3px solid #F59E0B', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!isLoading && !products.length && (
            <div style={{ height: '100dvh', scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <span style={{ fontSize: 48 }}>🛒</span>
              <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14 }}>No products found</p>
            </div>
          )}

          {products.map((p, i) => {
            const qty       = getQty(p.id);
            const isFav     = favs.includes(p.id);
            const isAdded   = added.includes(p.id);
            const soldOut   = p.inventory === 0;
            const inCartQty = cart.find(c => c.id === p.id)?.qty ?? 0;
            const [g1, g2]  = grad(p.category);

            return (
              <div key={p.id} data-i={i}
                ref={el => { if (el) slideMap.current.set(i, el); else slideMap.current.delete(i); }}
                style={{ position: 'relative', width: '100%', height: '100dvh', scrollSnapAlign: 'start', flexShrink: 0 }}>

                {/* ── Product image / background ── */}
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(160deg,${g1} 0%,${g2} 50%,#0D001A 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: 120, opacity: 0.3 }}>{icon(p.category)}</span>
                  </div>
                )}

                {/* ── Dark cinematic overlays ── */}
                {/* Subtle purple brand tint */}
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(13,0,26,0.28)' }} />
                {/* Top fade for header */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to bottom,rgba(0,0,0,0.65) 0%,transparent 100%)' }} />
                {/* Bottom fade for info */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%', background: 'linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.7) 50%,transparent 100%)' }} />

                {/* ── In-cart badge ── */}
                {inCartQty > 0 && (
                  <div style={{
                    position: 'absolute', top: 136, left: 14, zIndex: 10,
                    background: '#F59E0B', color: '#000', fontWeight: 700, fontSize: 11,
                    padding: '3px 11px', borderRadius: 20,
                  }}>✓ {inCartQty} in cart</div>
                )}

                {/* ── RIGHT ACTION BUTTONS ── */}
                <div style={{
                  position: 'absolute', right: 14, bottom: 150, zIndex: 10,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
                }}>

                  {/* Cart */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <button disabled={soldOut} onClick={() => addToCart(p)} style={{
                      width: 50, height: 50, borderRadius: '50%', border: 'none', cursor: soldOut ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                      background: isAdded ? 'linear-gradient(135deg,#16A34A,#15803D)' : soldOut ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#F59E0B,#D97706)',
                      boxShadow: isAdded ? '0 0 20px rgba(22,163,74,0.6)' : soldOut ? 'none' : '0 0 20px rgba(245,158,11,0.5)',
                      opacity: soldOut ? 0.45 : 1,
                    }}>
                      {isAdded ? <Check size={22} color="white" /> : <ShoppingCart size={20} color={soldOut ? 'rgba(255,255,255,0.4)' : '#000'} />}
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: 500 }}>Add</span>
                  </div>

                  {/* Plus */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    <button onClick={() => bumpQty(p.id, 1)} style={{
                      width: 50, height: 50, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.22)',
                      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Plus size={22} color="white" />
                    </button>
                    <span style={{ color: 'white', fontSize: 16, fontWeight: 700, lineHeight: 1 }}>{qty}</span>
                  </div>

                  {/* Minus */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <button onClick={() => bumpQty(p.id, -1)} style={{
                      width: 50, height: 50, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.22)',
                      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Minus size={22} color="white" />
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 500 }}>Qty</span>
                  </div>

                  {/* Heart */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <button onClick={() => setFavs(f => f.includes(p.id) ? f.filter(x => x !== p.id) : [...f, p.id])} style={{
                      width: 50, height: 50, borderRadius: '50%',
                      border: `1.5px solid ${isFav ? '#EF4444' : 'rgba(255,255,255,0.22)'}`,
                      background: isFav ? 'rgba(239,68,68,0.22)' : 'rgba(0,0,0,0.45)',
                      backdropFilter: 'blur(10px)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s',
                    }}>
                      <Heart size={22} color={isFav ? '#EF4444' : 'white'} fill={isFav ? '#EF4444' : 'none'} />
                    </button>
                    <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: 500 }}>Save</span>
                  </div>
                </div>

                {/* ── BOTTOM PRODUCT INFO ── */}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 68, padding: '0 16px 28px', zIndex: 10 }}>

                  {/* Category pill */}
                  <div style={{
                    display: 'inline-block', padding: '4px 12px', borderRadius: 20, marginBottom: 8,
                    background: `linear-gradient(135deg,${g1},${g2})`, fontSize: 11, fontWeight: 700, color: 'white',
                  }}>{p.category}</div>

                  {/* Title + price */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 7 }}>
                    <h2 style={{ color: 'white', fontWeight: 800, fontSize: 17, lineHeight: 1.3, margin: 0, flex: 1 }}>
                      {p.title}
                    </h2>
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <div style={{ color: '#F59E0B', fontWeight: 900, fontSize: 20 }}>{fmt(p.price_kobo)}</div>
                      {p.compare_price_kobo && p.compare_price_kobo > p.price_kobo && (
                        <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, textDecoration: 'line-through' }}>{fmt(p.compare_price_kobo)}</div>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {p.description && (
                    <p style={{
                      color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.5, margin: '0 0 10px',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>{p.description}</p>
                  )}

                  {/* Stock warnings */}
                  {soldOut && <span style={{ color: '#F87171', fontSize: 12, fontWeight: 600 }}>⚠ Out of stock</span>}
                  {!soldOut && p.inventory > 0 && p.inventory <= 5 && (
                    <span style={{ color: '#FB923C', fontSize: 12, fontWeight: 600 }}>Only {p.inventory} left!</span>
                  )}

                  {/* Search icon */}
                  <div style={{ marginTop: 12 }}>
                    <Link href="/shop" style={{
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 42, height: 42, borderRadius: '50%', textDecoration: 'none',
                      background: 'rgba(255,255,255,0.13)', backdropFilter: 'blur(8px)',
                      border: '1.5px solid rgba(255,255,255,0.2)',
                    }}>
                      <Search size={18} color="white" />
                    </Link>
                  </div>
                </div>

                {/* Scroll hint — first slide only */}
                {i === 0 && products.length > 1 && (
                  <div style={{ position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, opacity: 0.45, animation: 'bounce 2s ease-in-out infinite', zIndex: 10 }}>
                    <div style={{ width: 1.5, height: 18, background: 'white', borderRadius: 1 }} />
                    <span style={{ color: 'white', fontSize: 9, letterSpacing: 1 }}>SCROLL</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>{/* end phone container */}

      {/* ══ CART DRAWER ══ */}
      {cartOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.72)' }} onClick={() => setCartOpen(false)} />
          <div style={{
            position: 'relative', width: '100%', maxWidth: 430,
            maxHeight: '84dvh', overflowY: 'auto', scrollbarWidth: 'none',
            background: '#0D001A', borderRadius: '22px 22px 0 0',
            border: '1px solid rgba(245,158,11,0.2)', borderBottom: 'none',
          }}>
            {/* Drag handle */}
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', margin: '12px auto 0' }} />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
                Cart <span style={{ color: 'rgba(255,255,255,0.3)', fontWeight: 400, fontSize: 13 }}>({cartCount})</span>
              </span>
              <button onClick={() => setCartOpen(false)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="white" />
              </button>
            </div>

            <div style={{ padding: '0 16px 28px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <ShoppingCart size={44} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 10px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 14 }}>Your cart is empty</p>
                </div>
              ) : (<>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginTop: 12 }}>
                  {cart.map(ci => (
                    <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ width: 50, height: 50, borderRadius: 10, overflow: 'hidden', flexShrink: 0, background: 'rgba(255,255,255,0.07)' }}>
                        {ci.image_url
                          ? <img src={ci.image_url} alt={ci.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🛒</div>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ color: 'white', fontSize: 13, fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ci.title}</p>
                        <p style={{ color: '#F59E0B', fontSize: 12, margin: '2px 0 0' }}>{fmt(ci.price_kobo)} × {ci.qty}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        <button onClick={() => setCart(prev => prev.map(c => c.id === ci.id ? { ...c, qty: Math.max(1, c.qty - 1) } : c))} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Minus size={12} color="white" /></button>
                        <span style={{ color: 'white', fontWeight: 700, minWidth: 14, textAlign: 'center', fontSize: 13 }}>{ci.qty}</span>
                        <button onClick={() => setCart(prev => prev.map(c => c.id === ci.id ? { ...c, qty: c.qty + 1 } : c))} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Plus size={12} color="white" /></button>
                        <button onClick={() => setCart(prev => prev.filter(c => c.id !== ci.id))} style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(239,68,68,0.15)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2 }}><X size={12} color="#EF4444" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 14, paddingTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <span style={{ color: 'white', fontWeight: 600 }}>Total</span>
                    <span style={{ color: '#F59E0B', fontWeight: 900, fontSize: 22 }}>{fmt(cartTotal)}</span>
                  </div>
                  <a
                    href={`https://wa.me/${WA_NUMBER}?text=Hi! I'd like to order:%0A%0A${cart.map(c => `• ${c.title} x${c.qty} — ${fmt(c.price_kobo * c.qty)}`).join('%0A')}%0A%0ATotal: ${fmt(cartTotal)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, width: '100%', padding: '15px 0', borderRadius: 16, background: '#25D366', color: 'white', fontWeight: 700, fontSize: 15, textDecoration: 'none', boxShadow: '0 8px 24px rgba(37,211,102,0.3)' }}>
                    <MessageCircle size={19} /> Order via WhatsApp · {fmt(cartTotal)}
                  </a>
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.22)', fontSize: 11, marginTop: 9 }}>Order confirmed on WhatsApp</p>
                </div>
              </>)}
            </div>
          </div>
        </div>
      )}

      <style>{`
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { display: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateX(-50%) translateY(0)} 50%{transform:translateX(-50%) translateY(-7px)} }
      `}</style>
    </div>
  );
}
