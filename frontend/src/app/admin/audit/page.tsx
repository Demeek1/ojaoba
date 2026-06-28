'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { ScrollText, Search, Shield, LogIn, AlertTriangle, UserPlus, UserCog, Trash2, KeyRound, Activity } from 'lucide-react';

const PURPLE = '#2D0A4E';
const GOLD = '#F59E0B';

interface AuditEvent {
  id: string; actor_email: string; action: string;
  target_type: string | null; target_id: string | null;
  metadata: any; ip: string | null; created_at: string;
}

const ICONS: Record<string, any> = {
  'login.success': LogIn, 'login.failed': AlertTriangle, 'login.blocked_inactive': AlertTriangle,
  'staff.created': UserPlus, 'staff.updated': UserCog, 'staff.deleted': Trash2,
  'staff.changed_own_password': KeyRound,
};
function iconFor(action: string) { return ICONS[action] || Activity; }
function colorFor(action: string) {
  if (action.includes('failed') || action.includes('deleted') || action.includes('blocked')) return '#DC2626';
  if (action.includes('created') || action.includes('success')) return '#16A34A';
  return PURPLE;
}
function labelFor(action: string) {
  const map: Record<string, string> = {
    'login.success': 'Signed in', 'login.failed': 'Failed login attempt',
    'login.blocked_inactive': 'Blocked login (deactivated)',
    'staff.created': 'Created staff member', 'staff.updated': 'Updated staff member',
    'staff.deleted': 'Deleted staff member', 'staff.changed_own_password': 'Changed own password',
  };
  return map[action] || action;
}
function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'just now';
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  const load = (action?: string) => {
    setLoading(true);
    api.get('/admin/audit', { params: { limit: 200, ...(action ? { action } : {}) } })
      .then((r) => setEvents(r.data.events || []))
      .catch((e) => toast.error(e?.response?.data?.error || 'Failed to load activity'))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="p-5 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black flex items-center gap-2" style={{ color: PURPLE }}>
          <ScrollText className="w-6 h-6" /> Activity Log
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Every privileged action is recorded — who did what, and when.</p>
      </div>

      <div className="flex gap-2 mb-5">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') load(filter); }}
            placeholder="Filter by action (e.g. staff, login)…"
            className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none"
          />
        </div>
        <button onClick={() => load(filter)} className="px-4 py-2.5 rounded-xl font-bold text-sm" style={{ background: PURPLE, color: 'white' }}>Search</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: GOLD }} /></div>
      ) : !events.length ? (
        <div className="text-center py-20 text-gray-400">
          <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No activity recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {events.map((ev) => {
            const Icon = iconFor(ev.action);
            const color = colorFor(ev.action);
            return (
              <div key={ev.id} className="flex items-start gap-3 p-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: `${color}15` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{labelFor(ev.action)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    <span className="font-medium">{ev.actor_email}</span>
                    {ev.metadata?.email && ev.metadata.email !== ev.actor_email && <> → {ev.metadata.email}</>}
                    {ev.metadata?.role && <> · role: {ev.metadata.role}</>}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">{timeAgo(ev.created_at)}</p>
                  {ev.ip && <p className="text-[10px] text-gray-300 mt-0.5">{ev.ip}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
