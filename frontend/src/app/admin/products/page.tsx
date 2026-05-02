'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { fmt } from '@/lib/api';
import toast from 'react-hot-toast';
import { Search, RefreshCw, Package, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface Product {
  id: string;
  shopify_id: string;
  title: string;
  price_kobo: number;
  compare_price_kobo: number | null;
  image_url: string;
  category: string;
  inventory: number;
  synced_at: string;
}

export default function ProductsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', search, page],
    queryFn: async () => {
      const params: Record<string, string> = { page: String(page), limit: '24' };
      if (search) params.search = search;
      const res = await api.get('/whatsapp/admin/products', { params });
      return res.data as { products: Product[]; total: number; totalPages: number };
    },
  });

  const sync = useMutation({
    mutationFn: async () => {
      const res = await api.post('/whatsapp/admin/sync-products');
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Synced ${data.count} products from Shopify!`);
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Sync failed. Check Shopify credentials.');
    },
  });

  const filtered = data?.products.filter(p =>
    !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">{data?.total || 0} products synced from Shopify</p>
        </div>
        <button
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-colors"
        >
          {sync.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Syncing...</>
          ) : (
            <><RefreshCw className="w-4 h-4" />Sync from Shopify</>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
              <div className="aspect-square bg-gray-100" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : data?.products.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Package className="w-14 h-14 text-gray-200 mx-auto mb-4" />
          <h3 className="font-bold text-gray-700 mb-2">No products yet</h3>
          <p className="text-gray-400 text-sm mb-6">Click "Sync from Shopify" to import your products.</p>
          <button
            onClick={() => sync.mutate()}
            disabled={sync.isPending}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${sync.isPending ? 'animate-spin' : ''}`} />
            Sync Products Now
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {data?.products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition-shadow">
                <div className="aspect-square bg-gray-50 relative overflow-hidden">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-gray-200" />
                    </div>
                  )}
                  {p.inventory === 0 && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <span className="bg-white text-gray-800 text-xs font-bold px-2 py-1 rounded">Out of Stock</span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-xs text-emerald-600 font-medium truncate">{p.category}</p>
                  <p className="text-xs font-semibold text-gray-900 mt-0.5 line-clamp-2">{p.title}</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{fmt(p.price_kobo)}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    {p.inventory > 0 ? (
                      <span className="flex items-center gap-0.5 text-xs text-green-600">
                        <CheckCircle className="w-3 h-3" />{p.inventory} in stock
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5 text-xs text-red-500">
                        <AlertTriangle className="w-3 h-3" />Out of stock
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(data?.totalPages || 0) > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">
                Previous
              </button>
              <span className="text-sm text-gray-600">Page {page} of {data?.totalPages}</span>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= (data?.totalPages || 1)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm disabled:opacity-40 hover:bg-gray-50">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
