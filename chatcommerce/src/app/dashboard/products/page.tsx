'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';
import { Plus, Package } from 'lucide-react';

export default function Products() {
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ title: '', price: '', imageUrl: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api('/api/vendor/products');
    setProducts(r.products);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/vendor/products', {
        method: 'POST',
        body: {
          title: form.title,
          priceCents: Math.round(parseFloat(form.price || '0') * 100),
          imageUrl: form.imageUrl || null,
        },
      });
      setForm({ title: '', price: '', imageUrl: '' });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Products</h1>
      <p className="mt-1 text-sm text-forest-900/60">Add products manually or import them from a connected store.</p>

      <form onSubmit={add} className="card mt-6 grid gap-3 sm:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Product title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input" placeholder="Price (e.g. 9.99)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <input className="input sm:col-span-3" placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <button className="btn" disabled={busy}><Plus className="h-4 w-4" />{busy ? 'Adding…' : 'Add product'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="card overflow-hidden">
            {p.image_url ? (
              <img src={p.image_url} alt="" className="mb-4 h-40 w-full rounded-2xl object-cover" />
            ) : (
              <div className="mb-4 flex h-40 w-full items-center justify-center rounded-2xl bg-cream text-forest-900/20"><Package className="h-10 w-10" /></div>
            )}
            <h3 className="font-display font-bold text-forest-900">{p.title}</h3>
            <p className="mt-1 inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-sm font-semibold text-brand-700">{money(Number(p.price_cents), p.currency)}</p>
          </div>
        ))}
        {products.length === 0 && (
          <div className="card col-span-full flex flex-col items-center py-12 text-center text-forest-900/50">
            <Package className="h-10 w-10 opacity-30" />
            <p className="mt-3 text-sm">No products yet. Add one above or import from a store.</p>
          </div>
        )}
      </div>
    </div>
  );
}
