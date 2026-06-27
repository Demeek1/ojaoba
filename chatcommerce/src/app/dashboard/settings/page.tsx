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
      <h1 className="text-2xl font-bold">Settings</h1>

      <div className="card mt-5">
        <h2 className="font-semibold">Store</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <Row k="Business name" v={me.tenant.business_name} />
          <Row k="Storefront handle" v={`/store/${me.tenant.slug}`} />
          <Row k="Plan" v={me.tenant.plan} />
          <Row k="Billing" v={me.tenant.billing_status} />
          <Row k="Status" v={me.tenant.status} />
        </dl>
      </div>

      <div className="card mt-5">
        <h2 className="font-semibold">Billing</h2>
        <p className="mt-1 text-sm text-slate-600">
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
    <div className="flex justify-between">
      <dt className="text-slate-500">{k}</dt>
      <dd className="font-medium capitalize">{v}</dd>
    </div>
  );
}
