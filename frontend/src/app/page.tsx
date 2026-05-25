'use client';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Plus, Minus, Heart, User, X, ChevronDown, ChevronUp, ChevronLeft, LayoutGrid } from 'lucide-react';
import api, { fmt } from '@/lib/api';
import { loadCart, saveCart, CartItem } from '@/lib/cart';

const WA = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';

/* ── Category images ── */
const CAT_IMAGES: Record<string, string> = {
  grains:'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=160&h=160&fit=crop&q=70',
  rice:'https://images.unsplash.com/photo-1536304929831-ee1ca9d44906?w=160&h=160&fit=crop&q=70',
  vegetables:'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&h=160&fit=crop&q=70',
  veggies:'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=160&h=160&fit=crop&q=70',
  fruits:'https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=160&h=160&fit=crop&q=70',
  meat:'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=160&h=160&fit=crop&q=70',
  fish:'https://images.unsplash.com/photo-1510130113581-3a927e100ccd?w=160&h=160&fit=crop&q=70',
  seafood:'https://images.unsplash.com/photo-1510130113581-3a927e100ccd?w=160&h=160&fit=crop&q=70',
  dairy:'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=160&h=160&fit=crop&q=70',
  beverages:'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=160&h=160&fit=crop&q=70',
  drinks:'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=160&h=160&fit=crop&q=70',
  snacks:'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=160&h=160&fit=crop&q=70',
  condiments:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=160&h=160&fit=crop&q=70',
  spices:'https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=160&h=160&fit=crop&q=70',
  frozen:'https://images.unsplash.com/photo-1584568694244-14fbdf83bd30?w=160&h=160&fit=crop&q=70',
  poultry:'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=160&h=160&fit=crop&q=70',
  chicken:'https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=160&h=160&fit=crop&q=70',
  eggs:'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=160&h=160&fit=crop&q=70',
  alcoholic:'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=160&h=160&fit=crop&q=70',
  baking:'https://images.unsplash.com/photo-1486427944544-d2c246c4df14?w=160&h=160&fit=crop&q=70',
  cereals:'https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=160&h=160&fit=crop&q=70',
  oils:'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=160&h=160&fit=crop&q=70',
  pasta:'https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=160&h=160&fit=crop&q=70',
  provision:'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=160&h=160&fit=crop&q=70',
};
const ALL_IMG  = 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=160&h=160&fit=crop&q=70';
const FALLBACK = 'https://images.unsplash.com/photo-1506617420156-8e4536971650?w=400&h=400&fit=crop&q=80';
const CAT_EMOJIS: Record<string,string> = {
  grains:'🌾',rice:'🍚',vegetables:'🥦',fruits:'🍎',meat:'🥩',fish:'🐟',
  dairy:'🥛',drinks:'🥤',snacks:'🍿',spices:'🌶️',frozen:'❄️',chicken:'🍗',
  eggs:'🥚',alcoholic:'🍾',baking:'🧁',cereals:'🥣',pasta:'🍝',
};
function catEmoji(n: string) {
  const lo = n.toLowerCase();
  for (const [k,v] of Object.entries(CAT_EMOJIS)) if (lo.includes(k)) return v;
  return '🛒';
}
function catImg(n: string) {
  if (!n) return ALL_IMG;
  const lo = n.toLowerCase();
  for (const [k,v] of Object.entries(CAT_IMAGES)) if (lo.includes(k)) return v;
  return FALLBACK;
}
const GRADS = [
  ['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#10B981','#059669'],
  ['#8B5CF6','#7C3AED'],['#3B82F6','#1D4ED8'],['#F97316','#EA580C'],
  ['#EC4899','#DB2777'],['#14B8A6','#0D9488'],
];
function grad(n: string): [string,string] {
  let h = 0; for (const c of n) h=(h*31+c.charCodeAt(0))&0xffff;
  return GRADS[h%GRADS.length] as [string,string];
}

/* ── Types ── */
interface Variant {
  id: string; title: string | null;
  priceKobo: number; inventory: number | null; available: boolean;
}
interface Product {
  id:string; title:string; price_kobo:number;
  compare_price_kobo:number|null; image_url:string;
  category:string; description:string; inventory:number;
  variants?: Variant[];
}

/* ── Variant helpers ── */
function realVariants(p: Product): Variant[] {
  if (!p.variants) return [];
  const parsed = typeof p.variants === 'string' ? JSON.parse(p.variants) : p.variants;
  return (parsed as Variant[]).filter(v => v.title && v.title !== 'Default Title');
}
function priceRange(p: Product): { min:number; max:number } | null {
  const rv = realVariants(p).filter(v => v.available);
  if (rv.length < 2) return null;
  const prices = rv.map(v => v.priceKobo);
  const mn = Math.min(...prices), mx = Math.max(...prices);
  return mn === mx ? null : { min: mn, max: mx };
}

