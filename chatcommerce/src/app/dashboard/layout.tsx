import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import SideNav from './SideNav';
import LogoutButton from './LogoutButton';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-cream">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-forest-900 p-5 sm:flex">
        <div className="mb-8 px-2 font-display text-xl font-extrabold text-white">chatcommerce</div>
        <SideNav isOwner={session.role === 'platform_owner'} />
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="truncate px-3 text-xs text-white/40">{session.email}</p>
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden p-6 sm:p-10">{children}</main>
    </div>
  );
}
