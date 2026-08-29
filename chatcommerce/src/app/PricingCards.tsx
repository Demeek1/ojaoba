'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { PLANS, formatPrice, type Currency } from '@/lib/plans';

export default function PricingCards({
  initialCurrency = 'USD',
  variant = 'full',
}: {
  initialCurrency?: Currency;
  variant?: 'full' | 'compact';
}) {
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const plans = variant === 'compact' ? PLANS.filter((p) => p.id !== 'enterprise') : PLANS;

  return (
    <div>
      {/* Currency toggle */}
      <div className="mx-auto mb-8 flex w-fit items-center gap-1 rounded-full border border-forest-900/10 bg-white p-1">
        {(['NGN', 'USD'] as Currency[]).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
              currency === c ? 'bg-forest-900 text-white' : 'text-forest-900/50 hover:text-forest-900'
            }`}
          >
            {c === 'NGN' ? '₦ Naira' : '$ USD'}
          </button>
        ))}
      </div>

      <div className={`grid gap-5 ${variant === 'compact' ? 'sm:grid-cols-3' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {plans.map((p) => (
          <div
            key={p.id}
            className={`flex flex-col rounded-3xl p-6 ${
              p.highlight ? 'grad-lime text-forest-900 ring-glow' : 'border border-forest-900/10 bg-white text-forest-900'
            }`}
          >
            {p.highlight && (
              <span className="mb-2 inline-block w-fit rounded-full bg-forest-900 px-3 py-0.5 text-xs font-bold text-brand-400">
                Most popular
              </span>
            )}
            <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
            <p className={`text-xs ${p.highlight ? 'text-forest-900/60' : 'text-forest-900/50'}`}>{p.tagline}</p>
            <p className="mt-3 font-display text-3xl font-extrabold">
              {formatPrice(p, currency)}
              {p.ngn !== null && <span className="text-base font-semibold opacity-60">/mo</span>}
            </p>

            {variant === 'full' && (
              <div className={`mt-3 grid grid-cols-2 gap-1 rounded-xl p-2 text-[11px] ${p.highlight ? 'bg-forest-900/10' : 'bg-cream'}`}>
                <span>{p.limits.channels}</span><span>{p.limits.seats}</span>
                <span>{p.limits.products}</span><span>{p.limits.ai}</span>
              </div>
            )}

            <ul className="mt-5 flex-1 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className={`h-4 w-4 shrink-0 ${p.highlight ? 'text-forest-900' : 'text-brand-600'}`} /> {f}
                </li>
              ))}
            </ul>

            <Link
              href={p.id === 'enterprise' ? 'mailto:sales@chatcommerce.app' : '/signup'}
              className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 font-display text-sm font-bold ${
                p.highlight ? 'bg-forest-900 text-white' : 'btn'
              }`}
            >
              {p.id === 'enterprise' ? 'Contact sales' : `Choose ${p.name}`}
            </Link>
          </div>
        ))}
      </div>

      <p className="mt-6 text-center text-xs text-forest-900/50">
        Prices exclude WhatsApp/Meta message fees and payment-provider fees, which are passed through transparently.
        14-day free trial. *Fair-use limits apply.
      </p>
    </div>
  );
}
