'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import {
  LayoutDashboard, ShoppingCart, Package, MessageSquare,
  BarChart3, Megaphone, Settings, LogOut, Menu, X, ChevronRight,
  Bot, Crown, Users, ScrollText, Activity,
} from 'lucide-react';

const PURPLE = '#2D0A4E';
const PURPLE_DEEP = '#1E0735';
const GOLD = '#F59E0B';

// `perm: null` → visible to every authenticated admin
const navItems: { href: string; label: string; icon: any; exact?: boolean; perm: string | null }[] = [
  { href: '/admin',           label: 'Overview',     icon: LayoutDashboard, exact: true, perm: null },
  { href: '/admin/orders',    label: 'Orders',       icon: ShoppingCart, perm: 'manage_orders' },
  { href: '/admin/products',  label: 'Products',     icon: Package,      perm: 'manage_products' },
  { href: '/admin/behavior',  label: 'Customer Insights', icon: Activity, perm: 'view_analytics' },
  { href: '/admin/analytics', label: 'Analytics',    icon: BarChart3,    perm: 'view_analytics' },
  { href: '/admin/sessions',  label: 'WhatsApp',     icon: MessageSquare, perm: 'view_sessions' },
  { href: '/admin/ai-chat',   label: 'Bot Sessions', icon: Bot,          perm: 'view_sessions' },
  { href: '/admin/broadcast', label: 'Broadcast',    icon: Megaphone,    perm: 'send_broadcast' },
  { href: '/admin/staff',     label: 'Staff & Roles', icon: Users,       perm: 'manage_staff' },
  { href: '/admin/audit',     label: 'Activity Log', icon: ScrollText,   perm: 'manage_staff' },
  { href: '/admin/settings',  label: 'Settings',     icon: Settings,     perm: 'manage_settings' },
];

interface Me { role: string; permissions: string[]; name?: string; email?: string }

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (pathname === '/admin/login') { setReady(true); return; }
    const token = localStorage.getItem('ojaoba_admin_token');
    if (!token) { router.replace('/admin/login'); return; }
    api.get('/admin/me').then((r) => {
      setMe(r.data);
      localStorage.setItem('ojaoba_admin', JSON.stringify(r.data || {}));
      setReady(true);
    }).catch(() => {
      localStorage.removeItem('ojaoba_admin_token');
      localStorage.removeItem('ojaoba_admin');
      router.replace('/admin/login');
    });
  }, [pathname, router]);

  const logout = () => {
    localStorage.removeItem('ojaoba_admin_token');
    localStorage.removeItem('ojaoba_admin');
    router.push('/admin/login');
  };

  const can = (perm: string | null) =>
    perm === null || me?.role === 'owner' || (me?.permissions || []).includes(perm);

  const visibleNav = navItems.filter((n) => can(n.perm));

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: PURPLE }}>
        <div className="w-10 h-10 border-4 rounded-full animate-spin" style={{ borderColor: 'rgba(245,158,11,0.2)', borderTopColor: GOLD }} />
      </div>
    );
  }

  if (pathname === '/admin/login') return <>{children}</>;

  const isActive = (item: typeof navItems[0]) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href);

  const roleBadge = me?.role === 'owner' ? 'Owner' : me?.role === 'admin' ? 'Admin' : me?.role === 'manager' ? 'Manager' : 'Staff';

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6" style={{ borderBottom: '1px solid rgba(245,158,11,0.15)' }}>
        <Link href="/admin" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', boxShadow: '0 6px 18px rgba(245,158,11,0.4)' }}>
            <Crown className="w-5 h-5" style={{ color: PURPLE_DEEP }} fill={PURPLE_DEEP} />
          </div>
          <div>
            <span className="font-black text-white text-lg">Ojaoba</span>
            <span className="block text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Royal Market Admin</span>
          </div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleNav.map(item => {
          const Icon = item.icon;
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all"
              style={active
                ? { background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: PURPLE_DEEP, boxShadow: '0 6px 18px rgba(245,158,11,0.35)' }
                : { color: 'rgba(255,255,255,0.7)' }}
            >
              <Icon className="w-5 h-5" />
              {item.label}
              {active && <ChevronRight className="w-4 h-4 ml-auto" />}
            </Link>
          );
        })}
      </nav>

      {/* User + Footer */}
      <div className="p-4 space-y-2" style={{ borderTop: '1px solid rgba(245,158,11,0.15)' }}>
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black" style={{ background: GOLD, color: PURPLE_DEEP }}>
            {(me?.name || me?.email || 'A').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{me?.name || me?.email}</p>
            <p className="text-[10px]" style={{ color: GOLD }}>{roleBadge}</p>
          </div>
        </div>
        <Link href="/" target="_blank" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-colors" style={{ color: 'rgba(255,255,255,0.55)' }}>
          <Package className="w-4 h-4" />
          View Live Store
        </Link>
        <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors" style={{ color: '#FCA5A5' }}>
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F4F1F8' }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 shrink-0" style={{ background: PURPLE }}>
        <Sidebar />
      </aside>

      {/* Mobile Sidebar Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-72 flex flex-col" style={{ background: PURPLE }}>
            <div className="p-4 flex justify-end">
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-white/70" />
              </button>
            </div>
            <Sidebar />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Top Bar */}
        <header className="md:hidden px-4 py-3 flex items-center justify-between sticky top-0 z-10" style={{ background: PURPLE }}>
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-xl" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <Menu className="w-5 h-5 text-white" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: GOLD }}>
                <Crown className="w-3.5 h-3.5" style={{ color: PURPLE_DEEP }} fill={PURPLE_DEEP} />
              </div>
              <span className="font-black text-white text-sm">
                {visibleNav.find(n => isActive(n))?.label || 'Ojaoba'}
              </span>
            </div>
          </div>
          <Link href="/" target="_blank" className="text-xs font-semibold px-3 py-1.5 rounded-xl" style={{ color: GOLD, border: '1px solid rgba(245,158,11,0.4)' }}>
            Live Store
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
