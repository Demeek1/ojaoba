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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const r = await api<{ role: string }>('/api/auth/login', {
        method: 'POST',
        body: { email, password },
      });
      router.push(r.role === 'platform_owner' ? '/admin' : '/dashboard');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={submit} className="card w-full max-w-md">
        <h1 className="text-2xl font-bold">Welcome back</h1>
        {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
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
