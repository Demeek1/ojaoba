'use client';
import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function ResetPage() {
  return (
    <Suspense fallback={null}>
      <ResetInner />
    </Suspense>
  );
}

function ResetInner() {
  const token = useSearchParams().get('token') || '';
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api('/api/auth/reset', { method: 'POST', body: { token, password } });
      setDone(true);
      setTimeout(() => router.push('/login'), 1500);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-forest-900 px-6 py-10">
      <div className="card w-full max-w-md shadow-soft">
        <Link href="/" className="font-display text-xl font-extrabold text-forest-900">chatcommerce</Link>
        {done ? (
          <>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Password updated ✅</h1>
            <p className="mt-2 text-sm text-forest-900/60">Redirecting you to log in…</p>
          </>
        ) : !token ? (
          <>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Invalid link</h1>
            <p className="mt-2 text-sm text-forest-900/60">This reset link is missing or malformed.</p>
            <Link href="/forgot" className="btn mt-6 w-full">Request a new link</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Set a new password</h1>
            {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="mt-5">
              <label className="label" htmlFor="password">New password</label>
              <input id="password" name="new-password" type="password" autoComplete="new-password" minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
            </div>
            <button className="btn mt-6 w-full" disabled={loading}>{loading ? 'Saving…' : 'Update password'}</button>
          </form>
        )}
      </div>
    </main>
  );
}
