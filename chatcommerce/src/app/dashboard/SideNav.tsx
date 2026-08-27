'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid, Package, MessageCircle, Store, Receipt, Settings } from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: LayoutGrid },
  { href: '/dashboard/products', label: 'Products', icon: Package },
  { href: '/dashboard/channels', label: 'Channels', icon: MessageCircle },
  { href: '/dashboard/stores', label: 'Stores', icon: Store },
  { href: '/dashboard/orders', label: 'Orders', icon: Receipt },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function SideNav({
  isOwner,
  variant = 'sidebar',
}: {
  isOwner: boolean;
  variant?: 'sidebar' | 'top';
}) {
  const path = usePathname();
  const isActive = (href: string) => (href === '/dashboard' ? path === href : path.startsWith(href));

  if (variant === 'top') {
    // Horizontal, scrollable nav for mobile.
    return (
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {nav.map((n) => {
          const active = isActive(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-brand-500 text-forest-900' : 'bg-white/10 text-white/70'
              }`}
            >
              <n.icon className="h-4 w-4" /> {n.label}
            </Link>
          );
        })}
        {isOwner && (
          <Link href="/admin" className="flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-brand-300">
            <LayoutGrid className="h-4 w-4" /> Admin
          </Link>
        )}
      </nav>
    );
  }

  return (
    <nav className="flex-1 space-y-1">
      {nav.map((n) => {
        const active = isActive(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
              active ? 'bg-brand-500 text-forest-900' : 'text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <n.icon className="h-4 w-4" /> {n.label}
          </Link>
        );
      })}
      {isOwner && (
        <Link
          href="/admin"
          className="mt-2 flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-brand-300 hover:bg-white/10"
        >
          <LayoutGrid className="h-4 w-4" /> Admin console
        </Link>
      )}
    </nav>
  );
}
