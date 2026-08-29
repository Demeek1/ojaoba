'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Landmark, Link2, Ban, Zap, Check } from 'lucide-react';

type Cfg = {
  method: 'none' | 'bank' | 'link' | 'paystack_auto';
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  paymentLink?: string;
  note?: string;
  paystackSecret?: string;
};

export default function PaymentsCard() {
  const [cfg, setCfg] = useState<Cfg>({ method: 'none' });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [paystackConfigured, setPaystackConfigured] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');

  useEffect(() => {
    api<{ config: Cfg; paystackConfigured: boolean; webhookUrl: string }>('/api/vendor/payments')
      .then((r) => {
        setCfg({ ...r.config, method: r.config?.method || 'none' });
        setPaystackConfigured(!!r.paystackConfigured);
        setWebhookUrl(r.webhookUrl || '');
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await api('/api/vendor/payments', { method: 'PATCH', body: cfg });
      setMsg('Saved. Customers will now see this at checkout.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) return null;

  const opt = (m: Cfg['method'], icon: React.ReactNode, label: string, desc: string) => (
    <button
      type="button"
      onClick={() => setCfg({ ...cfg, method: m })}
      className={`flex flex-1 flex-col items-start gap-1 rounded-2xl border p-4 text-left transition ${
        cfg.method === m ? 'border-brand-500 bg-brand-50' : 'border-forest-900/10 bg-white hover:border-forest-900/20'
      }`}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-900/5 text-forest-900">{icon}</span>
      <span className="mt-1 font-display font-bold text-forest-900">{label}</span>
      <span className="text-xs text-forest-900/50">{desc}</span>
    </button>
  );

  return (
    <div className="card mt-5">
      <h2 className="font-display text-lg font-extrabold text-forest-900">How customers pay you</h2>
      <p className="mt-1 text-sm text-forest-900/60">Shown to customers when they check out in chat. This is your own money account — not platform billing.</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {opt('paystack_auto', <Zap className="h-5 w-5" />, 'Paystack (auto)', 'Auto-confirms paid orders')}
        {opt('bank', <Landmark className="h-5 w-5" />, 'Bank transfer', 'Show your account details')}
        {opt('link', <Link2 className="h-5 w-5" />, 'Payment link', 'Whop, Stripe, any link')}
        {opt('none', <Ban className="h-5 w-5" />, 'None yet', 'Just confirm the order')}
      </div>

      {cfg.method === 'paystack_auto' && (
        <div className="mt-4 rounded-2xl bg-cream p-4">
          <p className="text-sm text-forest-900/70">
            Customers get a unique Paystack link per order, and orders are marked <b>paid</b> automatically. Uses <b>your</b> Paystack account.
          </p>
          <label className="label mt-3">Your Paystack secret key</label>
          <input
            className="input"
            type="password"
            autoComplete="off"
            placeholder={paystackConfigured ? '•••••••• (saved — leave blank to keep)' : 'sk_live_… or sk_test_…'}
            value={cfg.paystackSecret || ''}
            onChange={(e) => setCfg({ ...cfg, paystackSecret: e.target.value })}
          />
          <p className="mt-1 text-xs text-forest-900/50">Found in Paystack → Settings → API Keys & Webhooks. Stored encrypted; never shown again.</p>
          {paystackConfigured && <p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700"><Check className="h-3.5 w-3.5" /> Key saved</p>}
          {webhookUrl && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-forest-900/70">Set this as your Webhook URL in Paystack:</p>
              <code className="mt-1 block break-all rounded-lg bg-white p-2 text-xs text-forest-900">{webhookUrl}</code>
            </div>
          )}
        </div>
      )}

      {cfg.method === 'bank' && (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <input className="input" placeholder="Bank name" value={cfg.bankName || ''} onChange={(e) => setCfg({ ...cfg, bankName: e.target.value })} />
          <input className="input" placeholder="Account name" value={cfg.accountName || ''} onChange={(e) => setCfg({ ...cfg, accountName: e.target.value })} />
          <input className="input" placeholder="Account number" value={cfg.accountNumber || ''} onChange={(e) => setCfg({ ...cfg, accountNumber: e.target.value })} />
        </div>
      )}
      {cfg.method === 'link' && (
        <div className="mt-4">
          <input className="input" placeholder="https://your-checkout-link.com" value={cfg.paymentLink || ''} onChange={(e) => setCfg({ ...cfg, paymentLink: e.target.value })} />
          <p className="mt-1 text-xs text-forest-900/50">Paste a reusable checkout/payment link from Paystack, Whop, Stripe, or any provider you use.</p>
        </div>
      )}
      {cfg.method !== 'none' && (
        <input className="input mt-3" placeholder="Optional note (e.g. 'Send receipt after paying')" value={cfg.note || ''} onChange={(e) => setCfg({ ...cfg, note: e.target.value })} />
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      {msg && <p className="mt-3 text-sm font-medium text-brand-700">{msg}</p>}
      <button className="btn mt-4" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save payment method'}</button>
    </div>
  );
}
