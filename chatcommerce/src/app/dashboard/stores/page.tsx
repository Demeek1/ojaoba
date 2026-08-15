'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

const FIELDS: Record<string, { key: string; label: string }[]> = {
  shopify: [{ key: 'accessToken', label: 'Admin API access token' }],
  woocommerce: [
    { key: 'consumerKey', label: 'Consumer key' },
    { key: 'consumerSecret', label: 'Consumer secret' },
  ],
  manual: [],
};

export default function Stores() {
  const [stores, setStores] = useState<any[]>([]);
  const [provider, setProvider] = useState('shopify');
  const [domain, setDomain] = useState('');
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api('/api/vendor/stores');
    setStores(r.stores);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api('/api/vendor/stores', { method: 'POST', body: { provider, domain, credentials: creds } });
      setDomain('');
      setCreds({});
      await load();
      setMsg('Store connected.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function importNow(storeId: string) {
    setError('');
    setMsg('Importing…');
    try {
      const r = await api('/api/vendor/stores/import', { method: 'POST', body: { storeId } });
      setMsg(`Imported ${r.imported} products.`);
      await load();
    } catch (e: any) {
      setError(e.message);
      setMsg('');
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Stores</h1>
      <p className="mt-1 text-sm text-forest-900/60">Connect Shopify or WooCommerce and import your catalog.</p>

      <form onSubmit={connect} className="card mt-5 max-w-xl space-y-4">
        <div>
          <label className="label">Provider</label>
          <select className="input" value={provider} onChange={(e) => { setProvider(e.target.value); setCreds({}); }}>
            <option value="shopify">Shopify</option>
            <option value="woocommerce">WooCommerce / WordPress</option>
            <option value="manual">Manual (no sync)</option>
          </select>
        </div>
        {provider !== 'manual' && (
          <div>
            <label className="label">{provider === 'shopify' ? 'Shop domain (myshop.myshopify.com)' : 'Site domain (example.com)'}</label>
            <input className="input" value={domain} onChange={(e) => setDomain(e.target.value)} required />
          </div>
        )}
        {FIELDS[provider].map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input className="input" value={creds[f.key] || ''} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} required />
          </div>
        ))}
        <button className="btn" disabled={busy}>{busy ? 'Connecting…' : 'Connect store'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-3 text-sm font-medium text-brand-700">{msg}</p>}

      <div className="mt-6 space-y-3">
        {stores.map((s) => (
          <div key={s.id} className="card flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display font-bold capitalize text-forest-900">{s.provider} {s.domain && <span className="font-sans font-normal text-forest-900/50">· {s.domain}</span>}</p>
              <p className="text-xs text-forest-900/40">
                {s.last_synced_at ? `Last synced ${new Date(s.last_synced_at).toLocaleString()}` : 'Never synced'}
              </p>
            </div>
            {s.provider !== 'manual' && (
              <button className="btn-ghost-dark shrink-0 px-4 py-2 text-sm" onClick={() => importNow(s.id)}>Import products</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
