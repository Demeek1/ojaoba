'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, Minus, Heart, Bell, X, Check,
  MessageCircle, Search
} from 'lucide-react';
import api, { fmt } from '@/lib/api';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';

const CATEGORY_ICONS: Record<string, string> = {
  grains:'🌾', rice:'🍚', vegetables:'🥦', veggies:'🥦',
  fruits:'🍎', meat:'🥩', fish:'🐟', seafood:'🦐',
  dairy:'🥛', beverages:'🥤', drinks:'🥤', snacks:'🍿',
  condiments:'🫙', spices:'🌶️', cooking:'🍳', frozen:'❄️',
  poultry:'🍗', chicken:'🍗', eggs:'🥚',
};
const FALLBACK_EMOJIS = ['🥕','🍅','🌽','🧅','🧄','🫚','🍋','🥝','🌿','🛒'];
const GRAD_PAIRS = [
  ['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#10B981','#059669'],
  ['#8B5CF6','#7C3AED'],['#3B82F6','#1D4ED8'],['#F97316','#EA580C'],
  ['#EC4899','#DB2777'],['#14B8A6','#0D9488'],
];

function catIcon(name: string) {
  const lo = name.toLowerCase();
  for (const [k,v] of Object.entries(CATEGORY_ICONS)) if (lo.includes(k)) return v;
  let h = 0; for (const c of name) h = (h*31+c.charCodeAt(0))&0xffff;
  return FALLBACK_EMOJIS[h % FALLBACK_EMOJIS.length];
}
function catGrad(name: string): [string,string] {
  let h = 0; for (const c of name) h = (h*31+c.charCodeAt(0))&0xffff;
  return GRAD_PAIRS[h % GRAD_PAIRS.length] as [string,string];
}

