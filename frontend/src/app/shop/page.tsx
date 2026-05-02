'use client';
import { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Search, SlidersHorizontal, X, ChevronLeft, ChevronRight,
  ShoppingBag, MessageCircle, Star, Filter
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
  shopify_id: string;
}

interface Category { name: string; count: number; }

function ProductCard({ p }: { p: Product }) {
  const hasDiscount = p.compare_price_kobo && p.compare_price_kobo > p.price_kobo;
  const discountPct = hasDiscount
    ? Math.round(100 - (p.price_kobo / p.compare_price_kobo!) * 100) : 0;

  return (
    <Link href={`/shop/${p.id}`} className="group bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
      <div className="relative overflow-hidden aspect-square bg-gray-50">
        {p.image_url ? (
          <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag className="w-16 h-16 text-gray-200" />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
            -{discountPct}%
          </span>
        )}
        {p.inventory === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="bg-white text-gray-800 text-sm font-semibold px-4 py-1.5 rounded-full">Out of Stock</span>
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-emerald-600 font-medium uppercase tracking-wide mb-1">{p.category}</p>
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2 group-hover:text-emerald-600 transition-colors">{p.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">{fmt(p.price_kobo)}</span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">{fmt(p.compare_price_kobo!)}</span>
          )}
        </div>
        {p.inventory > 0 && p.inventory <= 5 && (
          <p className="text-xs text-orange-500 mt-1 font-medium">Only {p.inventory} left!</p>
        )}
      </div>
    </Link>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
      <div className="aspect-square bg-gray-200" />
      <div className="p-4 space-y-2">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-5 bg-gray-200 rounded w-1/3" />
      </div>
    </div>
  );
}

function ShopContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const category = searchParams.get('category') || '';
  const search = searchParams.get('search') || '';
  const page = Number(searchParams.get('page') || '1');

  const updateParam = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === null || v === '') params.delete(k);
      else params.set(k, v);
    });
    params.delete('page'); // Reset to page 1 on filter change
    router.push(`/shop?${params.toString()}`);
  }, [router, searchParams]);

  const setPage = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/shop?${params.toString()}`);
  };

  const { data: categories } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/products/categories');
      return res.data;
    },
    staleTime: 60000,
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', category, search, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '20' };
      if (category) params.category = category;
      if (search) params.search = search;
      const res = await api.get('/products', { params });
      return res.data as { products: Product[]; total: number; page: number; totalPages: number };
    },
    staleTime: 30000,
  });

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam({ search: searchInput || null, category: null });
  };

  const totalPages = productsData?.totalPages || 1;
  const total = productsData?.total || 0;

  // Sync search input with URL param
  useEffect(() => {
    setSearchInput(searchParams.get('search') || '');
  }, [searchParams]);

  const Sidebar = () => (
    <aside className="w-full">
      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Categories</h3>
        <ul className="space-y-1">
          <li>
            <button
              onClick={() => updateParam({ category: null })}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${!category ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              All Products
              {total > 0 && !category && (
                <span className="float-right text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{total}</span>
              )}
            </button>
          </li>
          {categories?.map(cat => (
            <li key={cat.name}>
              <button
                onClick={() => { updateParam({ category: cat.name }); setMobileFiltersOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${category === cat.name ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
              >
                {cat.name}
                <span className="float-right text-xs text-gray-400">{cat.count}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t pt-6">
        <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wider">Order on WhatsApp</h3>
        <p className="text-sm text-gray-600 mb-3">Prefer to order directly? Chat with us on WhatsApp!</p>
        <a
          href={`https://wa.me/${WA}?text=Hi, I'd like to order from Ojaoba`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors w-full justify-center"
        >
          <MessageCircle className="w-4 h-4" />
          Chat on WhatsApp
        </a>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-black text-emerald-600 shrink-0">Ojaoba</Link>

            <form onSubmit={handleSearchSubmit} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                />
                {searchInput && (
                  <button type="button" onClick={() => { setSearchInput(''); updateParam({ search: null }); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </form>

            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden flex items-center gap-2 text-sm font-medium text-gray-700 border border-gray-200 px-3 py-2 rounded-xl"
            >
              <Filter className="w-4 h-4" />
              Filter
            </button>

            <a
              href={`https://wa.me/${WA}?text=Hi`}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden md:flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
            >
              <MessageCircle className="w-4 h-4" />
              Order on WhatsApp
            </a>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <div className="hidden md:block w-56 shrink-0">
            <div className="bg-white rounded-2xl p-5 border border-gray-100 sticky top-24">
              <Sidebar />
            </div>
          </div>

          {/* Mobile Filters Drawer */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 md:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileFiltersOpen(false)} />
              <div className="absolute right-0 top-0 h-full w-72 bg-white shadow-xl p-6 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-bold text-lg">Filters</h2>
                  <button onClick={() => setMobileFiltersOpen(false)}>
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
                <Sidebar />
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Breadcrumb + Result count */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
              <div>
                <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                  <Link href="/" className="hover:text-emerald-600">Home</Link>
                  <span>/</span>
                  <span className="text-gray-900 font-medium">
                    {category || (search ? `Search: "${search}"` : 'All Products')}
                  </span>
                </nav>
                {!isLoading && (
                  <p className="text-sm text-gray-500">
                    {total === 0 ? 'No products found' : `${total} product${total !== 1 ? 's' : ''} found`}
                  </p>
                )}
              </div>

              {(category || search) && (
                <button
                  onClick={() => { setSearchInput(''); router.push('/shop'); }}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium border border-red-200 px-3 py-1.5 rounded-lg"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear filters
                </button>
              )}
            </div>

            {/* Active filters chips */}
            {(category || search) && (
              <div className="flex flex-wrap gap-2 mb-5">
                {category && (
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-sm font-medium px-3 py-1 rounded-full border border-emerald-200">
                    <Filter className="w-3 h-3" />
                    {category}
                    <button onClick={() => updateParam({ category: null })} className="ml-1 hover:text-emerald-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {search && (
                  <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 text-sm font-medium px-3 py-1 rounded-full border border-blue-200">
                    <Search className="w-3 h-3" />
                    &ldquo;{search}&rdquo;
                    <button onClick={() => { setSearchInput(''); updateParam({ search: null }); }} className="ml-1 hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 12 }).map((_, i) => <ProductSkeleton key={i} />)}
              </div>
            ) : productsData?.products.length === 0 ? (
              <div className="text-center py-24">
                <ShoppingBag className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-700 mb-2">No products found</h3>
                <p className="text-gray-500 mb-6">
                  {search ? `No results for "${search}". Try a different search term.` : 'No products in this category yet.'}
                </p>
                <button onClick={() => router.push('/shop')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                  View all products
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {productsData?.products.map(p => <ProductCard key={p.id} p={p} />)}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setPage(page - 1)}
                      disabled={page <= 1}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    {Array.from({ length: totalPages }).map((_, i) => {
                      const p = i + 1;
                      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                        return (
                          <button
                            key={p}
                            onClick={() => setPage(p)}
                            className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${p === page ? 'bg-emerald-600 text-white' : 'border border-gray-200 hover:bg-gray-50 text-gray-700'}`}
                          >
                            {p}
                          </button>
                        );
                      }
                      if (Math.abs(p - page) === 2) return <span key={p} className="text-gray-400">…</span>;
                      return null;
                    })}

                    <button
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                      className="p-2 rounded-lg border border-gray-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
