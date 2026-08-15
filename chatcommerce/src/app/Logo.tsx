import Link from 'next/link';

/** Wordmark + bubble mark. `tone` adapts to dark or light surfaces. */
export default function Logo({ tone = 'dark', href = '/' }: { tone?: 'dark' | 'light'; href?: string }) {
  const text = tone === 'dark' ? 'text-white' : 'text-forest-900';
  return (
    <Link href={href} className={`inline-flex items-center gap-2 font-display text-xl font-extrabold ${text}`}>
      <span className="grad-lime flex h-8 w-8 items-center justify-center rounded-xl">
        <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden>
          <path d="M9 8.5h14a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-7.2L11 24.5v-3H9a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Z" fill="#0b150d" />
          <circle cx="12.5" cy="15" r="1.5" fill="#7ed957" />
          <circle cx="16" cy="15" r="1.5" fill="#7ed957" />
          <circle cx="19.5" cy="15" r="1.5" fill="#7ed957" />
        </svg>
      </span>
      chatcommerce
    </Link>
  );
}
