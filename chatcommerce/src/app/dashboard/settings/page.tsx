'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function Settings() {
  const [me, setMe] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/api/vendor/me').then(setMe).catch((e) => setError(e.message));
  }, []);

  async function startBilling() {
    setBusy(true);
    setError('');
    try {
      const r = await api('/api/billing/checkout', { method: 'POST' });
      window.location.href = r.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(false);
    }
  }

  if (!me) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Settings</h1>

      <div className="card mt-6">
        <h2 className="font-display text-lg font-extrabold text-forest-900">Store</h2>
        <dl className="mt-3 space-y-2.5 text-sm">
          <Row k="Business name" v={me.tenant.business_name} />
          <Row k="Storefront handle" v={`/store/${me.tenant.slug}`} />
          <Row k="Plan" v={me.tenant.plan} />
          <Row k="Billing" v={me.tenant.billing_status} />
          <Row k="Status" v={me.tenant.status} />
        </dl>
      </div>

      <div className="card mt-5">
        <h2 className="font-display text-lg font-extrabold text-forest-900">Billing</h2>
        <p className="mt-1 text-sm text-forest-900/60">
          Upgrade to a paid plan to keep your store live beyond the trial.
        </p>
        <button className="btn mt-4" onClick={startBilling} disabled={busy}>
          {busy ? 'Redirecting…' : 'Manage subscription'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-forest-900/5 pb-2.5 last:border-0">
      <dt className="text-forest-900/50">{k}</dt>
      <dd className="font-semibold capitalize text-forest-900">{v}</dd>
    </div>
  );
}