interface Product {
  id:string; title:string; price_kobo:number;
  compare_price_kobo:number|null; image_url:string;
  category:string; description:string; inventory:number;
}
type CartItem = { productId:string; qty:number; title:string; price_kobo:number; image_url:string };

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('');
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [qtys, setQtys]                     = useState<Record<string,number>>({});
  const [cart, setCart]                     = useState<CartItem[]>([]);
  const [favorites, setFavorites]           = useState<string[]>([]);
  const [showCart, setShowCart]             = useState(false);
  const [addedSet, setAddedSet]             = useState<string[]>([]);

  const scrollRef   = useRef<HTMLDivElement>(null);
  const slideRefs   = useRef<Map<number,HTMLDivElement>>(new Map());

  /* ── Data ── */
  const { data: rawCats = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(r =>
      Array.isArray(r.data) ? r.data.map((c:any) => typeof c==='string' ? c : c.name) : []
    ),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['feed', activeCategory],
    queryFn: () => {
      const p: Record<string,string> = { page:'1', limit:'30' };
      if (activeCategory) p.category = activeCategory;
      return api.get('/products', { params:p }).then(r => r.data);
    },
    staleTime: 30000,
  });

  const products: Product[] = productsData?.products ?? [];

  /* Reset on category change */
  const prevCat = useRef(activeCategory);
  if (prevCat.current !== activeCategory) {
    prevCat.current = activeCategory;
    scrollRef.current?.scrollTo({ top:0, behavior:'instant' as ScrollBehavior });
  }

  /* IntersectionObserver — track visible slide */
  useEffect(() => {
    if (!scrollRef.current || products.length === 0) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (!isNaN(idx)) setCurrentIdx(idx);
        }
      });
    }, { root: scrollRef.current, threshold: 0.55 });
    slideRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [products]);

  /* Helpers */
  const getQty  = (id:string) => qtys[id] ?? 1;
  const setQty  = (id:string, v:number) => setQtys(p => ({...p,[id]:Math.max(1,v)}));
  const cartCount = cart.reduce((s,c) => s+c.qty, 0);
  const cartTotal = cart.reduce((s,c) => s+c.price_kobo*c.qty, 0);

  function addToCart(p: Product) {
    const qty = getQty(p.id);
    setCart(prev => {
      const ex = prev.find(c => c.productId===p.id);
      if (ex) return prev.map(c => c.productId===p.id ? {...c,qty:c.qty+qty} : c);
      return [...prev, {productId:p.id,qty,title:p.title,price_kobo:p.price_kobo,image_url:p.image_url}];
    });
    setAddedSet(s => [...s, p.id]);
    setTimeout(() => setAddedSet(s => s.filter(x => x !== p.id)), 1200);
    setQty(p.id, 1);
  }

  function toggleFav(id:string) {
    setFavorites(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev,id]);
  }

  function inCart(id:string) { return cart.find(c=>c.productId===id)?.qty ?? 0; }

  return (
    <div style={{ height:'100dvh', overflow:'hidden', background:'#000', display:'flex', flexDirection:'column' }}>

      {/* ══ FIXED HEADER ══ */}
      <header style={{
        position:'fixed', top:0, left:0, right:0, zIndex:50,
        display:'flex', alignItems:'center', justifyContent:'space-between',
        padding:'10px 16px',
        background:'linear-gradient(to bottom,rgba(0,0,0,0.75) 0%,transparent 100%)',
      }}>
        <button style={{ padding:8, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer' }}>
          <Bell size={20} color="#F59E0B" />
        </button>

        <img src="/OJAOBA.LOGO.jpg" alt="OjaOba"
          style={{ height:36, borderRadius:8, objectFit:'contain' }} />

        <button style={{
          position:'relative', padding:8, borderRadius:'50%', cursor:'pointer',
          background:'rgba(245,158,11,0.15)', border:'1px solid rgba(245,158,11,0.3)',
        }} onClick={() => setShowCart(true)}>
          <ShoppingCart size={20} color="#F59E0B" />
          {cartCount > 0 && (
            <span style={{
              position:'absolute', top:-4, right:-4,
              width:18, height:18, borderRadius:'50%',
              background:'#EF4444', color:'white', fontSize:10,
              fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center',
            }}>{cartCount > 99 ? '99+' : cartCount}</span>
          )}
        </button>
      </header>

      {/* ══ FIXED STORIES ══ */}
      <div style={{
        position:'fixed', top:56, left:0, right:0, zIndex:40,
        overflowX:'auto', display:'flex', gap:14, padding:'8px 12px 10px',
        scrollbarWidth:'none',
        background:'linear-gradient(to bottom,rgba(0,0,0,0.5) 0%,transparent 100%)',
      }}>
        {/* All */}
        {[{id:'', name:'All', icon:'🛒', g:['#F59E0B','#D97706'] as [string,string]},
          ...rawCats.map(c => ({id:c, name:c, icon:catIcon(c), g:catGrad(c)}))
        ].map(cat => {
          const active = activeCategory === cat.id;
          return (
            <button key={cat.id||'all'} onClick={() => setActiveCategory(cat.id)}
              style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, flexShrink:0, background:'none', border:'none', cursor:'pointer', padding:0 }}>
              <div style={{
                borderRadius:'50%', padding:3,
                background: active ? `linear-gradient(135deg,${cat.g[0]},${cat.g[1]})` : 'rgba(255,255,255,0.15)',
                boxShadow: active ? `0 0 12px ${cat.g[0]}99` : 'none',
                transition:'all 0.2s',
              }}>
                <div style={{
                  width:52, height:52, borderRadius:'50%',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:22,
                  background: active ? `${cat.g[0]}22` : 'rgba(0,0,0,0.3)',
                  border: active ? 'none' : '2px solid rgba(255,255,255,0.1)',
                }}>
                  {cat.icon}
                </div>
              </div>
              <span style={{
                fontSize:10, fontWeight:600, color: active ? cat.g[0] : 'rgba(255,255,255,0.6)',
                maxWidth:56, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              }}>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* ══ SNAP SCROLL CONTAINER ══ */}
      <div ref={scrollRef} style={{
        flex:1, overflowY:'scroll', scrollSnapType:'y mandatory',
        scrollbarWidth:'none', WebkitOverflowScrolling:'touch',
      }}>
        {isLoading && (
          <div style={{ height:'100dvh', scrollSnapAlign:'start', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ width:40, height:40, border:'3px solid rgba(245,158,11,0.2)', borderTop:'3px solid #F59E0B', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div style={{ height:'100dvh', scrollSnapAlign:'start', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12 }}>
            <span style={{ fontSize:48 }}>🛒</span>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15 }}>No products found</p>
          </div>
        )}

        {products.map((p, i) => {
          const qty      = getQty(p.id);
          const isFav    = favorites.includes(p.id);
          const added    = addedSet.includes(p.id);
          const soldOut  = p.inventory === 0;
          const inCartN  = inCart(p.id);
          const [g1,g2]  = catGrad(p.category);

          return (
            <div key={p.id} data-idx={i}
              ref={el => { if (el) slideRefs.current.set(i,el); else slideRefs.current.delete(i); }}
              style={{ position:'relative', height:'100dvh', scrollSnapAlign:'start', overflow:'hidden' }}>

              {/* ── Background image / gradient ── */}
              {p.image_url ? (
                <img src={p.image_url} alt={p.title}
                  style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
              ) : (
                <div style={{ position:'absolute', inset:0, background:`linear-gradient(135deg,${g1},${g2},#000)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:140, opacity:0.25 }}>{catIcon(p.category)}</span>
                </div>
              )}

              {/* ── Gradient overlays ── */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.15) 0%,transparent 35%,transparent 45%,rgba(0,0,0,0.75) 75%,rgba(0,0,0,0.95) 100%)' }} />

              {/* ── In-cart badge ── */}
              {inCartN > 0 && (
                <div style={{
                  position:'absolute', top:148, left:14,
                  background:'#F59E0B', color:'#000', fontSize:11, fontWeight:700,
                  padding:'3px 10px', borderRadius:20,
                }}>
                  {inCartN} in cart
                </div>
              )}

              {/* ── Right action buttons ── */}
              <div style={{
                position:'absolute', right:12, bottom:140,
                display:'flex', flexDirection:'column', alignItems:'center', gap:18,
              }}>

                {/* Add to Cart */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <button disabled={soldOut} onClick={() => addToCart(p)}
                    style={{
                      width:52, height:52, borderRadius:'50%', border:'none', cursor: soldOut ? 'not-allowed' : 'pointer',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      background: added ? 'linear-gradient(135deg,#16A34A,#15803D)' : soldOut ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg,#F59E0B,#D97706)',
                      boxShadow: added ? '0 4px 16px rgba(22,163,74,0.6)' : soldOut ? 'none' : '0 4px 20px rgba(245,158,11,0.5)',
                      opacity: soldOut ? 0.4 : 1,
                      transition:'all 0.2s',
                    }}>
                    {added ? <Check size={24} color="white" /> : <ShoppingCart size={22} color={soldOut?'rgba(255,255,255,0.4)':'#000'} />}
                  </button>
                  <span style={{ color:'rgba(255,255,255,0.55)', fontSize:10 }}>Add</span>
                </div>

                {/* Plus */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
                  <button onClick={() => setQty(p.id, qty+1)}
                    style={{ width:52, height:52, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Plus size={24} color="white" />
                  </button>
                  <span style={{ color:'white', fontSize:15, fontWeight:700 }}>{qty}</span>
                </div>

                {/* Minus */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <button onClick={() => setQty(p.id, qty-1)}
                    style={{ width:52, height:52, borderRadius:'50%', border:'1.5px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.4)', backdropFilter:'blur(8px)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Minus size={24} color="white" />
                  </button>
                  <span style={{ color:'rgba(255,255,255,0.45)', fontSize:10 }}>Qty</span>
                </div>

                {/* Favorite */}
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                  <button onClick={() => toggleFav(p.id)}
                    style={{
                      width:52, height:52, borderRadius:'50%', cursor:'pointer',
                      border:`1.5px solid ${isFav ? '#EF4444' : 'rgba(255,255,255,0.2)'}`,
                      background: isFav ? 'rgba(239,68,68,0.2)' : 'rgba(0,0,0,0.4)',
                      backdropFilter:'blur(8px)',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      transition:'all 0.2s',
                    }}>
                    <Heart size={24} color={isFav?'#EF4444':'white'} fill={isFav?'#EF4444':'none'} />
                  </button>
                  <span style={{ color:'rgba(255,255,255,0.45)', fontSize:10 }}>Save</span>
                </div>
              </div>

              {/* ── Bottom info ── */}
              <div style={{ position:'absolute', bottom:0, left:0, right:80, padding:'0 16px 32px' }}>
                {/* Category */}
                <span style={{
                  display:'inline-block', marginBottom:8,
                  padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                  background:`linear-gradient(135deg,${g1},${g2})`, color:'white',
                }}>
                  {p.category}
                </span>

                {/* Name + Price */}
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                  <h2 style={{ color:'white', fontWeight:800, fontSize:18, lineHeight:1.25, margin:0, flex:1 }}>
                    {p.title}
                  </h2>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <div style={{ color:'#F59E0B', fontWeight:900, fontSize:20, lineHeight:1 }}>
                      {fmt(p.price_kobo)}
                    </div>
                    {p.compare_price_kobo && p.compare_price_kobo > p.price_kobo && (
                      <div style={{ color:'rgba(255,255,255,0.35)', fontSize:12, textDecoration:'line-through' }}>
                        {fmt(p.compare_price_kobo)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Description */}
                {p.description && (
                  <p style={{ color:'rgba(255,255,255,0.6)', fontSize:13, lineHeight:1.5, margin:'0 0 12px', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                    {p.description}
                  </p>
                )}

                {/* Out of stock */}
                {soldOut && (
                  <span style={{ color:'#EF4444', fontSize:12, fontWeight:700 }}>⚠ Out of stock</span>
                )}
                {!soldOut && p.inventory <= 5 && (
                  <span style={{ color:'#F97316', fontSize:12, fontWeight:600 }}>Only {p.inventory} left!</span>
                )}

                {/* Search icon */}
                <div style={{ marginTop:14 }}>
                  <Link href="/shop" style={{
                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                    width:44, height:44, borderRadius:'50%',
                    background:'rgba(255,255,255,0.12)', backdropFilter:'blur(8px)',
                    border:'1.5px solid rgba(255,255,255,0.2)',
                    color:'white', textDecoration:'none',
                  }}>
                    <Search size={20} color="white" />
                  </Link>
                </div>
              </div>

              {/* ── Scroll hint (first slide only) ── */}
              {i === 0 && products.length > 1 && (
                <div style={{
                  position:'absolute', bottom:8, left:'50%', transform:'translateX(-50%)',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:2, opacity:0.5,
                  animation:'bounce 2s infinite',
                }}>
                  <div style={{ width:2, height:20, background:'white', borderRadius:1, opacity:0.6 }} />
                  <span style={{ color:'white', fontSize:10 }}>scroll</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ══ CART DRAWER ══ */}
      {showCart && (
        <div style={{ position:'fixed', inset:0, zIndex:60, display:'flex', alignItems:'flex-end' }}>
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.7)' }} onClick={() => setShowCart(false)} />
          <div style={{
            position:'relative', width:'100%', maxHeight:'82dvh', overflowY:'auto',
            background:'#0D001A', borderRadius:'24px 24px 0 0',
            border:'1px solid rgba(245,158,11,0.18)', borderBottom:'none',
            scrollbarWidth:'none',
          }}>
            {/* Drawer header */}
            <div style={{
              position:'sticky', top:0, display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'18px 20px 14px', background:'#0D001A',
              borderBottom:'1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{ color:'white', fontWeight:700, fontSize:17 }}>
                Cart <span style={{ color:'rgba(255,255,255,0.35)', fontWeight:400, fontSize:14 }}>({cartCount})</span>
              </span>
              <button onClick={() => setShowCart(false)}
                style={{ padding:8, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer' }}>
                <X size={18} color="white" />
              </button>
            </div>

            <div style={{ padding:'0 20px 28px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign:'center', padding:'48px 0' }}>
                  <ShoppingCart size={48} color="rgba(255,255,255,0.12)" style={{ margin:'0 auto 12px' }} />
                  <p style={{ color:'rgba(255,255,255,0.3)' }}>Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:14 }}>
                    {cart.map(ci => (
                      <div key={ci.productId} style={{
                        display:'flex', alignItems:'center', gap:12,
                        padding:12, borderRadius:16,
                        background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
                      }}>
                        <div style={{ width:54, height:54, borderRadius:12, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                          {ci.image_url
                            ? <img src={ci.image_url} alt={ci.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                            : <span style={{ fontSize:24 }}>🛒</span>}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <p style={{ color:'white', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ci.title}</p>
                          <p style={{ color:'#F59E0B', fontSize:12, margin:'2px 0 0' }}>{fmt(ci.price_kobo)} × {ci.qty} = {fmt(ci.price_kobo*ci.qty)}</p>
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                          <button onClick={() => setCart(p => p.map(c => c.productId===ci.productId ? {...c,qty:Math.max(1,c.qty-1)} : c))}
                            style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Minus size={13} color="white" />
                          </button>
                          <span style={{ color:'white', fontWeight:700, minWidth:16, textAlign:'center' }}>{ci.qty}</span>
                          <button onClick={() => setCart(p => p.map(c => c.productId===ci.productId ? {...c,qty:c.qty+1} : c))}
                            style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.1)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <Plus size={13} color="white" />
                          </button>
                          <button onClick={() => setCart(p => p.filter(c => c.productId!==ci.productId))}
                            style={{ width:28, height:28, borderRadius:'50%', background:'rgba(239,68,68,0.15)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', marginLeft:2 }}>
                            <X size={13} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)', marginTop:16, paddingTop:14 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                      <span style={{ color:'white', fontWeight:600 }}>Total</span>
                      <span style={{ color:'#F59E0B', fontWeight:900, fontSize:22 }}>{fmt(cartTotal)}</span>
                    </div>
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=Hi! I'd like to order:%0A%0A${cart.map(c=>`• ${c.title} x${c.qty} — ${fmt(c.price_kobo*c.qty)}`).join('%0A')}%0A%0ATotal: ${fmt(cartTotal)}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{
                        display:'flex', alignItems:'center', justifyContent:'center', gap:10,
                        width:'100%', padding:'16px 0', borderRadius:18, border:'none', cursor:'pointer',
                        background:'#25D366', color:'white', fontWeight:700, fontSize:15,
                        textDecoration:'none', boxShadow:'0 8px 24px rgba(37,211,102,0.3)',
                      }}>
                      <MessageCircle size={20} />
                      Order via WhatsApp · {fmt(cartTotal)}
                    </a>
                    <p style={{ textAlign:'center', color:'rgba(255,255,255,0.25)', fontSize:11, marginTop:10 }}>
                      Your order will be confirmed on WhatsApp
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp */}
      <a href={`https://wa.me/${WA_NUMBER}?text=Hi`} target="_blank" rel="noopener noreferrer"
        style={{
          position:'fixed', bottom:20, right:20, zIndex:50,
          width:52, height:52, borderRadius:'50%',
          background:'#25D366', display:'flex', alignItems:'center', justifyContent:'center',
          boxShadow:'0 6px 20px rgba(37,211,102,0.45)', textDecoration:'none',
        }}>
        <MessageCircle size={24} color="white" />
      </a>

      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-6px)}}
      `}</style>
    </div>
  );
}
