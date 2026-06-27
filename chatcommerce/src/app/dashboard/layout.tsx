import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { LayoutGrid, Package, MessageCircle, Store, Receipt, Settings, LogOut } from 'lucide-react';
import LogoutButton from './LogoutButton';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/channels', label: 'Channels', icon: MessageCircle },
  { href: '/dashboard/stores', label: 'Stores', icon: Store },
  { href: '/dashboard/orders', label: 'Orders', icon: Receipt },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-200 bg-white p-4 sm:flex">
        <div className="mb-6 flex items-center gap-2 px-2 text-lg font-bold text-brand-700">
          <MessageCircle className="h-5 w-5" /> ChatCommerce
        </div>
        <nav className="flex-1 space-y-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          ))}
          {session.role === 'platform_owner' && (
            <Link href="/admin" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50">
              <LayoutGrid className="h-4 w-4" /> Admin console
            </Link>
          )}
        </nav>
        <div className="border-t border-slate-200 pt-3">
          <p className="truncate px-3 text-xs text-slate-500">{session.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden bg-slate-50 p-6 sm:p-8">{children}</main>
    </div>
  );
}
