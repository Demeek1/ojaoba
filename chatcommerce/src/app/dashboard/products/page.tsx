'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';

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
      <h1 className="text-2xl font-bold">Products</h1>
      <p className="mt-1 text-sm text-slate-600">Add products manually or import them from a connected store.</p>

      <form onSubmit={add} className="card mt-5 grid gap-3 sm:grid-cols-4">
        <input className="input sm:col-span-2" placeholder="Product title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
        <input className="input" placeholder="Price (e.g. 9.99)" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
        <input className="input sm:col-span-3" placeholder="Image URL (optional)" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
        <button className="btn" disabled={busy}>{busy ? 'Adding…' : 'Add product'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <div key={p.id} className="card">
            {p.image_url && <img src={p.image_url} alt="" className="mb-3 h-36 w-full rounded-lg object-cover" />}
            <h3 className="font-semibold">{p.title}</h3>
            <p className="text-sm text-slate-500">{money(Number(p.price_cents), p.currency)}</p>
          </div>
        ))}
        {products.length === 0 && <p className="text-sm text-slate-500">No products yet.</p>}
      </div>
    </div>
  );
}
