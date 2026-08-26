import Link from 'next/link';
import Logo from '../Logo';

export default function LegalShell({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-cream">
      <header className="bg-forest-900 px-5 py-5">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Logo tone="dark" />
          <Link href="/" className="text-sm font-semibold text-white/70 hover:text-white">← Home</Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-5 py-12">
        <h1 className="font-display text-4xl font-extrabold text-forest-900">{title}</h1>
        <p className="mt-2 text-sm text-forest-900/50">Last updated: {updated}</p>
        <div className="prose-legal mt-8 space-y-5 text-forest-900/80">{children}</div>
        <p className="mt-12 border-t border-forest-900/10 pt-6 text-sm text-forest-900/50">
          Questions? Contact us at{' '}
          <a href="mailto:support@chatcommerce.app" className="font-semibold text-brand-700">
            support@chatcommerce.app
          </a>
          .
        </p>
      </article>
    </main>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-xl font-extrabold text-forest-900">{children}</h2>;
}
