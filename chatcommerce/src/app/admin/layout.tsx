import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { ShieldCheck } from 'lucide-react';
import LogoutButton from '../dashboard/LogoutButton';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (session.role !== 'platform_owner') redirect('/dashboard');

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-forest-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-extrabold">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-forest-900">
              <ShieldCheck className="h-5 w-5" />
            </span>
            chatcommerce <span className="font-sans text-sm font-normal text-white/50">· Platform Console</span>
          </div>
          <div className="flex items-center gap-5 text-sm font-semibold">
            <Link href="/admin" className="text-white/80 hover:text-brand-400">Overview</Link>
            <Link href="/admin/tenants" className="text-white/80 hover:text-brand-400">Vendors</Link>
            <Link href="/dashboard" className="text-white/80 hover:text-brand-400">My store</Link>
            <span className="hidden text-white/40 sm:inline">{session.email}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
    </div>
  );
}
