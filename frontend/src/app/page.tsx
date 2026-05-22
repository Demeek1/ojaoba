'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus, Heart, Bell, X, MessageCircle, Search } from 'lucide-react';
import api, { fmt } from '@/lib/api';
import { loadCart, saveCart, CartItem } from '@/lib/cart';

const WA = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';

/* ── Category helpers ── */
const CAT_ICONS: Record<string, string> = {
  grains:'🌾',rice:'🍚',vegetables:'🥦',veggies:'🥦',fruits:'🍎',meat:'🥩',
  fish:'🐟',seafood:'🦐',dairy:'🥛',beverages:'🥤',drinks:'🥤',snacks:'🍿',
  condiments:'🫙',spices:'🌶️',cooking:'🍳',frozen:'❄️',poultry:'🍗',
  chicken:'🍗',eggs:'🥚',alcoholic:'🍾',baby:'👶',baking:'🧁',cereals:'🥣',
  household:'🏠',oils:'🫙',pasta:'🍝',provision:'🛒',
};
const FALLBACKS = ['🥕','🍅','🌽','🧅','🧄','🫚','🍋','🥝','🌿','🛒'];
const GRADS = [
  ['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#10B981','#059669'],
  ['#8B5CF6','#7C3AED'],['#3B82F6','#1D4ED8'],['#F97316','#EA580C'],
  ['#EC4899','#DB2777'],['#14B8A6','#0D9488'],['#A78BFA','#7C3AED'],
];
function icon(n: string) {
  const lo = n.toLowerCase();
  for (const [k,v] of Object.entries(CAT_ICONS)) if (lo.includes(k)) return v;
  let h = 0; for (const c of n) h=(h*31+c.charCodeAt(0))&0xffff;
  return FALLBACKS[h%FALLBACKS.length];
}
function grad(n: string): [string,string] {
  let h = 0; for (const c of n) h=(h*31+c.charCodeAt(0))&0xffff;
  return GRADS[h%GRADS.length] as [string,string];
}

interface Product {
  id:string; title:string; price_kobo:number;
  compare_price_kobo:number|null; image_url:string;
  category:string; description:string; inventory:number;
}

