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
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-brand-900 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2 font-bold">
            <ShieldCheck className="h-5 w-5" /> ChatCommerce · Platform Console
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/admin" className="hover:underline">Overview</Link>
            <Link href="/admin/tenants" className="hover:underline">Vendors</Link>
            <Link href="/dashboard" className="hover:underline">My store</Link>
            <span className="text-brand-100">{session.email}</span>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
