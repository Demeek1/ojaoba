'use client';
import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ShoppingCart, Plus, Minus, Heart, Bell, X, Check,
  ChevronLeft, ChevronRight, MessageCircle, ShoppingBag, Search
} from 'lucide-react';
import api, { fmt } from '@/lib/api';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';
const WA_LINK   = `https://wa.me/${WA_NUMBER}?text=Hi, I'd like to order from Ojaoba`;

const CATEGORY_ICONS: Record<string, string> = {
  grains: '🌾', rice: '🍚', vegetables: '🥦', veggies: '🥦',
  fruits: '🍎', meat: '🥩', fish: '🐟', seafood: '🦐',
  dairy: '🥛', beverages: '🥤', drinks: '🥤', snacks: '🍿',
  condiments: '🫙', spices: '🌶️', cooking: '🍳', frozen: '❄️',
  poultry: '🍗', chicken: '🍗', eggs: '🥚',
};

function getCategoryIcon(name: string): string {
  const lower = name.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  const fallbacks = ['🛒','🥕','🍅','🌽','🧅','🧄','🫚','🍋','🥝','🌿'];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return fallbacks[hash % fallbacks.length];
}

const GRAD_PAIRS = [
  ['#F59E0B','#D97706'], ['#EF4444','#DC2626'], ['#10B981','#059669'],
  ['#8B5CF6','#7C3AED'], ['#3B82F6','#1D4ED8'], ['#F97316','#EA580C'],
  ['#EC4899','#DB2777'], ['#14B8A6','#0D9488'],
];

interface Product {
  id: string; title: string; price_kobo: number;
  compare_price_kobo: number | null; image_url: string;
  category: string; description: string; inventory: number;
}

type CartItem = { productId: string; qty: number; title: string; price_kobo: number; image_url: string };

