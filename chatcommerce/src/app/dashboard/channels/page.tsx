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
      <h1 className="text-2xl font-bold">Channels</h1>
      <p className="mt-1 text-sm text-slate-600">
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
        <div className="card mt-4 max-w-xl border-brand-200 bg-brand-50">
          <p className="text-sm font-medium text-brand-800">Channel connected! Set this as your webhook URL:</p>
          <code className="mt-2 block break-all rounded bg-white p-2 text-xs">{newUrl}</code>
          <p className="mt-2 text-xs text-brand-700">
            For WhatsApp/Instagram, paste this into Meta’s webhook config. For Telegram, call
            setWebhook with this URL.
          </p>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {channels.map((c) => (
          <div key={c.id} className="card flex items-center justify-between">
            <div>
              <p className="font-semibold capitalize">{c.type} {c.display_name && `· ${c.display_name}`}</p>
              <code className="text-xs text-slate-500 break-all">{c.webhookUrl}</code>
            </div>
            <span className={`rounded-full px-2 py-1 text-xs ${c.status === 'connected' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
