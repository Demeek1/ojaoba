import Link from 'next/link';
import { headers } from 'next/headers';
import { ArrowLeft } from 'lucide-react';
import PricingCards from '../PricingCards';
import { currencyForCountry } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default function Pricing() {
  const country = headers().get('x-vercel-ip-country');
  const initialCurrency = currencyForCountry(country);

  return (
    <main className="min-h-screen bg-cream">
      <header className="bg-forest-900 px-5 py-5">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <Link href="/signup" className="btn px-5 py-2.5 text-sm">Start free</Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-14">
        <h1 className="text-center font-display text-5xl font-extrabold tracking-tight text-forest-900 sm:text-6xl">
          Simple pricing. Start free.
        </h1>
        <p className="mt-4 text-center text-forest-900/60">
          14-day free trial, no card. Prices shown in {initialCurrency === 'NGN' ? 'Naira' : 'USD'} — switch anytime.
        </p>
        <div className="mt-12">
          <PricingCards initialCurrency={initialCurrency} variant="full" />
        </div>
      </div>
    </main>
  );
}