export default function HomePage() {
  const [activeCategory, setActiveCategory] = useState('');
  const [currentIdx, setCurrentIdx]         = useState(0);
  const [qty, setQty]                        = useState(1);
  const [cart, setCart]                      = useState<CartItem[]>([]);
  const [favorites, setFavorites]            = useState<string[]>([]);
  const [showCart, setShowCart]              = useState(false);
  const [addedAnim, setAddedAnim]            = useState(false);
  const storiesRef = useRef<HTMLDivElement>(null);

  /* ── Data ── */
  const { data: rawCategories = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(r =>
      Array.isArray(r.data) ? r.data.map((c: any) => (typeof c === 'string' ? c : c.name)) : []
    ),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['feed', activeCategory],
    queryFn: () => {
      const params: Record<string, string> = { page: '1', limit: '30' };
      if (activeCategory) params.category = activeCategory;
      return api.get('/products', { params }).then(r => r.data);
    },
    staleTime: 30000,
  });

  const products: Product[] = productsData?.products ?? [];

  /* Reset index when category or products change */
  const prevCategory = useRef(activeCategory);
  if (prevCategory.current !== activeCategory) {
    prevCategory.current = activeCategory;
    if (currentIdx !== 0) setCurrentIdx(0);
    if (qty !== 1) setQty(1);
  }

  const product = products[currentIdx] ?? null;

  /* ── Cart helpers ── */
  const cartCount = cart.reduce((s, c) => s + c.qty, 0);
  const cartTotal = cart.reduce((s, c) => s + c.price_kobo * c.qty, 0);

  function addToCart() {
    if (!product) return;
    setCart(prev => {
      const ex = prev.find(c => c.productId === product.id);
      if (ex) return prev.map(c => c.productId === product.id ? { ...c, qty: c.qty + qty } : c);
      return [...prev, { productId: product.id, qty, title: product.title, price_kobo: product.price_kobo, image_url: product.image_url }];
    });
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);
    setQty(1);
  }

  function toggleFav() {
    if (!product) return;
    setFavorites(prev => prev.includes(product.id) ? prev.filter(id => id !== product.id) : [...prev, product.id]);
  }

  function navPrev() { setCurrentIdx(i => (i - 1 + products.length) % products.length); setQty(1); }
  function navNext() { setCurrentIdx(i => (i + 1) % products.length); setQty(1); }

  const isFav = product ? favorites.includes(product.id) : false;
  const inCartQty = product ? (cart.find(c => c.productId === product.id)?.qty ?? 0) : 0;
  const outOfStock = product ? product.inventory === 0 : false;

  /* ── Category grad ── */
  function catGrad(name: string) {
    let hash = 0;
    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
    return GRAD_PAIRS[hash % GRAD_PAIRS.length];
  }

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(180deg,#1A0033 0%,#2D0052 60%,#1A0033 100%)' }}>

      {/* ══ HEADER ══ */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(26,0,51,0.96)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(245,158,11,0.12)' }}>
        <button className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <Bell size={20} color="#F59E0B" />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/OJAOBA.LOGO.jpg" alt="OjaOba" className="h-9 rounded-lg" style={{ objectFit: 'contain' }} />
        </div>

        {/* Cart */}
        <button className="relative p-2 rounded-full"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)' }}
          onClick={() => setShowCart(true)}>
          <ShoppingCart size={20} color="#F59E0B" />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center font-bold text-white"
              style={{ background: '#EF4444', fontSize: 10 }}>
              {cartCount > 99 ? '99+' : cartCount}
            </span>
          )}
        </button>
      </header>

      {/* ══ CATEGORY STORIES ══ */}
      <div className="pt-4 pb-2 px-3">
        <div ref={storiesRef} className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>

          {/* "All" story */}
          {(() => {
            const active = activeCategory === '';
            return (
              <button key="all" onClick={() => { setActiveCategory(''); setCurrentIdx(0); setQty(1); }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="rounded-full p-[3px] transition-all"
                  style={{
                    background: active ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'rgba(255,255,255,0.1)',
                    boxShadow: active ? '0 0 14px rgba(245,158,11,0.5)' : 'none',
                  }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)' }}>
                    🛒
                  </div>
                </div>
                <span className="text-xs font-semibold" style={{ color: active ? '#F59E0B' : 'rgba(255,255,255,0.55)', fontSize: 11 }}>All</span>
              </button>
            );
          })()}

          {rawCategories.map((cat, i) => {
            const active = activeCategory === cat;
            const [g1, g2] = catGrad(cat);
            return (
              <button key={cat} onClick={() => { setActiveCategory(cat); setCurrentIdx(0); setQty(1); }}
                className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="rounded-full p-[3px] transition-all"
                  style={{
                    background: active ? `linear-gradient(135deg,${g1},${g2})` : 'rgba(255,255,255,0.1)',
                    boxShadow: active ? `0 0 14px ${g1}88` : 'none',
                  }}>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                    style={{ background: active ? `${g1}22` : 'rgba(255,255,255,0.05)' }}>
                    {getCategoryIcon(cat)}
                  </div>
                </div>
                <span className="text-xs font-semibold truncate max-w-[56px]"
                  style={{ color: active ? g1 : 'rgba(255,255,255,0.55)', fontSize: 11 }}>
                  {cat}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ══ MAIN PRODUCT FEED ══ */}
      <div className="px-3 pb-6">

        {isLoading && (
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden animate-pulse" style={{ height: 480, background: 'rgba(255,255,255,0.06)' }} />
          </div>
        )}

        {!isLoading && products.length === 0 && (
          <div className="text-center py-24">
            <ShoppingBag size={48} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)' }}>No products in this category yet.</p>
          </div>
        )}

        {!isLoading && product && (
          <>
            <div className="flex gap-3">

              {/* ── Product Card ── */}
              <div className="flex-1 rounded-2xl overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>

                {/* Image area */}
                <div className="relative" style={{ height: 340 }}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg,${catGrad(product.category)[0]},${catGrad(product.category)[1]})` }}>
                      <span style={{ fontSize: 90 }}>{getCategoryIcon(product.category)}</span>
                    </div>
                  )}

                  {/* Dark gradient overlay at bottom of image */}
                  <div className="absolute inset-x-0 bottom-0" style={{ height: 80, background: 'linear-gradient(to top,rgba(26,0,51,0.85),transparent)' }} />

                  {/* Category badge */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-bold"
                    style={{ background: `linear-gradient(135deg,${catGrad(product.category)[0]},${catGrad(product.category)[1]})`, color: 'white', fontSize: 11 }}>
                    {product.category}
                  </div>

                  {/* In-cart badge */}
                  {inCartQty > 0 && (
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold"
                      style={{ background: '#F59E0B', color: '#1A0033' }}>
                      {inCartQty} in cart
                    </div>
                  )}

                  {/* Out of stock overlay */}
                  {outOfStock && (
                    <div className="absolute inset-0 flex items-center justify-center"
                      style={{ background: 'rgba(0,0,0,0.55)' }}>
                      <span className="px-4 py-2 rounded-full font-bold text-sm"
                        style={{ background: 'rgba(255,255,255,0.9)', color: '#1A0033' }}>
                        Out of Stock
                      </span>
                    </div>
                  )}

                  {/* Nav arrows */}
                  {products.length > 1 && (
                    <>
                      <button onClick={navPrev}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                        <ChevronLeft size={18} color="white" />
                      </button>
                      <button onClick={navNext}
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}>
                        <ChevronRight size={18} color="white" />
                      </button>
                    </>
                  )}
                </div>

                {/* Product info */}
                <div className="px-4 pt-3 pb-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h2 className="font-bold text-white text-base leading-snug flex-1">{product.title}</h2>
                    <div className="flex-shrink-0 text-right">
                      <span className="font-extrabold text-lg leading-none" style={{ color: '#F59E0B' }}>
                        {fmt(product.price_kobo)}
                      </span>
                      {product.compare_price_kobo && product.compare_price_kobo > product.price_kobo && (
                        <div className="text-xs line-through" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {fmt(product.compare_price_kobo)}
                        </div>
                      )}
                    </div>
                  </div>
                  {product.description && (
                    <p className="text-sm leading-relaxed line-clamp-3" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {product.description}
                    </p>
                  )}
                  {product.inventory > 0 && product.inventory <= 5 && (
                    <p className="text-xs mt-2 font-semibold" style={{ color: '#F97316' }}>
                      Only {product.inventory} left!
                    </p>
                  )}
                </div>
              </div>

              {/* ── Right Action Buttons ── */}
              <div className="flex flex-col items-center gap-5 pt-3">

                {/* Add to Cart */}
                <div className="flex flex-col items-center gap-1">
                  <button onClick={addToCart} disabled={outOfStock}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all duration-150 active:scale-90"
                    style={{
                      background: outOfStock
                        ? 'rgba(255,255,255,0.08)'
                        : addedAnim
                          ? 'linear-gradient(135deg,#16A34A,#15803D)'
                          : 'linear-gradient(135deg,#F59E0B,#D97706)',
                      boxShadow: addedAnim ? '0 4px 16px rgba(22,163,74,0.5)' : outOfStock ? 'none' : '0 4px 16px rgba(245,158,11,0.4)',
                      opacity: outOfStock ? 0.4 : 1,
                    }}>
                    {addedAnim
                      ? <Check size={22} color="white" />
                      : <ShoppingCart size={20} color={outOfStock ? 'rgba(255,255,255,0.4)' : '#1A0033'} />}
                  </button>
                  <span className="text-center" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Cart</span>
                </div>

                {/* Plus (qty up) */}
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => setQty(q => q + 1)}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}>
                    <Plus size={22} color="white" />
                  </button>
                  <span className="text-sm font-bold text-white">{qty}</span>
                </div>

                {/* Minus (qty down) */}
                <div className="flex flex-col items-center gap-1">
                  <button onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.13)' }}>
                    <Minus size={22} color="white" />
                  </button>
                  <span className="text-center" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Qty</span>
                </div>

                {/* Favorite */}
                <div className="flex flex-col items-center gap-1">
                  <button onClick={toggleFav}
                    className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-90"
                    style={{
                      background: isFav ? 'rgba(239,68,68,0.18)' : 'rgba(255,255,255,0.08)',
                      border: `1px solid ${isFav ? '#EF4444' : 'rgba(255,255,255,0.13)'}`,
                    }}>
                    <Heart size={22} color={isFav ? '#EF4444' : 'white'} fill={isFav ? '#EF4444' : 'none'} />
                  </button>
                  <span className="text-center" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Save</span>
                </div>
              </div>
            </div>

            {/* Pagination dots */}
            {products.length > 1 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {products.slice(0, Math.min(products.length, 20)).map((_, i) => (
                  <button key={i} onClick={() => { setCurrentIdx(i); setQty(1); }}
                    className="rounded-full transition-all duration-200"
                    style={{
                      width: i === currentIdx ? 20 : 5,
                      height: 5,
                      background: i === currentIdx ? '#F59E0B' : 'rgba(255,255,255,0.2)',
                    }} />
                ))}
                {products.length > 20 && (
                  <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, lineHeight: '5px' }}>+{products.length - 20}</span>
                )}
              </div>
            )}

            {/* View all + WhatsApp */}
            <div className="flex gap-3 mt-5">
              <Link href="/shop" className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                <Search size={16} /> Browse All
              </Link>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
                style={{ background: '#25D366', color: 'white' }}>
                <MessageCircle size={16} /> WhatsApp
              </a>
            </div>
          </>
        )}
      </div>

      {/* ══ CART DRAWER ══ */}
      {showCart && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/65" onClick={() => setShowCart(false)} />
          <div className="relative w-full rounded-t-3xl max-h-[82vh] overflow-y-auto"
            style={{ background: '#1A0033', border: '1px solid rgba(245,158,11,0.2)', borderBottom: 'none' }}>
            <div className="sticky top-0 flex items-center justify-between px-5 pt-5 pb-4"
              style={{ background: '#1A0033', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-white font-bold text-lg">Cart
                <span className="ml-2 text-sm font-normal" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  ({cartCount} {cartCount === 1 ? 'item' : 'items'})
                </span>
              </h3>
              <button onClick={() => setShowCart(false)}
                className="p-2 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                <X size={18} color="white" />
              </button>
            </div>

            <div className="px-5 pb-6">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart size={48} color="rgba(255,255,255,0.15)" style={{ margin: '0 auto 12px' }} />
                  <p style={{ color: 'rgba(255,255,255,0.35)' }}>Your cart is empty</p>
                  <button onClick={() => setShowCart(false)}
                    className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-sm"
                    style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B', border: '1px solid rgba(245,158,11,0.3)' }}>
                    Keep browsing
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mt-4">
                    {cart.map(ci => (
                      <div key={ci.productId} className="flex items-center gap-3 p-3 rounded-2xl"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {/* Thumbnail */}
                        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                          style={{ background: 'rgba(255,255,255,0.08)' }}>
                          {ci.image_url
                            ? <img src={ci.image_url} alt={ci.title} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-2xl">🛒</div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium leading-tight line-clamp-2">{ci.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#F59E0B' }}>
                            {fmt(ci.price_kobo)} × {ci.qty} = {fmt(ci.price_kobo * ci.qty)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button onClick={() => setCart(p => p.map(c => c.productId === ci.productId ? { ...c, qty: Math.max(1, c.qty - 1) } : c))}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <Minus size={13} color="white" />
                          </button>
                          <span className="text-white font-bold text-sm w-5 text-center">{ci.qty}</span>
                          <button onClick={() => setCart(p => p.map(c => c.productId === ci.productId ? { ...c, qty: c.qty + 1 } : c))}
                            className="w-7 h-7 rounded-full flex items-center justify-center"
                            style={{ background: 'rgba(255,255,255,0.1)' }}>
                            <Plus size={13} color="white" />
                          </button>
                          <button onClick={() => setCart(p => p.filter(c => c.productId !== ci.productId))}
                            className="w-7 h-7 rounded-full flex items-center justify-center ml-1"
                            style={{ background: 'rgba(239,68,68,0.15)' }}>
                            <X size={13} color="#EF4444" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total + Checkout */}
                  <div className="mt-5 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-white font-semibold">Total</span>
                      <span className="font-extrabold text-2xl" style={{ color: '#F59E0B' }}>
                        {fmt(cartTotal)}
                      </span>
                    </div>

                    {/* WhatsApp checkout */}
                    <a
                      href={`https://wa.me/${WA_NUMBER}?text=Hi! I'd like to order:%0A%0A${cart.map(c => `• ${c.title} x${c.qty} — ${fmt(c.price_kobo * c.qty)}`).join('%0A')}%0A%0ATotal: ${fmt(cartTotal)}`}
                      target="_blank" rel="noopener noreferrer"
                      className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-bold text-base transition-all active:scale-95"
                      style={{ background: '#25D366', color: 'white', boxShadow: '0 8px 24px rgba(37,211,102,0.3)' }}>
                      <MessageCircle size={22} />
                      Order via WhatsApp · {fmt(cartTotal)}
                    </a>

                    <p className="text-center text-xs mt-3" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      Your order will be sent to our WhatsApp to complete payment
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Floating WhatsApp */}
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all hover:scale-110 active:scale-95"
        style={{ background: '#25D366', boxShadow: '0 6px 24px rgba(37,211,102,0.45)' }}>
        <MessageCircle size={26} color="white" />
      </a>

      <style jsx global>{`
        ::-webkit-scrollbar { display: none; }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        body { overflow-x: hidden; }
      `}</style>
    </div>
  );
}
