'use client';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api, { fmt } from '@/lib/api';
import { ShoppingCart, MessageCircle, Star, Truck, Shield, ChevronRight, Search, Menu, X, Phone } from 'lucide-react';
import { useState } from 'react';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';
const WA_LINK   = `https://wa.me/${WA_NUMBER}?text=Hi`;

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchQ,  setSearchQ]  = useState('');

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ['categories'],
    queryFn: () => api.get('/products/categories').then(r => r.data),
  });

  const { data: featured } = useQuery({
    queryKey: ['featured'],
    queryFn: () => api.get('/products?page=1').then(r => r.data),
  });

  return (
    <div className="min-h-screen bg-white">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white font-black text-lg">O</div>
            <span className="font-black text-xl text-gray-900">Ojaoba</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/shop" className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors">Shop</Link>
            <Link href="/shop?category=Vegetables" className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors">Fresh Produce</Link>
            <Link href="/shop?category=Grains" className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors">Grains</Link>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-green-600 font-medium text-sm transition-colors">Order on WhatsApp</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/shop" className="hidden md:flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors">
              <ShoppingCart size={15} /> Shop Now
            </Link>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1fba58] transition-colors">
              <MessageCircle size={15} /> WhatsApp
            </a>
            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden p-2 text-gray-600">
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 flex flex-col gap-3">
            <Link href="/shop" className="text-gray-700 font-medium py-2" onClick={() => setMenuOpen(false)}>🛍️ Shop All Products</Link>
            <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="text-gray-700 font-medium py-2">💬 Order on WhatsApp</a>
            <Link href="/admin" className="text-gray-400 text-sm py-2" onClick={() => setMenuOpen(false)}>Admin Panel</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="relative bg-gradient-to-br from-green-900 via-green-800 to-green-700 text-white overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #86efac 0%, transparent 50%), radial-gradient(circle at 80% 20%, #fbbf24 0%, transparent 50%)' }} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-green-700/50 border border-green-500/30 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Fresh deliveries across Nigeria 🇳🇬
            </div>
            <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
              Fresh Food,<br />
              <span className="text-green-300">Delivered</span> Fast.
            </h1>
            <p className="text-green-100 text-lg md:text-xl leading-relaxed mb-10 max-w-xl">
              Shop fresh groceries, local produce, and household essentials online — or order instantly on WhatsApp. Delivered to your doorstep.
            </p>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <div className="flex-1 flex items-center bg-white rounded-2xl px-4 gap-3 shadow-xl">
                <Search size={18} className="text-gray-400 flex-shrink-0" />
                <input
                  type="text" placeholder="Search for rice, tomatoes, chicken…"
                  value={searchQ} onChange={e => setSearchQ(e.target.value)}
                  onKeyDown={e => e.key==='Enter' && searchQ && (window.location.href=`/shop?search=${searchQ}`)}
                  className="flex-1 py-4 text-gray-800 placeholder-gray-400 bg-transparent outline-none text-sm"
                />
              </div>
              <Link href={searchQ?`/shop?search=${searchQ}`:'/shop'} className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-bold text-sm transition-colors shadow-xl whitespace-nowrap">
                Search
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/shop" className="flex items-center justify-center gap-2 bg-white text-green-800 px-8 py-4 rounded-2xl font-bold text-sm hover:bg-green-50 transition-colors shadow-xl">
                <ShoppingCart size={18} /> Browse All Products
              </Link>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-[#25D366] text-white px-8 py-4 rounded-2xl font-bold text-sm hover:bg-[#1fba58] transition-colors shadow-xl">
                <MessageCircle size={18} /> Order on WhatsApp
              </a>
            </div>
          </div>
        </div>

        {/* Decorative circles */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-green-600/20 rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="absolute right-20 bottom-0 w-64 h-64 bg-orange-500/10 rounded-full translate-y-1/2" />
      </section>

      {/* ── Why Ojaoba ── */}
      <section className="bg-green-50 py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: '🌿', title: 'Always Fresh', desc: 'Sourced daily from local farmers & suppliers' },
              { icon: '🚀', title: 'Fast Delivery', desc: 'Same-day delivery to your doorstep' },
              { icon: '💬', title: 'WhatsApp Orders', desc: 'Order in 60 seconds without leaving WhatsApp' },
              { icon: '🔒', title: 'Secure Payments', desc: 'Pay safely with Paystack — card or transfer' },
            ].map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-5 text-center shadow-sm border border-green-100">
                <div className="text-3xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories ── */}
      {categories.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">Shop by Category</h2>
                <p className="text-gray-500 text-sm mt-1">Find exactly what you need</p>
              </div>
              <Link href="/shop" className="text-green-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                View all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {categories.slice(0, 12).map((cat, i) => {
                const ICONS: Record<string, string> = { 'Grains':'🌾','Rice':'🍚','Vegetables':'🥦','Fruits':'🍊','Meat':'🥩','Fish':'🐟','Dairy':'🥛','Beverages':'🥤','Snacks':'🍿','Condiments':'🫙','Cooking':'🍳','Frozen':'❄️' };
                const icon = Object.entries(ICONS).find(([k]) => cat.toLowerCase().includes(k.toLowerCase()))?.[1] || ['🥕','🍅','🌽','🧅','🧄','🫚'][i % 6];
                return (
                  <Link key={cat} href={`/shop?category=${encodeURIComponent(cat)}`} className="group bg-green-50 hover:bg-green-600 rounded-2xl p-4 text-center transition-all duration-200 cursor-pointer border border-green-100 hover:border-green-600 hover:shadow-lg">
                    <div className="text-3xl mb-2">{icon}</div>
                    <p className="text-xs font-semibold text-gray-700 group-hover:text-white transition-colors leading-tight">{cat}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Featured Products ── */}
      {featured?.products?.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-black text-gray-900">Featured Products</h2>
                <p className="text-gray-500 text-sm mt-1">Our most popular items this week</p>
              </div>
              <Link href="/shop" className="text-green-600 font-semibold text-sm flex items-center gap-1 hover:gap-2 transition-all">
                Shop all <ChevronRight size={16} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 md:gap-6">
              {featured.products.slice(0, 8).map((p: any) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── WhatsApp CTA ── */}
      <section className="py-16 bg-[#075E54] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }} />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#25D366] rounded-3xl mb-6 shadow-2xl">
            <MessageCircle size={40} />
          </div>
          <h2 className="text-3xl md:text-4xl font-black mb-4">Order on WhatsApp in 60 Seconds</h2>
          <p className="text-green-200 text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
            No app download needed. Just message us on WhatsApp, browse our products, add to cart, and pay — all without leaving the chat.
          </p>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 text-center">
            {[['1️⃣','Message us','Send "Hi" to our number'],['2️⃣','Browse products','See categories & prices'],['3️⃣','Add to cart','Pick what you want'],['4️⃣','Pay & done!','Secure payment via Paystack']].map(([e,t,d]) => (
              <div key={t} className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm">
                <div className="text-2xl mb-2">{e}</div>
                <div className="font-bold text-sm mb-1">{t}</div>
                <div className="text-green-300 text-xs">{d}</div>
              </div>
            ))}
          </div>

          <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#1fba58] text-white px-10 py-4 rounded-2xl font-bold text-lg transition-colors shadow-2xl">
            <MessageCircle size={24} /> Start Ordering on WhatsApp
          </a>
          <p className="text-green-400 text-sm mt-4">Available 24/7 · Instant responses · No signup needed</p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <h2 className="text-2xl md:text-3xl font-black text-gray-900 text-center mb-10">What Our Customers Say</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name:'Adaeze O.', loc:'Lagos Island', text:'I ordered rice and tomatoes on WhatsApp and it was delivered in 45 minutes! The quality is amazing. Ojaoba is now my go-to for groceries.', rating:5 },
              { name:'Emeka C.', loc:'Lekki', text:'The WhatsApp bot is so easy to use. I just type "menu", pick what I want, pay with my card, and it arrives. Zero stress!', rating:5 },
              { name:'Fatima B.', loc:'Abuja', text:'Fresh produce every time. I love that I can track my order right in the WhatsApp chat. Customer service is also very responsive.', rating:5 },
            ].map(t => (
              <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                <div className="flex gap-1 mb-3">
                  {Array(t.rating).fill(0).map((_,i) => <Star key={i} size={14} className="fill-orange-400 text-orange-400" />)}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-4">"{t.text}"</p>
                <div>
                  <div className="font-bold text-gray-900 text-sm">{t.name}</div>
                  <div className="text-gray-400 text-xs">{t.loc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-green-600 rounded-xl flex items-center justify-center text-white font-black">O</div>
                <span className="font-black text-white text-lg">Ojaoba</span>
              </div>
              <p className="text-sm leading-relaxed mb-4">Nigeria's freshest food marketplace. Fresh produce, fast delivery.</p>
              <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-semibold">
                <MessageCircle size={14} /> Order on WhatsApp
              </a>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Shop</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/shop" className="hover:text-white transition-colors">All Products</Link></li>
                {categories.slice(0,4).map(c => <li key={c}><Link href={`/shop?category=${encodeURIComponent(c)}`} className="hover:text-white transition-colors">{c}</Link></li>)}
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Info</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">About Us</a></li>
                <li><a href="#" className="hover:text-white">Delivery Areas</a></li>
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-bold mb-4">Contact</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2"><Phone size={13} /> {process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+234 800 000 0000'}</div>
                <div>support@ojaoba.com</div>
                <a href={WA_LINK} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#25D366] hover:text-[#1fba58]"><MessageCircle size={13} /> Chat on WhatsApp</a>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-2">
            <p className="text-xs">© 2025 Ojaoba.com — All rights reserved</p>
            <p className="text-xs">Payments secured by <span className="text-white font-semibold">Paystack</span></p>
          </div>
        </div>
      </footer>

      {/* ── Floating WhatsApp button ── */}
      <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#25D366] rounded-full shadow-2xl flex items-center justify-center text-white hover:bg-[#1fba58] transition-all hover:scale-110"
        title="Order on WhatsApp">
        <MessageCircle size={26} />
      </a>
    </div>
  );
}

function ProductCard({ product }: { product: any }) {
  const hasDiscount = product.compare_price_kobo && product.compare_price_kobo > product.price_kobo;
  const discPct = hasDiscount ? Math.round((1 - product.price_kobo / product.compare_price_kobo) * 100) : 0;
  return (
    <Link href={`/shop/${product.id}`} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all duration-200">
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl">🍽️</div>
        )}
        {hasDiscount && <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-lg">-{discPct}%</div>}
        {!product.available && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><span className="text-xs font-bold text-gray-500 bg-white px-2 py-1 rounded-lg">Out of Stock</span></div>}
      </div>
      <div className="p-3">
        <p className="text-xs text-green-600 font-medium mb-1">{product.category}</p>
        <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-2">{product.title}</h3>
        <div className="flex items-center gap-2">
          <span className="font-black text-gray-900 text-sm">{fmt(product.price_kobo)}</span>
          {hasDiscount && <span className="text-xs text-gray-400 line-through">{fmt(product.compare_price_kobo)}</span>}
        </div>
      </div>
    </Link>
  );
}
