'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Users, UserPlus, Trash2, Shield, Loader2, Eye, EyeOff,
  KeyRound, Crown, Mail, X,
} from 'lucide-react';

interface Admin {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
}

const inputCls = "w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent";

export default function TeamPage() {
  const qc = useQueryClient();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);

  // Reset-password modal state
  const [resetFor, setResetFor] = useState<Admin | null>(null);
  const [newPw, setNewPw] = useState('');

  const { data: admins, isLoading, error } = useQuery({
    queryKey: ['admins'],
    queryFn: async () => {
      const res = await api.get('/admin/admins');
      return res.data as Admin[];
    },
    retry: false,
  });

  // If a non-super-admin somehow lands here, the API returns 403 — bounce them home.
  if ((error as any)?.response?.status === 403) {
    if (typeof window !== 'undefined') router.replace('/admin');
  }

  const create = useMutation({
    mutationFn: async () => {
      await api.post('/admin/admins', { email, password, name });
    },
    onSuccess: () => {
      toast.success('Admin added — they can log in now');
      setEmail(''); setName(''); setPassword('');
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not add admin'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => { await api.delete(`/admin/admins/${id}`); },
    onSuccess: () => {
      toast.success('Admin removed');
      qc.invalidateQueries({ queryKey: ['admins'] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not remove admin'),
  });

  const resetPw = useMutation({
    mutationFn: async () => {
      await api.patch(`/admin/admins/${resetFor!.id}/password`, { password: newPw });
    },
    onSuccess: () => {
      toast.success('Password updated');
      setResetFor(null); setNewPw('');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Could not update password'),
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error('Email and password are required'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    create.mutate();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">Team</h1>
            <p className="text-gray-500 text-sm mt-0.5">Add admins to help manage orders & reply to customers</p>
          </div>
        </div>
      </div>

      {/* Add admin */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden mb-6">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <UserPlus className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="font-bold text-gray-900">Add a new admin</h2>
        </div>
        <form onSubmit={handleAdd} className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@ojaoba.com"
                autoComplete="off"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Jane Doe"
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
                className={`${inputCls} pr-12`}
              />
              <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Share this email & password with your staff — they sign in at the same admin login.</p>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors"
          >
            {create.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Add Admin
          </button>
        </form>
      </div>

      {/* Team list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-50 bg-gray-50/50">
          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-emerald-600" />
          </div>
          <h2 className="font-bold text-gray-900">Team members</h2>
          {admins && <span className="ml-auto text-xs font-semibold text-gray-400">{admins.length} total</span>}
        </div>

        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 animate-spin text-emerald-500" />
          </div>
        ) : (
          <ul className="divide-y divide-gray-50">
            {admins?.map(a => {
              const isSuper = a.role === 'super_admin';
              return (
                <li key={a.id} className="flex items-center gap-3 px-6 py-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${isSuper ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {(a.name || a.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 truncate">{a.name || a.email.split('@')[0]}</span>
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Crown className="w-3 h-3" /> Super Admin
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Admin</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                      <Mail className="w-3 h-3" /> <span className="truncate">{a.email}</span>
                    </div>
                  </div>
                  {!isSuper && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setResetFor(a); setNewPw(''); }}
                        title="Reset password"
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Remove ${a.email} from the team?`)) remove.mutate(a.id); }}
                        title="Remove admin"
                        disabled={remove.isPending}
                        className="w-9 h-9 flex items-center justify-center rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Reset password modal */}
      {resetFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setResetFor(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-gray-900">Reset password</h3>
              <button onClick={() => setResetFor(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Set a new password for <span className="font-semibold text-gray-700">{resetFor.email}</span>.</p>
            <input
              type="text"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              placeholder="New password (min 6 chars)"
              className={inputCls}
              autoFocus
            />
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setResetFor(null)}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { if (newPw.length < 6) { toast.error('Min 6 characters'); return; } resetPw.mutate(); }}
                disabled={resetPw.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 transition-colors"
              >
                {resetPw.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Update
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
