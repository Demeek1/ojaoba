'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Megaphone, Send, AlertTriangle } from 'lucide-react';

export default function Broadcast() {
  const [channels, setChannels] = useState<any[]>([]);
  const [channelId, setChannelId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ channels: any[] }>('/api/vendor/broadcast')
      .then((r) => { setChannels(r.channels); if (r.channels[0]) setChannelId(r.channels[0].id); })
      .catch((e) => setError(e.message));
  }, []);

  const active = channels.find((c) => c.id === channelId);
  const reach = active ? (active.type === 'whatsapp' ? Number(active.recent) : Number(active.total)) : 0;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setResult(''); setError('');
    try {
      const r = await api<{ sent: number; capped: boolean }>('/api/vendor/broadcast', { method: 'POST', body: { channelId, message } });
      setResult(`Sent to ${r.sent} customer${r.sent === 1 ? '' : 's'}.${r.capped ? ' (capped at 300 — run again for more.)' : ''}`);
      setMessage('');
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Broadcast</h1>
      <p className="mt-1 text-sm text-forest-900/60">Send a message to customers who’ve chatted with your store.</p>

      {channels.length === 0 ? (
        <div className="card mt-6 text-center text-forest-900/50"><Megaphone className="mx-auto h-9 w-9 opacity-30" /><p className="mt-2 text-sm">Connect a channel first to broadcast.</p></div>
      ) : (
        <form onSubmit={send} className="card mt-6 space-y-4">
          <div>
            <label className="label">Channel</label>
            <select className="input" value={channelId} onChange={(e) => setChannelId(e.target.value)}>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>{c.type}{c.display_name ? ` · ${c.display_name}` : ''}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-forest-900/50">Reachable now: <b className="text-forest-900">{reach}</b> customer{reach === 1 ? '' : 's'}.</p>
          </div>

          {active?.type === 'whatsapp' && (
            <div className="flex gap-2 rounded-2xl bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>WhatsApp only allows free messages to customers who messaged you in the <b>last 24 hours</b>. For wider campaigns you’ll need approved WhatsApp <b>templates</b> (coming soon). Telegram has no limit.</span>
            </div>
          )}

          <div>
            <label className="label">Message</label>
            <textarea className="input min-h-[120px]" maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Hi! New arrivals just dropped 🎉 Reply *menu* to see them." required />
            <p className="mt-1 text-xs text-forest-900/40">{message.length}/1000</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {result && <p className="text-sm font-medium text-brand-700">{result}</p>}
          <button className="btn" disabled={busy || !message.trim() || reach === 0}><Send className="h-4 w-4" />{busy ? 'Sending…' : `Send to ${reach}`}</button>
        </form>
      )}
    </div>
  );
}
