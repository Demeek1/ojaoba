'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mfaToken, setMfaToken] = useState('');
  const [code, setCode] = useState('');

  function go(role: string) {
    router.push(role === 'platform_owner' ? '/admin' : '/dashboard');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api<{ role?: string; mfaRequired?: boolean; mfaToken?: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      if (r.mfaRequired && r.mfaToken) {
        setMfaToken(r.mfaToken);
      } else {
        go(r.role!);
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api<{ role: string }>('/api/auth/mfa', { method: 'POST', body: { mfaToken, code } });
      go(r.role);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (mfaToken) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-forest-900 px-6 py-10">
        <form onSubmit={submitCode} className="card w-full max-w-md shadow-soft">
          <Link href="/" className="font-display text-xl font-extrabold text-forest-900">chatcommerce</Link>
          <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Two-factor code</h1>
          <p className="mt-1 text-sm text-forest-900/60">Enter the 6-digit code from your authenticator app.</p>
          {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <input
            className="input mt-5 text-center text-2xl tracking-[0.4em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            autoFocus
            required
          />
          <button className="btn mt-6 w-full" disabled={loading || code.length !== 6}>
            {loading ? 'Verifying…' : 'Verify & continue'}
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-forest-900 px-6 py-10">
      <form onSubmit={submit} className="card w-full max-w-md shadow-soft">
        <Link href="/" className="font-display text-xl font-extrabold text-forest-900">chatcommerce</Link>
        <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Welcome back</h1>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="current-password" type="password" autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <div className="mt-1.5 text-right">
              <Link href="/forgot" className="text-xs font-medium text-brand-700">Forgot password?</Link>
            </div>
          </div>
        </div>
        <button className="btn mt-6 w-full" disabled={loading}>
          {loading ? 'Signing in…' : 'Log in'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          New here?{' '}
          <Link href="/signup" className="font-medium text-brand-600">Create a store</Link>
        </p>
      </form>
    </main>
  );
}