export default function HomePage() {
  const router = useRouter();
  const [cat, setCat]             = useState('');
  const [favs, setFavs]           = useState<string[]>([]);
  const [cart, setCartState]      = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen]   = useState(false);
  const [viewMode, setViewMode]           = useState<'feed'|'grid'>('feed');
  const [selectedProduct, setSelectedProduct] = useState<Product|null>(null);
  const [variantTarget, setVariantTarget] = useState<Product|null>(null);
  const [expandedDesc, setExpandedDesc]   = useState<Set<string>>(new Set());
  const [doubleTapFlash, setDoubleTapFlash] = useState<string>(''); // product id

  useEffect(() => { setCartState(loadCart()); }, []);
  function setCart(fn: (p: CartItem[]) => CartItem[]) {
    setCartState(prev => { const n = fn(prev); saveCart(n); return n; });
  }

  const feedRef    = useRef<HTMLDivElement>(null);
  const gridRef    = useRef<HTMLDivElement>(null);
  const touchX     = useRef(0);
  const touchY     = useRef(0);
  // double-tap tracking per slide
  const lastTap    = useRef<Record<string, number>>({});

  /* ── Data ── */
  const { data: rawCats = [] } = useQuery<string[]>({
    queryKey: ['cats'],
    queryFn: () => api.get('/products/categories').then(r =>
      Array.isArray(r.data) ? r.data.map((c:any) => typeof c==='string'?c:c.name) : []
    ),
    staleTime: 5*60*1000,
  });

  const [products, setProducts]       = useState<Product[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const nextPage   = useRef(1);
  const totalPages = useRef(1);
  const fetching   = useRef(false);
  const allLoaded  = useRef(false); // true once every page for this category is fetched

  const fetchPage = useCallback(async (page: number, replace: boolean) => {
    if (fetching.current) return;
    // Don't re-fetch if we've already loaded everything (grid protection)
    if (!replace && allLoaded.current) return;
    fetching.current = true;
    if (replace) setIsLoading(true); else setLoadingMore(true);
    try {
      const p: Record<string,string> = { page: String(page), limit: '24' }; // 24 = 8 full rows of 3
      if (cat) p.category = cat;
      const { data } = await api.get('/products', { params: p });
      const incoming: Product[] = (data.products ?? []).map((pr: any) => ({
        ...pr,
        variants: typeof pr.variants === 'string' ? JSON.parse(pr.variants) : (pr.variants ?? []),
      }));
      totalPages.current = data.totalPages ?? 1;
      const isLast = page >= totalPages.current;
      // Feed wraps to 1 so it loops; grid uses allLoaded to stop
      nextPage.current = isLast ? 1 : page + 1;
      allLoaded.current = isLast;
      setProducts(prev => replace ? incoming : [...prev, ...incoming]);
    } finally {
      fetching.current = false;
      if (replace) setIsLoading(false); else setLoadingMore(false);
    }
  }, [cat]);

  useEffect(() => {
    nextPage.current = 1;
    allLoaded.current = false;
    feedRef.current?.scrollTo({ top:0, behavior:'instant' as ScrollBehavior });
    fetchPage(1, true);
    // Stay in whatever view the user is in; only reset detail overlay
    setSelectedProduct(null);
  }, [cat]); // eslint-disable-line

  useEffect(() => {
    const el = feedRef.current;
    if (!el) return;
    const onScroll = () => {
      const rem = el.scrollHeight - el.scrollTop - el.clientHeight;
      // Feed can loop — no allLoaded check here
      if (rem < el.clientHeight * 2 && !fetching.current) fetchPage(nextPage.current, false);
    };
    el.addEventListener('scroll', onScroll, { passive:true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [fetchPage]);

  // Grid: load more as user scrolls — stops correctly when all products are loaded
  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const tryLoad = () => {
      const rem = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (rem < el.clientHeight * 2 && !fetching.current && !allLoaded.current)
        fetchPage(nextPage.current, false);
    };
    el.addEventListener('scroll', tryLoad, { passive:true });
    return () => el.removeEventListener('scroll', tryLoad);
  }, [fetchPage, viewMode]);

  // Separate effect: when grid first becomes visible, immediately check if more
  // products need loading (avoids the stale-closure bug from a delayed timer)
  useEffect(() => {
    if (viewMode !== 'grid') return;
    const el = gridRef.current;
    if (!el) return;
    const raf = requestAnimationFrame(() => {
      const rem = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (rem < el.clientHeight * 2 && !fetching.current && !allLoaded.current)
        fetchPage(nextPage.current, false);
    });
    return () => cancelAnimationFrame(raf);
  }, [viewMode, fetchPage]); // eslint-disable-line

  const allCats = useMemo(() => ['', ...rawCats], [rawCats]);

  /* ── Swipe handler ── */
  function onTouchStart(e: React.TouchEvent) {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = touchX.current - e.changedTouches[0].clientX;
    const dy = touchY.current - e.changedTouches[0].clientY;
    // Need a clear horizontal swipe (more horizontal than vertical, and ≥ 60px)
    if (Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 60) return;
    if (viewMode === 'feed') {
      // Feed: left swipe only → open grid. Right swipe does nothing (prevents accidental category jump)
      if (dx > 0) setViewMode('grid');
    } else {
      // Grid: any horizontal swipe → go to feed view of next/prev category
      const ci = allCats.indexOf(cat);
      if (dx > 0) {
        // Swipe left → next category, open in feed
        setCat(allCats[(ci + 1) % allCats.length]);
      } else {
        // Swipe right → prev category, open in feed
        setCat(allCats[(ci - 1 + allCats.length) % allCats.length]);
      }
      setViewMode('feed');
    }
  }

  /* ── Cart helpers ── */
  const cartCount = cart.reduce((s,c) => s+c.qty, 0);
  const cartTotal = cart.reduce((s,c) => s+c.price_kobo*c.qty, 0);

  // Total qty for a product across ALL its variants
  // Cart ids are either `productId` (plain) or `productId__variantId` (variant)
  function getQty(productId: string) {
    return cart
      .filter(c => c.id === productId || c.id.startsWith(productId + '__'))
      .reduce((s, c) => s + c.qty, 0);
  }

  function addProduct(p: Product, variant?: Variant) {
    const id    = variant ? `${p.id}__${variant.id}` : p.id;
    const title = variant?.title ? `${p.title} (${variant.title})` : p.title;
    const price = variant ? variant.priceKobo : p.price_kobo;
    setCart(prev => {
      const ex = prev.find(c=>c.id===id);
      if (ex) return prev.map(c=>c.id===id?{...c,qty:c.qty+1}:c);
      return [...prev,{id,qty:1,title,price_kobo:price,image_url:p.image_url,note:''}];
    });
  }

  function handleAddClick(p: Product) {
    const rv = realVariants(p);
    // Only show the variant picker when there are 2+ different sizes/options to choose from.
    // A single variant (e.g. "3L") means there's no choice — just add it directly.
    if (rv.length > 1) { setVariantTarget(p); return; }
    const singleVariant = rv.length === 1 ? rv[0] : undefined;
    addProduct(p, singleVariant);
  }

  // Decrement: finds exact id OR any variant of this product
  function decrement(productId: string) {
    setCart(prev => {
      const ex = prev.find(c => c.id === productId)
               ?? prev.find(c => c.id.startsWith(productId + '__'));
      if (!ex) return prev;
      if (ex.qty <= 1) return prev.filter(c => c.id !== ex.id);
      return prev.map(c => c.id === ex.id ? {...c, qty:c.qty-1} : c);
    });
  }

  function toggleDesc(id: string) {
    setExpandedDesc(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  /* ── Double-tap → add to cart ── */
  function handleSlideTap(p: Product) {
    const now  = Date.now();
    const last = lastTap.current[p.id] ?? 0;
    if (now - last < 350) {
      // double-tap!
      handleAddClick(p);
      setDoubleTapFlash(p.id);
      setTimeout(() => setDoubleTapFlash(''), 900);
    }
    lastTap.current[p.id] = now;
  }

  const HEADER_H  = 64;
  const STORIES_H = 96;
  const TOP_H     = HEADER_H + STORIES_H;

  return (
    <div style={{ height:'100dvh', background:'#2D0A4E', display:'flex', justifyContent:'center', overflow:'hidden' }}>
      <div style={{ position:'relative', width:'100%', maxWidth:430, height:'100dvh', overflow:'hidden', background:'#2D0A4E' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}>

        {/* ── HEADER ── */}
        <div style={{ position:'absolute',top:0,left:0,right:0,zIndex:50,height:HEADER_H,
          display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',
          background:'#2D0A4E',boxShadow:'0 2px 12px rgba(0,0,0,0.4)' }}>
          <Link href="/track" style={{ width:40,height:40,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <User size={20} color="#F59E0B" />
          </Link>
          <img src="/OJAOBA.LOGO.jpg" alt="OjaOba" style={{ height:36,borderRadius:8,objectFit:'contain' }} />
          <button onClick={()=>setCartOpen(true)} style={{ position:'relative',width:40,height:40,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1.5px solid rgba(245,158,11,0.35)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
            <ShoppingCart size={20} color="#F59E0B" />
            {cartCount>0&&<span style={{ position:'absolute',top:-4,right:-4,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:'#EF4444',color:'white',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>{cartCount}</span>}
          </button>
        </div>

        {/* ── CATEGORY STORIES ── */}
        <div style={{ position:'absolute',top:HEADER_H,left:0,right:0,zIndex:40,height:STORIES_H,
          display:'flex',alignItems:'center',overflowX:'auto',padding:'0 10px',
          scrollbarWidth:'none',background:'#2D0A4E',borderBottom:'1px solid rgba(245,158,11,0.12)' }}>
          {allCats.map(c => {
            const name   = c || 'All';
            const active = cat === c;
            return (
              <button key={c||'all'} onClick={()=>setCat(c)}
                style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:5,flexShrink:0,
                  background:'none',border:'none',cursor:'pointer',padding:'0 8px',
                  width:'calc(25vw - 4px)',maxWidth:100 }}>
                <div style={{ padding:3,borderRadius:'50%',
                  background:active?'linear-gradient(135deg,#F59E0B,#D97706)':'rgba(255,255,255,0.12)',
                  boxShadow:active?'0 0 16px rgba(245,158,11,0.6)':'none',transition:'all 0.2s' }}>
                  <div style={{ width:62,height:62,borderRadius:'50%',overflow:'hidden',
                    border:active?'2.5px solid #2D0A4E':'2px solid rgba(255,255,255,0.06)' }}>
                    <img src={catImg(c)} alt={name} loading="lazy"
                      style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                  </div>
                </div>
                <span style={{ fontSize:10,fontWeight:700,letterSpacing:.2,
                  color:active?'#F59E0B':'rgba(255,255,255,0.6)',
                  maxWidth:'100%',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                  {name}
                </span>
              </button>
            );
          })}
        </div>

        {/* ── SNAP-SCROLL FEED ── */}
        <div ref={feedRef}
          style={{ position:'absolute',top:TOP_H,left:0,right:0,bottom:0,
            overflowY:'scroll',scrollSnapType:'y mandatory',scrollbarWidth:'none' }}>

          {isLoading && (
            <div style={{ height:`calc(100dvh - ${TOP_H}px)`,scrollSnapAlign:'start',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:36,height:36,border:'3px solid rgba(245,158,11,0.15)',borderTop:'3px solid #F59E0B',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
            </div>
          )}

          {!isLoading && !products.length && (
            <div style={{ height:`calc(100dvh - ${TOP_H}px)`,scrollSnapAlign:'start',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12 }}>
              <span style={{ fontSize:48 }}>🛒</span>
              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:14 }}>No products found</p>
            </div>
          )}

          {products.map((p, i) => {
            const cqty       = getQty(p.id);
            const isFav      = favs.includes(p.id);
            const soldOut    = p.inventory === 0;
            const [g1,g2]    = grad(p.category);
            const range      = priceRange(p);
            const isExpanded = expandedDesc.has(p.id);
            const isFlashing = doubleTapFlash === p.id;

            return (
              <div key={p.id}
                style={{ position:'relative',width:'100%',height:`calc(100dvh - ${TOP_H}px)`,
                  scrollSnapAlign:'start',flexShrink:0,overflow:'hidden' }}
                onClick={() => handleSlideTap(p)}>

                {/* Background */}
                {p.image_url ? (
                  <div style={{ position:'absolute',inset:0,background:'#2D0A4E',zIndex:0 }} />
                ) : (
                  <div style={{ position:'absolute',inset:0,background:`linear-gradient(160deg,${g1},${g2},#2D0A4E)`,zIndex:0 }}>
                    <span style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:120,opacity:.18 }}>{catEmoji(p.category)}</span>
                  </div>
                )}

                {/* Product image */}
                {p.image_url && (
                  <img src={p.image_url} alt={p.title}
                    loading={i < 3 ? 'eager' : 'lazy'}
                    decoding="async"
                    fetchPriority={i === 0 ? 'high' : 'auto'}
                    className={i === 0 ? 'img-float' : ''}
                    style={{ position:'absolute',inset:0,width:'100%',height:'100%',
                      objectFit:'contain',objectPosition:'center 38%',zIndex:1 }} />
                )}

                {/* Bottom gradient for text readability only */}
                <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'50%',
                  background:'linear-gradient(to top,rgba(0,0,0,0.88) 0%,rgba(0,0,0,0.45) 55%,transparent 100%)',zIndex:2 }} />

                {/* ── Double-tap heart flash ── */}
                {isFlashing && (
                  <div style={{ position:'absolute',inset:0,zIndex:20,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
                    <div style={{ animation:'heart-pop 0.9s ease-out forwards' }}>
                      <span style={{ fontSize:90 }}>❤️</span>
                    </div>
                  </div>
                )}

                {/* ── RIGHT ACTIONS ── */}
                <div style={{ position:'absolute',right:12,bottom:140,zIndex:10,
                  display:'flex',flexDirection:'column',alignItems:'center',gap:14 }}>

                  {/* Cart */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button onClick={e=>{e.stopPropagation();setCartOpen(true);}}
                      style={{ position:'relative',width:52,height:52,borderRadius:'50%',
                        border:'2px solid #F59E0B',background:'rgba(245,158,11,0.22)',
                        backdropFilter:'blur(12px)',boxShadow:'0 0 18px rgba(245,158,11,0.4)',
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <ShoppingCart size={22} color="#F59E0B" />
                      {cartCount>0&&<span style={{ position:'absolute',top:-4,right:-4,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:'#EF4444',color:'white',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>{cartCount}</span>}
                    </button>
                    {cartCount===0&&<span style={{ color:'rgba(255,255,255,0.7)',fontSize:10,fontWeight:600,letterSpacing:.4 }}>Cart</span>}
                  </div>

                  {/* ADD */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button disabled={soldOut} className="btn-press"
                      onClick={e=>{e.stopPropagation();handleAddClick(p);}}
                      style={{ position:'relative',width:52,height:52,borderRadius:'50%',
                        border:`1.5px solid ${soldOut?'rgba(255,255,255,0.08)':cqty>0?'rgba(34,197,94,0.7)':'rgba(255,255,255,0.28)'}`,
                        background:soldOut?'rgba(255,255,255,0.04)':cqty>0?'rgba(34,197,94,0.18)':'rgba(0,0,0,0.5)',
                        backdropFilter:'blur(10px)',cursor:soldOut?'not-allowed':'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        opacity:soldOut?0.35:1,
                        boxShadow:cqty>0?'0 0 14px rgba(34,197,94,0.35)':'none' }}>
                      <Plus size={24} color={cqty>0?'#22C55E':'white'} />
                    </button>
                    <span style={{ color:cqty>0?'#22C55E':'rgba(255,255,255,0.5)',fontSize:10,fontWeight:600,letterSpacing:.3 }}>Add</span>
                  </div>

                  {/* Minus */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button disabled={cqty===0} className="btn-press"
                      onClick={e=>{e.stopPropagation();decrement(p.id);}}
                      style={{ width:52,height:52,borderRadius:'50%',
                        border:'1.5px solid rgba(255,255,255,0.2)',background:'rgba(0,0,0,0.5)',
                        backdropFilter:'blur(10px)',cursor:cqty===0?'not-allowed':'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center',
                        opacity:cqty===0?0.3:1,transition:'opacity 0.15s' }}>
                      <Minus size={22} color="white" />
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.35)',fontSize:10 }}>Remove</span>
                  </div>

                  {/* Heart / Save */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button onClick={e=>{e.stopPropagation();setFavs(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id]);}}
                      style={{ width:52,height:52,borderRadius:'50%',
                        border:`1.5px solid ${isFav?'#EF4444':'rgba(255,255,255,0.2)'}`,
                        background:isFav?'rgba(239,68,68,0.2)':'rgba(0,0,0,0.5)',
                        backdropFilter:'blur(10px)',cursor:'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s' }}>
                      <Heart size={22} color={isFav?'#EF4444':'white'} fill={isFav?'#EF4444':'none'} />
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.3)',fontSize:10 }}>Save</span>
                  </div>

                  {/* Grid — opens the grid panel */}
                  <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                    <button onClick={e=>{e.stopPropagation();setViewMode('grid');}}
                      style={{ width:52,height:52,borderRadius:'50%',
                        border:'1.5px solid rgba(255,255,255,0.2)',background:'rgba(0,0,0,0.5)',
                        backdropFilter:'blur(10px)',cursor:'pointer',
                        display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s' }}>
                      <LayoutGrid size={22} color="white" />
                    </button>
                    <span style={{ color:'rgba(255,255,255,0.3)',fontSize:10 }}>Grid</span>
                  </div>
                </div>

                {/* ── BOTTOM INFO ── */}
                <div style={{ position:'absolute',bottom:0,left:0,right:72,padding:'0 14px 24px',zIndex:10 }}>
                  {/* Category pill */}
                  <div style={{ display:'inline-block',padding:'3px 10px',borderRadius:20,marginBottom:8,
                    background:`linear-gradient(135deg,${g1},${g2})`,fontSize:11,fontWeight:700,color:'white' }}>
                    {p.category}
                  </div>

                  {/* Title — single line, ellipsis if too long */}
                  <h2 style={{ color:'white',fontWeight:800,fontSize:17,lineHeight:1.3,margin:'0 0 6px',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    {p.title}
                  </h2>

                  {/* Price — full width, very visible, always on ONE line */}
                  <div style={{ marginBottom:6 }}>
                    {range ? (
                      <p style={{ color:'#F59E0B',fontWeight:900,fontSize:22,margin:0,whiteSpace:'nowrap',
                        textShadow:'0 0 20px rgba(245,158,11,0.5)',letterSpacing:-.3 }}>
                        {fmt(range.min)} <span style={{ opacity:.6,fontSize:16 }}>–</span> {fmt(range.max)}
                      </p>
                    ) : (
                      <div style={{ display:'flex',alignItems:'baseline',gap:8,flexWrap:'nowrap' }}>
                        <span style={{ color:'#F59E0B',fontWeight:900,fontSize:22,
                          textShadow:'0 0 20px rgba(245,158,11,0.5)',whiteSpace:'nowrap' }}>
                          {fmt(p.price_kobo)}
                        </span>
                        {p.compare_price_kobo && p.compare_price_kobo>p.price_kobo && (
                          <span style={{ color:'rgba(255,255,255,0.3)',fontSize:13,textDecoration:'line-through',whiteSpace:'nowrap' }}>
                            {fmt(p.compare_price_kobo)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Description + MORE toggle */}
                  {p.description && (
                    <div style={{ marginBottom:6 }}>
                      <p style={{ color:'rgba(255,255,255,0.6)',fontSize:13,lineHeight:1.5,margin:0,
                        ...(isExpanded ? {} : { display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,overflow:'hidden' }) }}>
                        {p.description}
                      </p>
                      {p.description.length > 100 && (
                        <button onClick={e=>{e.stopPropagation();toggleDesc(p.id);}}
                          style={{ background:'none',border:'none',color:'#F59E0B',fontSize:12,fontWeight:700,
                            cursor:'pointer',padding:'3px 0 0',display:'flex',alignItems:'center',gap:3 }}>
                          {isExpanded ? <><ChevronUp size={13}/> Less</> : <><ChevronDown size={13}/> More</>}
                        </button>
                      )}
                    </div>
                  )}

                  {soldOut && <span style={{ color:'#F87171',fontSize:12,fontWeight:600 }}>⚠ Out of stock</span>}
                  {!soldOut && p.inventory>0 && p.inventory<=5 && (
                    <span style={{ color:'#FB923C',fontSize:12,fontWeight:600 }}>Only {p.inventory} left!</span>
                  )}
                </div>

                {/* Scroll hint */}
                {i===0 && products.length>1 && (
                  <div style={{ position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',
                    display:'flex',flexDirection:'column',alignItems:'center',gap:2,
                    opacity:0.38,animation:'bounce 2s ease-in-out infinite',zIndex:10,pointerEvents:'none' }}>
                    <div style={{ width:1.5,height:14,background:'white',borderRadius:1 }} />
                    <span style={{ color:'white',fontSize:8,letterSpacing:1 }}>SCROLL</span>
                  </div>
                )}

                {/* Swipe-left → grid hint (every card) */}
                <div style={{ position:'absolute',top:'50%',right:0,transform:'translateY(-50%)',
                  zIndex:10,pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center',
                  gap:2,padding:'8px 6px',animation:'grid-hint 4s ease-in-out infinite' }}>
                  <div style={{ width:3,height:32,borderRadius:2,
                    background:'linear-gradient(to bottom,transparent,rgba(255,255,255,0.5),transparent)' }} />
                  <span style={{ color:'rgba(255,255,255,0.45)',fontSize:8,fontWeight:700,letterSpacing:.5,
                    writingMode:'vertical-rl',textOrientation:'mixed' }}>GRID</span>
                </div>
              </div>
            );
          })}

          {loadingMore && (
            <div style={{ height:`calc(100dvh - ${TOP_H}px)`,scrollSnapAlign:'start',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <div style={{ width:32,height:32,border:'3px solid rgba(245,158,11,0.15)',borderTop:'3px solid #F59E0B',borderRadius:'50%',animation:'spin 0.8s linear infinite' }} />
            </div>
          )}
        </div>

        {/* ── GRID PANEL ── slides in from right on swipe-left ── */}
        <div style={{ position:'absolute',top:TOP_H,left:0,right:0,bottom:0,
          background:'#2D0A4E',zIndex:20,display:'flex',flexDirection:'column',
          transform:viewMode==='grid'?'translateX(0)':'translateX(100%)',
          transition:'transform 0.32s cubic-bezier(0.22,1,0.36,1)' }}>

          {/* Grid header */}
          <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px 10px',
            borderBottom:'1px solid rgba(245,158,11,0.12)',flexShrink:0,
            background:'rgba(45,10,78,0.95)' }}>
            <button onClick={()=>setViewMode('feed')}
              style={{ width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.09)',
                border:'1px solid rgba(255,255,255,0.12)',cursor:'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <ChevronLeft size={20} color="white" />
            </button>
            <div style={{ minWidth:0 }}>
              <p style={{ color:'rgba(255,255,255,0.38)',fontSize:9,fontWeight:700,letterSpacing:1,
                margin:0,textTransform:'uppercase' }}>Category</p>
              <p style={{ color:'white',fontSize:14,fontWeight:800,margin:0,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                {cat || 'All Products'}
              </p>
            </div>
            <span style={{ marginLeft:'auto',color:'rgba(255,255,255,0.28)',fontSize:11,flexShrink:0 }}>
              {products.length}{allLoaded.current ? '' : '+'} items
            </span>
          </div>

          {/* Scroll wrapper — separated from grid layout for reliable iOS scroll */}
          <div ref={gridRef} style={{ flex:1,overflowY:'auto',overflowX:'hidden',
            WebkitOverflowScrolling:'touch' as any,scrollbarWidth:'none' }}>

            {/* Inner grid */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',
              gap:8,padding:'10px 8px 40px',alignItems:'start' }}>

            {products.map(p => {
              const range2    = priceRange(p);
              const [gg1,gg2] = grad(p.category);
              const gcqty     = getQty(p.id);
              const soldOutG  = p.inventory === 0;
              return (
                /* Card — image fills card, text overlaid at bottom */
                <div key={p.id}
                  onClick={()=>setSelectedProduct(p)}
                  style={{ position:'relative',borderRadius:12,overflow:'hidden',
                    cursor:'pointer',
                    border:`1.5px solid ${gcqty>0?'rgba(245,158,11,0.6)':'rgba(255,255,255,0.1)'}`,
                    boxShadow:gcqty>0?'0 0 10px rgba(245,158,11,0.25)':'none',
                    transition:'border-color 0.2s,box-shadow 0.2s',
                    background:p.image_url?'#111':`linear-gradient(135deg,${gg1},${gg2})` }}>

                  {/* Product image */}
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title}
                      loading="lazy" decoding="async"
                      onError={e=>{ (e.target as HTMLImageElement).style.display='none'; }}
                      style={{ width:'100%',aspectRatio:'3/4',objectFit:'cover',display:'block' }} />
                  ) : (
                    <div style={{ width:'100%',aspectRatio:'3/4',display:'flex',
                      alignItems:'center',justifyContent:'center',fontSize:32,opacity:.7 }}>
                      {catEmoji(p.category)}
                    </div>
                  )}

                  {/* Gradient overlay — name + price always readable */}
                  <div style={{ position:'absolute',bottom:0,left:0,right:0,
                    background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.55) 55%,transparent 100%)',
                    padding:'22px 7px 34px',pointerEvents:'none' }}>
                    <p style={{ color:'white',fontSize:11,fontWeight:700,margin:'0 0 2px',
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',lineHeight:1.3,
                      textShadow:'0 1px 4px rgba(0,0,0,0.8)' }}>
                      {p.title}
                    </p>
                    <p style={{ color:'#F59E0B',fontSize:12,fontWeight:900,margin:0,
                      overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                      textShadow:'0 1px 4px rgba(0,0,0,0.6)' }}>
                      {range2 ? `${fmt(range2.min)}–${fmt(range2.max)}` : fmt(p.price_kobo)}
                    </p>
                  </div>

                  {/* Sold out overlay */}
                  {soldOutG && (
                    <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.55)',
                      display:'flex',alignItems:'center',justifyContent:'center' }}>
                      <span style={{ color:'#F87171',fontSize:9,fontWeight:700,letterSpacing:.5,
                        background:'rgba(0,0,0,0.6)',padding:'2px 7px',borderRadius:6 }}>SOLD OUT</span>
                    </div>
                  )}

                  {/* Cart qty badge — top-left */}
                  {gcqty>0 && (
                    <div style={{ position:'absolute',top:5,left:5,minWidth:20,height:20,
                      borderRadius:10,background:'#EF4444',display:'flex',alignItems:'center',
                      justifyContent:'center',padding:'0 5px',zIndex:5,
                      boxShadow:'0 2px 6px rgba(0,0,0,0.5)' }}>
                      <span style={{ color:'white',fontSize:10,fontWeight:800,lineHeight:1 }}>{gcqty}</span>
                    </div>
                  )}

                  {/* + button — bottom-right, stops click propagation to card */}
                  <button disabled={soldOutG} className="btn-press"
                    onClick={e=>{ e.stopPropagation(); handleAddClick(p); }}
                    style={{ position:'absolute',bottom:7,right:7,
                      width:30,height:30,borderRadius:'50%',zIndex:5,
                      background:soldOutG?'rgba(0,0,0,0.45)':gcqty>0?'#F59E0B':'rgba(13,0,26,0.85)',
                      border:`2px solid ${soldOutG?'rgba(255,255,255,0.1)':gcqty>0?'#D97706':'rgba(245,158,11,0.9)'}`,
                      boxShadow:soldOutG?'none':gcqty>0?'0 0 12px rgba(245,158,11,0.7)':'0 2px 10px rgba(0,0,0,0.7)',
                      backdropFilter:'blur(6px)',
                      cursor:soldOutG?'not-allowed':'pointer',opacity:soldOutG?0.3:1,
                      display:'flex',alignItems:'center',justifyContent:'center',
                      padding:0,transition:'all 0.15s' }}>
                    <Plus size={16} color={gcqty>0&&!soldOutG?'#000':'#F59E0B'} strokeWidth={3} />
                  </button>
                </div>
              );
            })}

            {/* Grid loading more spinner — spans all 3 cols */}
            {loadingMore && (
              <div style={{ gridColumn:'1/-1',display:'flex',justifyContent:'center',
                alignItems:'center',padding:'20px 0',gap:8 }}>
                <div style={{ width:22,height:22,border:'2.5px solid rgba(245,158,11,0.15)',
                  borderTop:'2.5px solid #F59E0B',borderRadius:'50%',
                  animation:'spin 0.8s linear infinite' }} />
                <span style={{ color:'rgba(255,255,255,0.3)',fontSize:11 }}>Loading more…</span>
              </div>
            )}

            {/* End of list indicator */}
            {!loadingMore && allLoaded.current && products.length > 0 && (
              <div style={{ gridColumn:'1/-1',textAlign:'center',padding:'20px 0 8px' }}>
                <div style={{ display:'inline-flex',alignItems:'center',gap:6,
                  background:'rgba(245,158,11,0.08)',border:'1px solid rgba(245,158,11,0.18)',
                  borderRadius:20,padding:'6px 14px' }}>
                  <span style={{ fontSize:13 }}>✅</span>
                  <span style={{ color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600 }}>
                    All {products.length} products shown
                  </span>
                </div>
              </div>
            )}
            </div>{/* end inner grid */}
          </div>{/* end scroll wrapper */}
        </div>

        {/* ── PRODUCT DETAIL OVERLAY (tapped from grid) ── */}
        {selectedProduct && (()=>{
          const p        = selectedProduct;
          const cqty2    = getQty(p.id);
          const isFav2   = favs.includes(p.id);
          const soldOut2 = p.inventory === 0;
          const [h1,h2]  = grad(p.category);
          const range3   = priceRange(p);
          const isExp2   = expandedDesc.has(p.id);
          const isFlash2 = doubleTapFlash === p.id;
          return (
            <div key={p.id}
              style={{ position:'fixed',inset:0,zIndex:100,background:'#2D0A4E',
                animation:'slide-up 0.25s cubic-bezier(0.22,1,0.36,1)' }}>
              {/* Blurred bg */}
              {p.image_url ? (
                <img src={p.image_url} alt="" aria-hidden
                  style={{ position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',
                    filter:'blur(24px) saturate(1.2)',transform:'scale(1.08)',zIndex:0 }} />
              ) : (
                <div style={{ position:'absolute',inset:0,background:`linear-gradient(160deg,${h1},${h2},#2D0A4E)`,zIndex:0 }}>
                  <span style={{ position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',fontSize:120,opacity:.18 }}>
                    {catEmoji(p.category)}
                  </span>
                </div>
              )}
              {/* Product image */}
              {p.image_url && (
                <img src={p.image_url} alt={p.title}
                  style={{ position:'absolute',inset:0,width:'100%',height:'100%',
                    objectFit:'contain',objectPosition:'center 38%',zIndex:1 }} />
              )}
              {/* Bottom gradient */}
              <div style={{ position:'absolute',bottom:0,left:0,right:0,height:'55%',
                background:'linear-gradient(to top,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.48) 55%,transparent 100%)',zIndex:2 }} />
              {/* Back button */}
              <button onClick={()=>setSelectedProduct(null)}
                style={{ position:'absolute',top:16,left:14,zIndex:30,width:40,height:40,
                  borderRadius:'50%',background:'rgba(0,0,0,0.65)',backdropFilter:'blur(10px)',
                  border:'1px solid rgba(255,255,255,0.15)',cursor:'pointer',
                  display:'flex',alignItems:'center',justifyContent:'center' }}>
                <ChevronLeft size={22} color="white" />
              </button>
              {/* Double-tap flash */}
              {isFlash2 && (
                <div style={{ position:'absolute',inset:0,zIndex:20,display:'flex',
                  alignItems:'center',justifyContent:'center',pointerEvents:'none' }}>
                  <div style={{ animation:'heart-pop 0.9s ease-out forwards' }}>
                    <span style={{ fontSize:90 }}>❤️</span>
                  </div>
                </div>
              )}
              {/* RIGHT ACTIONS — detail overlay */}
              <div style={{ position:'absolute',right:12,bottom:140,zIndex:10,
                display:'flex',flexDirection:'column',alignItems:'center',gap:14 }}>
                {/* Cart */}
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <button onClick={()=>setCartOpen(true)}
                    style={{ position:'relative',width:52,height:52,borderRadius:'50%',
                      border:'2px solid #F59E0B',background:'rgba(245,158,11,0.22)',
                      backdropFilter:'blur(12px)',boxShadow:'0 0 18px rgba(245,158,11,0.4)',
                      cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <ShoppingCart size={22} color="#F59E0B" />
                    {cartCount>0&&<span style={{ position:'absolute',top:-4,right:-4,minWidth:18,height:18,padding:'0 4px',borderRadius:9,background:'#EF4444',color:'white',fontSize:10,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center' }}>{cartCount}</span>}
                  </button>
                  {cartCount===0&&<span style={{ color:'rgba(255,255,255,0.7)',fontSize:10,fontWeight:600 }}>Cart</span>}
                </div>
                {/* Add */}
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <button disabled={soldOut2} className="btn-press"
                    onClick={()=>handleAddClick(p)}
                    style={{ position:'relative',width:52,height:52,borderRadius:'50%',
                      border:`1.5px solid ${soldOut2?'rgba(255,255,255,0.08)':cqty2>0?'rgba(34,197,94,0.7)':'rgba(255,255,255,0.28)'}`,
                      background:soldOut2?'rgba(255,255,255,0.04)':cqty2>0?'rgba(34,197,94,0.18)':'rgba(0,0,0,0.5)',
                      backdropFilter:'blur(10px)',cursor:soldOut2?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',opacity:soldOut2?0.35:1,
                      boxShadow:cqty2>0?'0 0 14px rgba(34,197,94,0.35)':'none' }}>
                    <Plus size={24} color={cqty2>0?'#22C55E':'white'} />
                  </button>
                  <span style={{ color:cqty2>0?'#22C55E':'rgba(255,255,255,0.5)',fontSize:10,fontWeight:600,letterSpacing:.3 }}>Add</span>
                </div>
                {/* Remove */}
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <button disabled={cqty2===0} className="btn-press"
                    onClick={()=>decrement(p.id)}
                    style={{ width:52,height:52,borderRadius:'50%',
                      border:'1.5px solid rgba(255,255,255,0.2)',background:'rgba(0,0,0,0.5)',
                      backdropFilter:'blur(10px)',cursor:cqty2===0?'not-allowed':'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',opacity:cqty2===0?0.3:1 }}>
                    <Minus size={22} color="white" />
                  </button>
                  <span style={{ color:'rgba(255,255,255,0.35)',fontSize:10 }}>Remove</span>
                </div>
                {/* Save */}
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <button onClick={()=>setFavs(f=>f.includes(p.id)?f.filter(x=>x!==p.id):[...f,p.id])}
                    style={{ width:52,height:52,borderRadius:'50%',
                      border:`1.5px solid ${isFav2?'#EF4444':'rgba(255,255,255,0.2)'}`,
                      background:isFav2?'rgba(239,68,68,0.2)':'rgba(0,0,0,0.5)',
                      backdropFilter:'blur(10px)',cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center' }}>
                    <Heart size={22} color={isFav2?'#EF4444':'white'} fill={isFav2?'#EF4444':'none'} />
                  </button>
                  <span style={{ color:'rgba(255,255,255,0.3)',fontSize:10 }}>Save</span>
                </div>
                {/* Grid */}
                <div style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:4 }}>
                  <button onClick={()=>{ setSelectedProduct(null); setViewMode('grid'); }}
                    style={{ width:52,height:52,borderRadius:'50%',
                      border:'1.5px solid rgba(255,255,255,0.2)',background:'rgba(0,0,0,0.5)',
                      backdropFilter:'blur(10px)',cursor:'pointer',
                      display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s' }}>
                    <LayoutGrid size={22} color="white" />
                  </button>
                  <span style={{ color:'rgba(255,255,255,0.3)',fontSize:10 }}>Grid</span>
                </div>
              </div>
              {/* BOTTOM INFO */}
              <div style={{ position:'absolute',bottom:0,left:0,right:72,padding:'0 14px 34px',zIndex:10 }}>
                <div style={{ display:'inline-block',padding:'3px 10px',borderRadius:20,marginBottom:8,
                  background:`linear-gradient(135deg,${h1},${h2})`,fontSize:11,fontWeight:700,color:'white' }}>
                  {p.category}
                </div>
                <h2 style={{ color:'white',fontWeight:800,fontSize:20,lineHeight:1.3,margin:'0 0 6px',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                  {p.title}
                </h2>
                <div style={{ marginBottom:8 }}>
                  {range3 ? (
                    <p style={{ color:'#F59E0B',fontWeight:900,fontSize:26,margin:0,whiteSpace:'nowrap',
                      textShadow:'0 0 20px rgba(245,158,11,0.5)' }}>
                      {fmt(range3.min)} <span style={{ opacity:.6,fontSize:20 }}>–</span> {fmt(range3.max)}
                    </p>
                  ) : (
                    <div style={{ display:'flex',alignItems:'baseline',gap:8 }}>
                      <span style={{ color:'#F59E0B',fontWeight:900,fontSize:26,
                        textShadow:'0 0 20px rgba(245,158,11,0.5)',whiteSpace:'nowrap' }}>
                        {fmt(p.price_kobo)}
                      </span>
                      {p.compare_price_kobo && p.compare_price_kobo>p.price_kobo && (
                        <span style={{ color:'rgba(255,255,255,0.3)',fontSize:14,textDecoration:'line-through' }}>
                          {fmt(p.compare_price_kobo)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                {p.description && (
                  <div style={{ marginBottom:6 }}>
                    <p style={{ color:'rgba(255,255,255,0.65)',fontSize:14,lineHeight:1.55,margin:0,
                      ...(isExp2?{}:{ display:'-webkit-box',WebkitLineClamp:3,WebkitBoxOrient:'vertical' as any,overflow:'hidden' }) }}>
                      {p.description}
                    </p>
                    {p.description.length>100 && (
                      <button onClick={()=>toggleDesc(p.id)}
                        style={{ background:'none',border:'none',color:'#F59E0B',fontSize:12,fontWeight:700,
                          cursor:'pointer',padding:'3px 0 0',display:'flex',alignItems:'center',gap:3 }}>
                        {isExp2?<><ChevronUp size={13}/> Less</>:<><ChevronDown size={13}/> More</>}
                      </button>
                    )}
                  </div>
                )}
                {soldOut2&&<span style={{ color:'#F87171',fontSize:12,fontWeight:600 }}>⚠ Out of stock</span>}
                {!soldOut2&&p.inventory>0&&p.inventory<=5&&(
                  <span style={{ color:'#FB923C',fontSize:12,fontWeight:600 }}>Only {p.inventory} left!</span>
                )}
              </div>
            </div>
          );
        })()}

        {/* ── VARIANT PICKER BOTTOM SHEET ── */}
        {variantTarget && (
          <div style={{ position:'fixed',inset:0,zIndex:300,display:'flex',alignItems:'flex-end',justifyContent:'center' }}
            onClick={()=>setVariantTarget(null)}>
            <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.7)' }} />
            <div style={{ position:'relative',width:'100%',maxWidth:430,background:'#2D0A4E',
              borderRadius:'22px 22px 0 0',border:'1px solid rgba(245,158,11,0.2)',borderBottom:'none',
              paddingBottom:'env(safe-area-inset-bottom)' }}
              onClick={e=>e.stopPropagation()}>
              <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.15)',margin:'12px auto 0' }} />
              <div style={{ padding:'14px 18px 10px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                  {variantTarget.image_url && (
                    <img src={variantTarget.image_url} alt="" style={{ width:44,height:44,borderRadius:10,objectFit:'cover',flexShrink:0 }} />
                  )}
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.45)',fontSize:11,margin:'0 0 2px',fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>Choose size / variant</p>
                    <p style={{ color:'white',fontWeight:700,fontSize:15,margin:0 }}>{variantTarget.title}</p>
                  </div>
                </div>
              </div>
              <div style={{ padding:'12px 16px 20px',display:'flex',flexDirection:'column',gap:10 }}>
                {realVariants(variantTarget).map(v => {
                  const vid  = `${variantTarget.id}__${v.id}`;
                  const cqty = getQty(vid);
                  return (
                    <button key={v.id} disabled={!v.available}
                      onClick={()=>{ addProduct(variantTarget, v); setVariantTarget(null); }}
                      style={{ display:'flex',alignItems:'center',justifyContent:'space-between',
                        padding:'14px 16px',borderRadius:14,
                        background:cqty>0?'rgba(245,158,11,0.1)':'rgba(255,255,255,0.05)',
                        border:`1.5px solid ${cqty>0?'rgba(245,158,11,0.4)':'rgba(255,255,255,0.1)'}`,
                        cursor:v.available?'pointer':'not-allowed',opacity:v.available?1:0.4,transition:'all 0.15s' }}>
                      <div style={{ display:'flex',alignItems:'center',gap:10 }}>
                        <div style={{ width:36,height:36,borderRadius:8,background:'rgba(245,158,11,0.12)',border:'1px solid rgba(245,158,11,0.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                          <span style={{ fontSize:11,fontWeight:800,color:'#F59E0B' }}>{v.title}</span>
                        </div>
                        <div style={{ textAlign:'left' }}>
                          <p style={{ color:'white',fontWeight:700,fontSize:14,margin:0 }}>{v.title}</p>
                          {!v.available && <p style={{ color:'#F87171',fontSize:11,margin:0 }}>Out of stock</p>}
                          {cqty>0 && <p style={{ color:'#F59E0B',fontSize:11,margin:0 }}>{cqty} in cart</p>}
                        </div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <p style={{ color:'#F59E0B',fontWeight:900,fontSize:18,margin:0 }}>{fmt(v.priceKobo)}</p>
                        <p style={{ color:'rgba(255,255,255,0.35)',fontSize:11,margin:'2px 0 0' }}>tap to add</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CART DRAWER ── */}
        {cartOpen && (
          <div style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'flex-end',justifyContent:'center' }}>
            <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0.72)' }} onClick={()=>setCartOpen(false)} />
            <div style={{ position:'relative',width:'100%',maxWidth:430,maxHeight:'88dvh',overflowY:'auto',scrollbarWidth:'none',background:'#2D0A4E',borderRadius:'22px 22px 0 0',border:'1px solid rgba(245,158,11,0.18)',borderBottom:'none' }}>
              <div style={{ width:36,height:4,borderRadius:2,background:'rgba(255,255,255,0.18)',margin:'12px auto 0' }} />
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px 12px',borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ color:'white',fontWeight:700,fontSize:16 }}>Cart <span style={{ color:'rgba(255,255,255,0.3)',fontWeight:400,fontSize:13 }}>({cartCount})</span></span>
                <button onClick={()=>setCartOpen(false)} style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
                  <X size={16} color="white" />
                </button>
              </div>
              <div style={{ padding:'0 16px 28px' }}>
                {cart.length===0 ? (
                  <div style={{ textAlign:'center',padding:'40px 0' }}>
                    <ShoppingCart size={44} color="rgba(255,255,255,0.1)" style={{ margin:'0 auto 10px' }} />
                    <p style={{ color:'rgba(255,255,255,0.3)',fontSize:14 }}>Your cart is empty</p>
                    <p style={{ color:'rgba(255,255,255,0.2)',fontSize:12,marginTop:4 }}>Tap + on any product to add it</p>
                  </div>
                ) : (
                  <>
                    <div style={{ display:'flex',flexDirection:'column',gap:9,marginTop:12 }}>
                      {cart.map(ci => (
                        <div key={ci.id} style={{ display:'flex',alignItems:'center',gap:10,padding:10,borderRadius:14,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.06)' }}>
                          <div style={{ width:50,height:50,borderRadius:10,overflow:'hidden',flexShrink:0,background:'rgba(255,255,255,0.07)' }}>
                            {ci.image_url ? <img src={ci.image_url} alt={ci.title} style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22 }}>🛒</div>}
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
                      <button onClick={()=>{ setCartOpen(false); router.push('/checkout'); }}
                        style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:9,width:'100%',padding:'16px 0',borderRadius:16,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:800,fontSize:16,border:'none',cursor:'pointer',boxShadow:'0 8px 24px rgba(245,158,11,0.35)' }}>
                        🛒 Proceed to Checkout
                      </button>
                      <p style={{ textAlign:'center',color:'rgba(255,255,255,0.22)',fontSize:11,marginTop:9 }}>
                        Enter address &amp; pay securely via Paystack
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        ::-webkit-scrollbar { display:none; }
        @keyframes spin { to { transform:rotate(360deg) } }
        @keyframes bounce {
          0%,100% { transform:translateX(-50%) translateY(0) }
          50%      { transform:translateX(-50%) translateY(-6px) }
        }
        /* Gentle float on first product image — hints at scroll */
        .img-float {
          animation: img-float 3s ease-in-out infinite;
        }
        @keyframes img-float {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        /* Double-tap heart pop */
        @keyframes heart-pop {
          0%   { opacity:0; transform:scale(0.4); }
          25%  { opacity:1; transform:scale(1.2); }
          60%  { opacity:1; transform:scale(1.0); }
          100% { opacity:0; transform:scale(0.8); }
        }
        /* Button press feel */
        .btn-press { transition: transform 0.08s, box-shadow 0.08s; }
        .btn-press:active { transform: scale(0.82) !important; box-shadow: 0 0 0 rgba(0,0,0,0) !important; }
        /* Swipe-left GRID hint — pulses on right edge */
        @keyframes grid-hint {
          0%,100% { opacity:0.25; transform:translateY(-50%) translateX(0px); }
          40%      { opacity:0.75; transform:translateY(-50%) translateX(-4px); }
          60%      { opacity:0.75; transform:translateY(-50%) translateX(-4px); }
        }
        /* Product detail slide-up from grid tap */
        @keyframes slide-up {
          from { opacity:0; transform:translateY(24px) scale(0.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