export default function HomePage() {
  const router = useRouter();
  const [cat, setCat]         = useState('');
  const [favs, setFavs]       = useState<string[]>([]);
  const [cart, setCartState]  = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  /* Load cart from localStorage once on mount */
  useEffect(() => { setCartState(loadCart()); }, []);

  /* Persist cart to localStorage on every change */
  function setCart(fn: (prev: CartItem[]) => CartItem[]) {
    setCartState(prev => {
      const next = fn(prev);
      saveCart(next);
      return next;
    });
  }

  const scrollRef  = useRef<HTMLDivElement>(null);
  const slideMap   = useRef<Map<number, HTMLDivElement>>(new Map());
  const touchX     = useRef(0);
  const touchY     = useRef(0);

  /* ── Data ── */
  const { data: rawCats = [] } = useQuery<string[]>({
    queryKey: ['cats'],
    queryFn: () => api.get('/products/categories').then(r =>
      Array.isArray(r.data) ? r.data.map((c:any) => typeof c==='string'?c:c.name) : []
    ),
  });

  const { data: feed, isLoading } = useQuery({
    queryKey: ['feed', cat],
    queryFn: () => {
      const p: Record<string,string> = { page:'1', limit:'30' };
      if (cat) p.category = cat;
      return api.get('/products', { params:p }).then(r => r.data);
    },
    staleTime: 30000,
  });

  const products: Product[] = feed?.products ?? [];
  const allCats = ['', ...rawCats];

  /* Reset scroll on category change */
  const prevCat = useRef(cat);
  if (prevCat.current !== cat) {
    prevCat.current = cat;
    scrollRef.current?.scrollTo({ top:0, behavior:'instant' as ScrollBehavior });
  }

  /* Swipe left/right → change category */
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchX.current - e.changedTouches[0].clientX;
    const dy = touchY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 55) {
      const ci = allCats.indexOf(cat);
      if (dx > 0) setCat(allCats[(ci+1) % allCats.length]);      // swipe left → next
      else        setCat(allCats[(ci-1+allCats.length) % allCats.length]); // swipe right → prev
    }
  }

  /* ── Cart helpers ── */
  const cartCount = cart.reduce((s,c) => s+c.qty, 0);
  const cartTotal = cart.reduce((s,c) => s+c.price_kobo*c.qty, 0);

  function getCartQty(id: string) { return cart.find(c=>c.id===id)?.qty ?? 0; }

  function increment(p: Product) {
    setCart(prev => {
      const ex = prev.find(c=>c.id===p.id);
      if (ex) return prev.map(c=>c.id===p.id?{...c,qty:c.qty+1}:c);
      return [...prev,{id:p.id,qty:1,title:p.title,price_kobo:p.price_kobo,image_url:p.image_url,note:''}];
    });
  }
  function decrement(id: string) {
    setCart(prev => {
      const ex = prev.find(c=>c.id===id);
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter(c=>c.id!==id);
      return prev.map(c=>c.id===id?{...c,qty:c.qty-1}:c);
    });
  }

  return (
    <div style={{ height:'100dvh', background:'#000', display:'flex', justifyContent:'center', overflow:'hidden', overflowX:'hidden' }}>
      <div
        style={{ position:'relative', width:'100%', maxWidth:430, height:'100dvh', overflow:'hidden', overflowX:'hidden', background:'#0D001A' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >

        {/* ── HEADER ── */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, zIndex:50,
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'10px 14px',
          background:'linear-gradient(to bottom,rgba(0,0,0,0.82) 0%,transparent 100%)',
        }}>
          <button style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.12)',border:'none',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
            <Bell size={19} color="#F59E0B" />
          </button>
          <img src="/OJAOBA.LOGO.jpg" alt="OjaOba" style={{ height:34, borderRadius:8, objectFit:'contain' }} />
          <button onClick={()=>setCartOpen(true)} style={{
            position:'relative',width:38,height:38,borderRadius:'50%',
            background:'rgba(245,158,11,0.18)',border:'1.5px solid rgba(245,158,11,0.35)',
            display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',
          }}>
            <ShoppingCart size={19} color="#F59E0B" />
            {cartCount>0&&(
              <span style={{ position:'absolute',top:-4,right:-4,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:'#EF4444',color:'white',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>
                {cartCount}
              </span>
            )}
          </button>
        </div>

        {/* ── CATEGORY STORIES ── */}
        <div style={{
          position:'absolute',top:54,left:0,right:0,zIndex:40,
          display:'flex',gap:10,overflowX:'auto',padding:'6px 12px 8px',
          scrollbarWidth:'none',
          background:'linear-gradient(to bottom,rgba(0,0,0,0.55) 0%,transparent 100%)',
        }}>
          {allCats.map((c,i) => {
            const name   = c || 'All';
            const ic     = c ? icon(c) : '🛒';
            const [g1,g2]= c ? grad(c) : ['#F59E0B','#D97706'];
            const active = cat===c;
            return (
              <button key={c||'all'} onClick={()=>setCat(c)}
                style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4,flexShrink:0,background:'none',border:'none',cursor:'pointer',padding:0 }}>
                <div style={{
                  borderRadius:'50%',padding:2.5,transition:'all 0.2s',
                  background:active?`linear-gradient(135deg,${g1},${g2})`:'rgba(255,255,255,0.18)',
                  boxShadow:active?`0 0 14px ${g1}88`:'none',
                }}>
                  <div style={{
                    width:48,height:48,borderRadius:'50%',fontSize:20,
                    display:'flex',alignItems:'center',justifyContent:'center',
                    background:active?`${g1}28`:'rgba(10,0,20,0.7)',
                    border:active?'none':'1.5px solid rgba(255,255,255,0.1)',
                  }}>{ic}</div>
                </div>
                <span style={{ fontSize:10,fontWeight:600,color:active?g1:'rgba(255,255,255,0.55)',maxWidth:52,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                  {name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SNAP SCROLL FEED ── */}
        <div ref={scrollRef} style={{ width:'100%',height:'100%',overflowY:'scroll',scrollSnapType:'y mandatory',scrollbarWidth:'none' }}>

          {isLoading && (
            <div style={{ height:'100dvh',scrollSnapAlign:'start',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:36,height:36,border:'3px solid rgba(245,158,11,0.15)',borderTop:'3px solid #F59E0B',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!isLoading&&!products.length&&(
            <div style={{ height:'100dvh',scrollSnapAlign:'start',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 }}>
              <span style={{ fontSize:48 }}>🛒</span>
              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:14 }}>No products found</p>
            </div>
          )}

          {products.map((p,i)=>{
            const cqty   = getCartQty(p.id);
            const isFav  = favs.includes(p.id);
            const soldOut= p.inventory===0;
            const [g1,g2]= grad(p.category);

            return (
              <div key={p.id} data-i={i}
                ref={el=>{ if(el) slideMap.current.set(i,el); else slideMap.current.delete(i); }}
                style={{ position:'relative',width:'100%',height:'100dvh',scrollSnapAlign:'start',flexShrink:0,overflow:'hidden' }}>

                {/* Background */}
                {p.image_url ? (
                  <>
                    {/* Blurred background fills the full screen */}
                    <img src={p.image_url} alt="" aria-hidden style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',filter:'blur(28px) brightness(0.45) saturate(1.3)',transform:'scale(1.08)' }} />
                    {/* Full product image — never cropped */}
                    <img src={p.image_url} alt={p.title} style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',objectPosition:'center 40%' }} />
                  </>
                ) : (
                  <div style={{ position:'absolute',inset:0,background:`linear-gradient(160deg,${g1},${g2},#0D001A)`,display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <span style={{ fontSize:120,opacity:0.25 }}>{icon(p.category)}</span>
                  </div>
                )}

                {/* Overlays */}
                <div style={{ position:'absolute',inset:0,background:'rgba(10,0,20,0.25)' }} />
                <div style={{ position:'absolute',top:0,left:0,right:0,height:160,background:'linear-gradient(to bottom,rgba(0,0,0,0.65),transparent)' }} />
                <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'60%',background:'linear-gradient(to top,rgba(0,0,0,0.95) 0%,rgba(0,0,0,0.65) 55%,transparent 100%)' }} />

                {/* ── RIGHT ACTIONS ── */}
                <div style={{ position:'absolute',right:14,bottom:155,zIndex:10,display:'flex',flexDirection:'column',alignItems:'center',gap:14 }}>

                  {/* View Cart */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button onClick={()=>setCartOpen(true)} style={{
                      width:50,height:50,borderRadius:'50%',border:'1.5px solid rgba(245,158,11,0.4)',
                      background:'rgba(245,158,11,0.15)',backdropFilter:'blur(10px)',
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                    }}>
                      <ShoppingCart size={22} color="#F59E0B" />
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.55)',fontSize:10 }}>{cartCount>0?cartCount:'Cart'}</span>
                  </div>

                  {/* Plus — add to cart */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:3 }}>
                    <button disabled={soldOut} onClick={()=>increment(p)} style={{
                      width:50,height:50,borderRadius:'50%',
                      border:`1.5px solid ${soldOut?'rgba(255,255,255,0.1)':'rgba(255,255,255,0.25)'}`,
                      background:soldOut?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.45)',
                      backdropFilter:'blur(10px)',cursor:soldOut?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      opacity:soldOut?0.4:1,transition:'transform 0.1s',
                    }}>
                      <Plus size={24} color="white" />
                    </button>
                    {/* qty count — shows 0 when not in cart */}
                    <span style={{ color:cqty>0?'#F59E0B':'rgba(255,255,255,0.45)', fontSize:16, fontWeight:700, lineHeight:1 }}>
                      {cqty}
                    </span>
                  </div>

                  {/* Minus */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button onClick={()=>decrement(p.id)} disabled={cqty===0} style={{
                      width:50,height:50,borderRadius:'50%',
                      border:'1.5px solid rgba(255,255,255,0.22)',
                      background:'rgba(0,0,0,0.45)',backdropFilter:'blur(10px)',
                      cursor:cqty===0?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',
                      opacity:cqty===0?0.35:1,transition:'opacity 0.15s',
                    }}>
                      <Minus size={24} color="white" />
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.35)',fontSize:10 }}>Qty</span>
                  </div>

                  {/* Heart */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button onClick={()=>setFavs(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id])} style={{
                      width:50,height:50,borderRadius:'50%',
                      border:`1.5px solid ${isFav?'#EF4444':'rgba(255,255,255,0.22)'}`,
                      background:isFav?'rgba(239,68,68,0.22)':'rgba(0,0,0,0.45)',
                      backdropFilter:'blur(10px)',cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s',
                    }}>
                      <Heart size={22} color={isFav?'#EF4444':'white'} fill={isFav?'#EF4444':'none'} />
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.35)',fontSize:10 }}>Save</span>
                  </div>
                </div>

                {/* ── BOTTOM INFO ── */}
                <div style={{ position:'absolute',bottom:0,left:0,right:68,padding:'0 16px 28px',zIndex:10 }}>
                  <div style={{ display:'inline-block',padding:'4px 12px',borderRadius:20,marginBottom:8,background:`linear-gradient(135deg,${g1},${g2})`,fontSize:11,fontWeight:700,color:'white' }}>
                    {p.category}
                  </div>
                  <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:6 }}>
                    <h2 style={{ color:'white',fontWeight:800,fontSize:17,lineHeight:1.3,margin:0,flex:1 }}>{p.title}</h2>
                    <div style={{ flexShrink:0,textAlign:'right' }}>
                      <div style={{ color:'#F59E0B',fontWeight:900,fontSize:20 }}>{fmt(p.price_kobo)}</div>
                      {p.compare_price_kobo&&p.compare_price_kobo>p.price_kobo&&(
                        <div style={{ color:'rgba(255,255,255,0.3)',fontSize:12,textDecoration:'line-through' }}>{fmt(p.compare_price_kobo)}</div>
                      )}
                    </div>
                  </div>
                  {p.description&&(
                    <p style={{ color:'rgba(255,255,255,0.55)',fontSize:13,lineHeight:1.5,margin:'0 0 10px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden' }}>
                      {p.description}
                    </p>
                  )}
                  {soldOut&&<span style={{ color:'#F87171',fontSize:12,fontWeight:600 }}>⚠ Out of stock</span>}
                  {!soldOut&&p.inventory>0&&p.inventory<=5&&<span style={{ color:'#FB923C',fontSize:12,fontWeight:600 }}>Only {p.inventory} left!</span>}
                  <div style={{ marginTop:12 }}>
                    <Link href="/shop" style={{ display:'inline-flex',alignItems:'center',justifyContent:'center',width:42,height:42,borderRadius:'50%',textDecoration:'none',background:'rgba(255,255,255,0.13)',backdropFilter:'blur(8px)',border:'1.5px solid rgba(255,255,255,0.2)' }}>
                      <Search size={18} color="white" />
                    </Link>
                  </div>
                </div>

                {i===0&&products.length>1&&(
                  <div style={{ position:'absolute',bottom:10,left:'50%',transform:'translateX(-50%)',display:'flex',flexDirection:'column',alignItems:'center',gap:3,opacity:0.4,animation:'bounce 2s ease-in-out infinite',zIndex:10 }}>
                    <div style={{ width:1.5,height:18,background:'white',borderRadius:1 }} />
                    <span style={{ color:'white',fontSize:9,letterSpacing:1 }}>SCROLL</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ══ CART DRAWER ══ */}
      {cartOpen&&(
        <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
          <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.72)' }} onClick={()=>setCartOpen(false)} />
          <div style={{
            position:'relative',width:'100%',maxWidth:430,
            maxHeight:'88dvh',overflowY:'auto',scrollbarWidth:'none',
            background:'#0D001A',borderRadius:'22px 22px 0 0',
            border:'1px solid rgba(245,158,11,0.18)',borderBottom:'none',
          }}>
            <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.18)',margin:'12px auto 0' }} />
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color:'white',fontWeight:700,fontSize:16 }}>Cart <span style={{ color:'rgba(255,255,255,0.3)',fontWeight:400,fontSize:13 }}>({cartCount})</span></span>
              <button onClick={()=>setCartOpen(false)} style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <X size={16} color="white" />
              </button>
            </div>

            <div style={{ padding:'0 16px 28px' }}>
              {cart.length===0?(
                <div style={{ textAlign:'center',padding:'40px 0' }}>
                  <ShoppingCart size={44} color="rgba(255,255,255,0.1)" style={{ margin:'0 auto 10px' }} />
                  <p style={{ color:'rgba(255,255,255,0.3)',fontSize:14 }}>Your cart is empty</p>
                  <p style={{ color:'rgba(255,255,255,0.2)',fontSize:12,marginTop:4 }}>Tap + on any product to add it</p>
                </div>
              ):(
                <>
                  <div style={{ display:'flex',flexDirection:'column',gap:9,marginTop:12 }}>
                    {cart.map(ci=>(
                      <div key={ci.id} style={{ display:'flex',alignItems:'center',gap:10,padding:10,borderRadius:14,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ width:50,height:50,borderRadius:10,overflow:'hidden',flexShrink:0,background:'rgba(255,255,255,0.07)' }}>
                          {ci.image_url?<img src={ci.image_url} alt={ci.title} style={{ width:'100%',height:'100%',objectFit:'cover' }} />:<div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🛒</div>}
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <p style={{ color:'white',fontSize:13,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ci.title}</p>
                          <p style={{ color:'#F59E0B',fontSize:12,margin:'2px 0 0' }}>{fmt(ci.price_kobo)} × {ci.qty} = <b>{fmt(ci.price_kobo*ci.qty)}</b></p>
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:5,flexShrink:0 }}>
                          <button onClick={()=>decrement(ci.id)} style={{ width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Minus size={12} color="white" /></button>
                          <span style={{ color:'white',fontWeight:700,minWidth:16,textAlign:'center',fontSize:13 }}>{ci.qty}</span>
                          <button onClick={()=>setCart(prev=>prev.map(c=>c.id===ci.id?{...c,qty:c.qty+1}:c))} style={{ width:26,height:26,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}><Plus size={12} color="white" /></button>
                          <button onClick={()=>setCart(p=>p.filter(c=>c.id!==ci.id))} style={{ width:26,height:26,borderRadius:'50%',background:'rgba(239,68,68,0.15)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',marginLeft:2 }}><X size={12} color="#EF4444" /></button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ borderTop:'1px solid rgba(255,255,255,0.07)',marginTop:14,paddingTop:14 }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14 }}>
                      <span style={{ color:'white',fontWeight:600 }}>Total</span>
                      <span style={{ color:'#F59E0B',fontWeight:900,fontSize:22 }}>{fmt(cartTotal)}</span>
                    </div>
                    <button
                      onClick={()=>{ setCartOpen(false); router.push('/checkout'); }}
                      style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:9,width:'100%',padding:'16px 0',borderRadius:16,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:800,fontSize:16,border:'none',cursor:'pointer',boxShadow:'0 8px 24px rgba(245,158,11,0.35)' }}>
                      🛒 Proceed to Checkout
                    </button>
                    <p style={{ textAlign:'center',color:'rgba(255,255,255,0.22)',fontSize:11,marginTop:9 }}>
                      Enter address & pay securely via Paystack
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        ::-webkit-scrollbar{display:none;}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-7px)}}
      `}</style>
    </div>
  );
}
