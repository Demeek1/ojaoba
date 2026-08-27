import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import SideNav from './SideNav';
import LogoutButton from './LogoutButton';
import Logo from '../Logo';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');
  const isOwner = session.role === 'platform_owner';

  return (
    <div className="flex min-h-screen bg-cream">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-forest-900 p-5 sm:flex">
        <div className="mb-8 px-1"><Logo tone="dark" href="/dashboard" /></div>
        <SideNav isOwner={isOwner} />
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="truncate px-3 text-xs text-white/40">{session.email}</p>
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 bg-forest-900 px-4 py-3 sm:hidden">
          <div className="flex items-center justify-between">
            <Logo tone="dark" href="/dashboard" />
            <LogoutButton compact />
          </div>
          <div className="mt-3">
            <SideNav isOwner={isOwner} variant="top" />
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden p-5 sm:p-10">{children}</main>
      </div>
    </div>
  );
}
