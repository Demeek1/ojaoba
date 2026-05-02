'use client';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, MessageCircle, ShoppingBag, CheckCircle, AlertTriangle,
  Share2, ChevronRight, Package, Truck, Shield
} from 'lucide-react';
import api, { fmt } from '@/lib/api';

const WA = process.env.NEXT_PUBLIC_WA_NUMBER || '2348000000000';

interface Product {
  id: string;
  title: string;
  price_kobo: number;
  compare_price_kobo: number | null;
  image_url: string;
  category: string;
  description: string;
  inventory: number;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: product, isLoading, error } = useQuery<Product>({
    queryKey: ['product', id],
    queryFn: async () => {
      const res = await api.get(`/products/${id}`);
      return res.data;
    },
  });

  const { data: related } = useQuery({
    queryKey: ['related', product?.category],
    queryFn: async () => {
      const res = await api.get('/products', { params: { category: product!.category, limit: 4 } });
      return (res.data.products as Product[]).filter(p => p.id !== id);
    },
    enabled: !!product?.category,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">Product not found</h2>
          <p className="text-gray-500 mb-6">This product may have been removed or is unavailable.</p>
          <Link href="/shop" className="bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const hasDiscount = product.compare_price_kobo && product.compare_price_kobo > product.price_kobo;
  const discountPct = hasDiscount ? Math.round(100 - (product.price_kobo / product.compare_price_kobo!) * 100) : 0;
  const inStock = product.inventory > 0;
  const lowStock = inStock && product.inventory <= 5;

  const waOrderText = `Hi Ojaoba! I'd like to order:\n\n*${product.title}*\nPrice: ${fmt(product.price_kobo)}\n\nPlease help me with this order.`;

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: product.title, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-black text-emerald-600">Ojaoba</Link>
          <a
            href={`https://wa.me/${WA}?text=Hi`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            Order on WhatsApp
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm text-gray-500 mb-6">
          <Link href="/" className="hover:text-emerald-600">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-emerald-600">Shop</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="hover:text-emerald-600">{product.category}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-gray-900 font-medium truncate max-w-48">{product.title}</span>
        </nav>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16">
          {/* Image */}
          <div className="relative">
            <div className="aspect-square bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <ShoppingBag className="w-24 h-24 text-gray-200" />
                </div>
              )}
              {!inStock && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
                  <span className="bg-white text-gray-800 text-lg font-bold px-6 py-2 rounded-full">Out of Stock</span>
                </div>
              )}
            </div>
            {hasDiscount && (
              <div className="absolute top-4 left-4 bg-red-500 text-white font-bold text-sm px-3 py-1.5 rounded-full shadow-lg">
                -{discountPct}% OFF
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex flex-col">
            <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-emerald-600 mb-4 w-fit transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <span className="text-sm text-emerald-600 font-semibold uppercase tracking-wide mb-2">{product.category}</span>
            <h1 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{product.title}</h1>

            {/* Price */}
            <div className="flex items-end gap-3 mb-6">
              <span className="text-4xl font-black text-gray-900">{fmt(product.price_kobo)}</span>
              {hasDiscount && (
                <div className="mb-1">
                  <span className="text-xl text-gray-400 line-through block">{fmt(product.compare_price_kobo!)}</span>
                  <span className="text-sm text-green-600 font-semibold">
                    You save {fmt(product.compare_price_kobo! - product.price_kobo)}
                  </span>
                </div>
              )}
            </div>

            {/* Stock status */}
            <div className={`flex items-center gap-2 text-sm font-semibold mb-6 ${inStock ? 'text-green-600' : 'text-red-500'}`}>
              {inStock ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {lowStock ? `Only ${product.inventory} left in stock — order soon!` : 'In Stock'}
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" />
                  Currently out of stock
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-8">
                <h3 className="font-bold text-gray-900 mb-2">About this product</h3>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {/* CTA Buttons */}
            <div className="flex gap-3 mb-8">
              <a
                href={`https://wa.me/${WA}?text=${encodeURIComponent(waOrderText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex-1 flex items-center justify-center gap-2 font-bold py-4 px-6 rounded-2xl text-base transition-all ${inStock ? 'bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-200 hover:shadow-green-300' : 'bg-gray-100 text-gray-400 cursor-not-allowed pointer-events-none'}`}
              >
                <MessageCircle className="w-5 h-5" />
                {inStock ? 'Order on WhatsApp' : 'Out of Stock'}
              </a>
              <button
                onClick={handleShare}
                className="p-4 border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors text-gray-600"
                title="Share this product"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-100">
              {[
                { icon: Truck, label: 'Fast Delivery', sub: 'Lagos & surrounds' },
                { icon: Package, label: 'Fresh Products', sub: 'Daily sourced' },
                { icon: Shield, label: 'Secure Payment', sub: 'Paystack secured' },
              ].map(({ icon: Icon, label, sub }) => (
                <div key={label} className="text-center">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                    <Icon className="w-5 h-5 text-emerald-600" />
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{label}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Related Products */}
        {related && related.length > 0 && (
          <section className="mt-20">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-gray-900">More in {product.category}</h2>
              <Link href={`/shop?category=${encodeURIComponent(product.category)}`} className="text-sm text-emerald-600 font-semibold hover:underline">
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {related.slice(0, 4).map(p => (
                <Link key={p.id} href={`/shop/${p.id}`} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <div className="aspect-square bg-gray-50 overflow-hidden">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag className="w-10 h-10 text-gray-200" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-xs font-medium text-gray-600 line-clamp-2 mb-1">{p.title}</p>
                    <p className="font-bold text-gray-900 text-sm">{fmt(p.price_kobo)}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Floating WhatsApp */}
      <a
        href={`https://wa.me/${WA}?text=Hi`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-green-300 transition-transform hover:scale-110 z-50"
        title="Chat on WhatsApp"
      >
        <MessageCircle className="w-6 h-6" />
      </a>
    </div>
  );
}
