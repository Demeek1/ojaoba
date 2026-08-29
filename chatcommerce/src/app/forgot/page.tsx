'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function Forgot() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api('/api/auth/forgot', { method: 'POST', body: { email } });
    } catch {
      /* ignore — we never reveal whether the email exists */
    } finally {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-forest-900 px-6 py-10">
      <div className="card w-full max-w-md shadow-soft">
        <Link href="/" className="font-display text-xl font-extrabold text-forest-900">chatcommerce</Link>
        {sent ? (
          <>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Check your email</h1>
            <p className="mt-2 text-sm text-forest-900/60">
              If an account exists for <span className="font-semibold">{email}</span>, we’ve sent a link to reset your
              password. It expires in 1 hour.
            </p>
            <Link href="/login" className="btn mt-6 w-full">Back to log in</Link>
          </>
        ) : (
          <form onSubmit={submit}>
            <h1 className="mt-5 font-display text-2xl font-extrabold text-forest-900">Reset your password</h1>
            <p className="mt-1 text-sm text-forest-900/60">Enter your email and we’ll send a reset link.</p>
            <div className="mt-5">
              <label className="label" htmlFor="email">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <button className="btn mt-6 w-full" disabled={loading}>{loading ? 'Sending…' : 'Send reset link'}</button>
            <p className="mt-4 text-center text-sm text-slate-600">
              Remembered it? <Link href="/login" className="font-medium text-brand-600">Log in</Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
