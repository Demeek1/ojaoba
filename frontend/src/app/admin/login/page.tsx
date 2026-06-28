'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn, Crown, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post('/admin/login', { email, password });
      localStorage.setItem('ojaoba_admin_token', res.data.token);
      localStorage.setItem('ojaoba_admin', JSON.stringify(res.data.admin || {}));
      toast.success('Welcome back!');
      router.push('/admin');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'radial-gradient(120% 120% at 50% 0%, #3D1466 0%, #2D0A4E 45%, #1E0735 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-9">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 12px 32px rgba(245,158,11,0.45)' }}>
            <Crown className="w-8 h-8" style={{ color: '#2D0A4E' }} fill="#2D0A4E" />
          </div>
          <h1 className="text-3xl font-black text-white">Ojaoba Admin</h1>
          <p className="mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>Royal market control center</p>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(245,158,11,0.2)', backdropFilter: 'blur(12px)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm text-white focus:outline-none"
                style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}
                placeholder="admin@ojaoba.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.8)' }}>Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-3 pr-12 rounded-xl text-sm text-white focus:outline-none"
                  style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.15)' }}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full font-bold py-3.5 rounded-xl transition-opacity flex items-center justify-center gap-2 text-base mt-2 disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#2D0A4E' }}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(45,10,78,0.3)', borderTopColor: '#2D0A4E' }} />
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6 flex items-center justify-center gap-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
          <ShieldCheck className="w-3.5 h-3.5" /> Secure, role-based access &bull; All actions are logged
        </p>
      </div>
    </div>
  );
}
