'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { UserPlus, Shield, Trash2, Crown, User } from 'lucide-react';

const roleStyle: Record<string, string> = {
  owner: 'bg-brand-100 text-brand-700',
  admin: 'bg-amber-100 text-amber-700',
  staff: 'bg-forest-900/5 text-forest-900/60',
};

export default function Team() {
  const [data, setData] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await api('/api/vendor/team');
    setData(r);
    try { const a = await api('/api/vendor/audit'); setAudit(a.entries || []); } catch { /* staff can't read */ }
  }
  useEffect(() => { load().catch((e) => setError(e.message)); }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(''); setError('');
    try {
      await api('/api/vendor/team', { method: 'POST', body: { email, teamRole: role } });
      setEmail(''); setMsg('Invite sent — they’ll get an email to set their password.');
      await load();
    } catch (e: any) { setError(e.message); } finally { setBusy(false); }
  }
  async function changeRole(userId: string, teamRole: string) {
    try { await api('/api/vendor/team', { method: 'PATCH', body: { userId, teamRole } }); await load(); }
    catch (e: any) { setError(e.message); }
  }
  async function remove(userId: string) {
    try { await api('/api/vendor/team', { method: 'DELETE', body: { userId } }); await load(); }
    catch (e: any) { setError(e.message); }
  }

  if (error && !data) return <p className="text-red-600">{error}</p>;
  if (!data) return <p className="text-forest-900/50">Loading…</p>;

  const canManage = ['owner', 'admin'].includes(data.myRole);

  return (
    <div>
      <h1 className="font-display text-3xl font-extrabold text-forest-900">Team</h1>
      <p className="mt-1 text-sm text-forest-900/60">Invite staff and control who can do what. Owners &amp; admins can manage the team.</p>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {canManage && (
        <form onSubmit={invite} className="card mt-6 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
          <input className="input" type="email" placeholder="teammate@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="staff">Staff — products, orders, chat</option>
            <option value="admin">Admin — everything except billing/team</option>
          </select>
          <button className="btn" disabled={busy}><UserPlus className="h-4 w-4" />{busy ? 'Inviting…' : 'Invite'}</button>
        </form>
      )}
      {msg && <p className="mt-3 text-sm font-medium text-brand-700">{msg}</p>}

      <div className="card mt-6 p-0">
        <ul className="divide-y divide-forest-900/5">
          {data.members.map((m: any) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-900/5 text-forest-900/60">
                  {m.team_role === 'owner' ? <Crown className="h-4 w-4" /> : m.team_role === 'admin' ? <Shield className="h-4 w-4" /> : <User className="h-4 w-4" />}
                </span>
                <div>
                  <p className="font-medium text-forest-900">{m.email}{m.id === data.me && <span className="text-forest-900/40"> (you)</span>}</p>
                  {m.email_verified === false && <p className="text-xs text-amber-600">Invite pending</p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${roleStyle[m.team_role] || roleStyle.staff}`}>{m.team_role || 'owner'}</span>
                {canManage && m.team_role !== 'owner' && m.id !== data.me && (
                  <>
                    <select className="rounded-lg border border-forest-900/10 bg-white px-2 py-1 text-xs" value={m.team_role} onChange={(e) => changeRole(m.id, e.target.value)}>
                      <option value="staff">staff</option>
                      <option value="admin">admin</option>
                    </select>
                    <button onClick={() => remove(m.id)} className="text-forest-900/40 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {canManage && (
        <div className="card mt-6">
          <h2 className="font-display text-lg font-extrabold text-forest-900">Activity log</h2>
          {audit.length === 0 ? (
            <p className="py-6 text-center text-sm text-forest-900/40">No activity yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-forest-900/5 text-sm">
              {audit.map((a: any, i: number) => (
                <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-forest-900"><span className="font-medium">{a.actor}</span> · {a.action.replace(/[._]/g, ' ')}</span>
                  <span className="text-xs text-forest-900/40">{new Date(a.created_at).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
