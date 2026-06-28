'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  Users, Plus, Shield, Crown, X, Trash2, Power, KeyRound, Check,
} from 'lucide-react';

const PURPLE = '#2D0A4E';
const GOLD = '#F59E0B';

const PERM_LABELS: Record<string, string> = {
  manage_staff: 'Manage staff & roles',
  manage_products: 'Manage products',
  manage_orders: 'Manage orders',
  view_sessions: 'View chat sessions',
  send_broadcast: 'Send broadcasts',
  view_analytics: 'View analytics & insights',
  manage_settings: 'Manage settings',
};
const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', manager: 'Manager', staff: 'Staff' };

interface Staff {
  id: string; email: string; name: string | null; role: string;
  permissions: string[]; active: boolean; last_login: string | null; created_at: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [myRole, setMyRole] = useState('staff');

  const load = () => {
    setLoading(true);
    api.get('/admin/staff').then((r) => {
      setStaff(r.data.staff || []);
      setRoles(r.data.roles || []);
      setAllPerms(r.data.permissions || []);
    }).catch((e) => toast.error(e?.response?.data?.error || 'Failed to load staff'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    try { setMyRole(JSON.parse(localStorage.getItem('ojaoba_admin') || '{}').role || 'staff'); } catch {}
  }, []);

  const toggleActive = async (s: Staff) => {
    try { await api.patch(`/admin/staff/${s.id}`, { active: !s.active }); toast.success(s.active ? 'Account deactivated' : 'Account activated'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };
  const remove = async (s: Staff) => {
    if (!confirm(`Delete ${s.email}? This cannot be undone.`)) return;
    try { await api.delete(`/admin/staff/${s.id}`); toast.success('Staff removed'); load(); }
    catch (e: any) { toast.error(e?.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: PURPLE }}>
            <Users className="w-6 h-6" /> Staff &amp; Roles
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Add team members and control exactly what each can access.</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: PURPLE }}>
          <Plus className="w-4 h-4" /> Add staff
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: GOLD }} /></div>
      ) : (
        <div className="grid gap-3">
          {staff.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl p-4 md:p-5 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-11 h-11 rounded-full flex items-center justify-center font-black shrink-0" style={{ background: s.role === 'owner' ? GOLD : 'rgba(45,10,78,0.1)', color: PURPLE }}>
                  {s.role === 'owner' ? <Crown className="w-5 h-5" /> : (s.name || s.email).charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-gray-900 truncate flex items-center gap-2">
                    {s.name || s.email}
                    {!s.active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Deactivated</span>}
                  </p>
                  <p className="text-xs text-gray-400 truncate">{s.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: 'rgba(245,158,11,0.12)', color: '#B45309' }}>
                  <Shield className="w-3 h-3" /> {ROLE_LABELS[s.role] || s.role}
                </span>
                <span className="text-xs text-gray-400">
                  {s.role === 'owner' ? 'All permissions' : `${s.permissions?.length || 0} permission${s.permissions?.length === 1 ? '' : 's'}`}
                </span>
              </div>

              {s.role !== 'owner' && (
                <div className="flex items-center gap-1.5">
                  <button onClick={() => setEditing(s)} className="text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gray-50" style={{ color: PURPLE }}>Edit</button>
                  <button onClick={() => toggleActive(s)} title={s.active ? 'Deactivate' : 'Activate'} className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-50" style={{ color: s.active ? '#16A34A' : '#9CA3AF' }}><Power className="w-4 h-4" /></button>
                  <button onClick={() => remove(s)} title="Delete" className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {(showAdd || editing) && (
        <StaffModal
          roles={roles}
          allPerms={allPerms}
          myRole={myRole}
          editing={editing}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={() => { setShowAdd(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function StaffModal({ roles, allPerms, myRole, editing, onClose, onSaved }: {
  roles: string[]; allPerms: string[]; myRole: string; editing: Staff | null;
  onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name || '');
  const [email, setEmail] = useState(editing?.email || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(editing?.role || 'staff');
  const [perms, setPerms] = useState<string[]>(editing?.permissions || []);
  const [saving, setSaving] = useState(false);

  const assignableRoles = roles.filter((r) => r !== 'owner' && (myRole === 'owner' || r === 'staff' || r === 'manager'));
  const toggle = (p: string) => setPerms((cur) => cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]);

  const save = async () => {
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/staff/${editing.id}`, { name, role, permissions: perms, ...(password ? { password } : {}) });
        toast.success('Staff updated');
      } else {
        await api.post('/admin/staff', { name, email, password, role, permissions: perms });
        toast.success('Staff created');
      }
      onSaved();
    } catch (e: any) { toast.error(e?.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50 p-0 md:p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-t-3xl md:rounded-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-black" style={{ color: PURPLE }}>{editing ? 'Edit staff member' : 'Add staff member'}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"><X className="w-5 h-5 text-gray-500" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Full name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2" style={{ outlineColor: GOLD }} placeholder="e.g. Chidi Okafor" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Email</label>
            <input value={email} disabled={!!editing} onChange={(e) => setEmail(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm disabled:bg-gray-50 disabled:text-gray-400" placeholder="staff@ojaoba.com" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 flex items-center gap-1"><KeyRound className="w-3.5 h-3.5" /> {editing ? 'Reset password (optional)' : 'Temporary password'}</label>
            <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm" placeholder={editing ? 'Leave blank to keep current' : 'Min. 8 characters'} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Role</label>
            <div className="flex gap-2 flex-wrap">
              {assignableRoles.map((r) => (
                <button key={r} onClick={() => setRole(r)} className="px-3.5 py-2 rounded-xl text-sm font-semibold border transition-all"
                  style={role === r ? { background: PURPLE, color: 'white', borderColor: PURPLE } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                  {ROLE_LABELS[r] || r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Permissions</label>
            <div className="grid gap-1.5">
              {allPerms.map((p) => {
                const on = perms.includes(p);
                return (
                  <button key={p} onClick={() => toggle(p)} className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-left transition-all"
                    style={on ? { borderColor: GOLD, background: 'rgba(245,158,11,0.08)' } : { borderColor: '#E5E7EB' }}>
                    <span className="w-5 h-5 rounded-md flex items-center justify-center shrink-0" style={{ background: on ? GOLD : '#F3F4F6' }}>
                      {on && <Check className="w-3.5 h-3.5" style={{ color: PURPLE }} strokeWidth={3} />}
                    </span>
                    <span className="text-sm font-medium text-gray-700">{PERM_LABELS[p] || p}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-gray-400 mt-2">Tip: roles set sensible defaults — fine-tune individual permissions above.</p>
          </div>
        </div>

        <div className="p-5 border-t border-gray-100 sticky bottom-0 bg-white flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl font-bold text-sm text-gray-600 bg-gray-100">Cancel</button>
          <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl font-bold text-sm disabled:opacity-60" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: PURPLE }}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create staff'}
          </button>
        </div>
      </div>
    </div>
  );
}
