'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

// Which secret fields each channel needs. Stored encrypted; never shown back.
const FIELDS: Record<string, { key: string; label: string }[]> = {
  whatsapp: [
    { key: 'accessToken', label: 'Cloud API access token' },
    { key: 'phoneNumberId', label: 'Phone number ID' },
    { key: 'verifyToken', label: 'Webhook verify token (you choose)' },
  ],
  telegram: [{ key: 'botToken', label: 'Bot token (from @BotFather)' }],
  instagram: [
    { key: 'accessToken', label: 'Page access token' },
    { key: 'verifyToken', label: 'Webhook verify token (you choose)' },
  ],
};

export default function Channels() {
  const [channels, setChannels] = useState<any[]>([]);
  const [type, setType] = useState('whatsapp');
  const [creds, setCreds] = useState<Record<string, string>>({});
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [newUrl, setNewUrl] = useState('');

  async function load() {
    const r = await api('/api/vendor/channels');
    setChannels(r.channels);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setNewUrl('');
    try {
      const r = await api('/api/vendor/channels', {
        method: 'POST',
        body: { type, displayName, credentials: creds },
      });
      setNewUrl(r.webhookUrl);
      setCreds({});
      setDisplayName('');
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Channels</h1>
      <p className="mt-1 text-sm text-forest-900/60">
        Connect a chat channel. Your secrets are encrypted at rest and never shown again.
      </p>

      <form onSubmit={connect} className="card mt-5 max-w-xl space-y-4">
        <div>
          <label className="label">Channel type</label>
          <select className="input" value={type} onChange={(e) => { setType(e.target.value); setCreds({}); }}>
            <option value="whatsapp">WhatsApp (Meta Cloud API)</option>
            <option value="telegram">Telegram</option>
            <option value="instagram">Instagram</option>
          </select>
        </div>
        <div>
          <label className="label">Display name (optional)</label>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My WhatsApp line" />
        </div>
        {FIELDS[type].map((f) => (
          <div key={f.key}>
            <label className="label">{f.label}</label>
            <input className="input" value={creds[f.key] || ''} onChange={(e) => setCreds({ ...creds, [f.key]: e.target.value })} required />
          </div>
        ))}
        <button className="btn" disabled={busy}>{busy ? 'Connecting…' : 'Connect channel'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {newUrl && (
        <div className="mt-4 max-w-xl rounded-3xl border border-brand-200 bg-brand-50 p-6">
          <p className="font-display text-sm font-bold text-forest-900">Channel connected! Set this as your webhook URL:</p>
          <code className="mt-2 block break-all rounded-xl bg-white p-3 text-xs text-forest-900">{newUrl}</code>
          <p className="mt-2 text-xs text-forest-900/60">
            For WhatsApp/Instagram, paste this into Meta’s webhook config. For Telegram, call
            setWebhook with this URL.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {channels.map((c) => (
          <div key={c.id} className="card flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="font-display font-bold capitalize text-forest-900">{c.type} {c.display_name && <span className="font-sans font-normal text-forest-900/50">· {c.display_name}</span>}</p>
              <code className="block truncate text-xs text-forest-900/40">{c.webhookUrl}</code>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${c.status === 'connected' ? 'bg-brand-100 text-brand-700' : 'bg-forest-900/5 text-forest-900/50'}`}>
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
