import Link from 'next/link';
import Logo from './Logo';
import { ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-forest-900 px-6 text-center text-white">
      <Logo tone="dark" />
      <p className="mt-10 font-display text-7xl font-extrabold text-brand-500">404</p>
      <h1 className="mt-3 font-display text-2xl font-extrabold">This page wandered off</h1>
      <p className="mt-2 max-w-sm text-white/60">
        The link may be broken, or the store you’re looking for doesn’t exist or was suspended.
      </p>
      <Link href="/" className="btn mt-8">
        <ArrowLeft className="h-4 w-4" /> Back home
      </Link>
    </main>
  );
}
