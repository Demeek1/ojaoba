'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (compact) {
    return (
      <button
        onClick={logout}
        aria-label="Log out"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={logout}
      className="mt-1 flex w-full items-center gap-3 rounded-full px-4 py-2.5 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
    >
      <LogOut className="h-4 w-4" /> Log out
    </button>
  );
}
