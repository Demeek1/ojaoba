'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';

export default function Signup() {
  const router = useRouter();
  const [businessName, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api<{ role: string }>('/api/auth/signup', {
        method: 'POST',
        body: { businessName, email, password },
      });
      router.push(r.role === 'platform_owner' ? '/admin' : '/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mesh flex min-h-screen items-center justify-center px-6 py-10">
      <form onSubmit={submit} className="card w-full max-w-md shadow-soft">
        <h1 className="text-2xl font-bold">Create your store</h1>
        <p className="mt-1 text-sm text-slate-600">Start selling on chat in minutes.</p>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Business name</label>
            <input className="input" value={businessName} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
            <p className="mt-1 text-xs text-slate-500">At least 8 characters.</p>
          </div>
        </div>
        <button className="btn mt-6 w-full" disabled={loading}>
          {loading ? 'Creating…' : 'Create store'}
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand-600">Log in</Link>
        </p>
      </form>
    </main>
  );
}
