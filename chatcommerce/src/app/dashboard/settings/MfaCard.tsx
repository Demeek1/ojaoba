'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { ShieldCheck, ShieldOff } from 'lucide-react';

export default function MfaCard({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<{ qr: string; secret: string } | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function startSetup() {
    setError('');
    setBusy(true);
    try {
      const r = await api<{ qr: string; secret: string }>('/api/vendor/mfa', { method: 'POST', body: { action: 'setup' } });
      setSetup({ qr: r.qr, secret: r.secret });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    setError('');
    setBusy(true);
    try {
      await api('/api/vendor/mfa', { method: 'POST', body: { action: 'enable', code } });
      setEnabled(true);
      setSetup(null);
      setCode('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setError('');
    setBusy(true);
    try {
      await api('/api/vendor/mfa', { method: 'POST', body: { action: 'disable', code } });
      setEnabled(false);
      setCode('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mt-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-extrabold text-forest-900">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-forest-900/60">Protect your account with an authenticator app (TOTP).</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${enabled ? 'bg-brand-100 text-brand-700' : 'bg-forest-900/5 text-forest-900/50'}`}>
          {enabled ? <ShieldCheck className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
          {enabled ? 'On' : 'Off'}
        </span>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!enabled && !setup && (
        <button className="btn mt-4" onClick={startSetup} disabled={busy}>{busy ? 'Preparing…' : 'Enable 2FA'}</button>
      )}

      {!enabled && setup && (
        <div className="mt-4 rounded-2xl bg-cream p-4">
          <p className="text-sm text-forest-900/70">1. Scan this with Google Authenticator, Authy, or 1Password:</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={setup.qr} alt="2FA QR code" className="mt-3 rounded-xl border border-forest-900/10 bg-white" width={180} height={180} />
          <p className="mt-2 text-xs text-forest-900/50">Or enter this key manually: <code className="break-all font-mono">{setup.secret}</code></p>
          <p className="mt-4 text-sm text-forest-900/70">2. Enter the 6-digit code to confirm:</p>
          <div className="mt-2 flex gap-2">
            <input className="input max-w-[160px] text-center tracking-[0.3em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
            <button className="btn" onClick={confirm} disabled={busy || code.length !== 6}>Confirm</button>
          </div>
        </div>
      )}

      {enabled && (
        <div className="mt-4">
          <p className="text-sm text-forest-900/60">Enter a current code to turn 2FA off.</p>
          <div className="mt-2 flex gap-2">
            <input className="input max-w-[160px] text-center tracking-[0.3em]" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="000000" />
            <button className="btn-ghost-dark" onClick={disable} disabled={busy || code.length !== 6}>Disable 2FA</button>
          </div>
        </div>
      )}
    </div>
  );
}
