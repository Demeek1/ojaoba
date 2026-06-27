import Link from 'next/link';
import { Check, ArrowLeft } from 'lucide-react';

const plans = [
  { name: 'Trial', price: 'Free', tagline: '14 days', features: ['1 channel', '1 store', 'Up to 50 products', 'Chat ordering'] },
  { name: 'Starter', price: '$29/mo', tagline: 'Solo vendors', features: ['2 channels', 'Shopify / WooCommerce sync', 'Unlimited products', 'Order dashboard'], highlight: true },
  { name: 'Pro', price: '$99/mo', tagline: 'Growing brands', features: ['All channels', 'Priority webhooks', 'Broadcast messages', 'Analytics'] },
  { name: 'Enterprise', price: "Let's talk", tagline: 'High volume', features: ['Dedicated infra', 'Custom integrations', 'SLA & support', 'SSO'] },
];

export default function Pricing() {
  return (
    <main className="min-h-screen bg-forest-900 px-5 py-12 text-white">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <h1 className="mt-6 text-center font-display text-5xl font-extrabold tracking-tight sm:text-6xl">
          Simple pricing. Pay to plug in.
        </h1>
        <p className="mt-4 text-center text-white/70">Start free. Upgrade when you’re ready to go live.</p>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-3xl p-6 ${
                p.highlight ? 'grad-lime text-forest-900' : 'bg-forest-700 text-white'
              }`}
            >
              <h3 className="font-display text-lg font-extrabold">{p.name}</h3>
              <p className={`text-xs ${p.highlight ? 'text-forest-900/60' : 'text-white/50'}`}>{p.tagline}</p>
              <p className="mt-3 font-display text-3xl font-extrabold">{p.price}</p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className={`h-4 w-4 ${p.highlight ? 'text-forest-900' : 'text-brand-500'}`} /> {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/signup"
                className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 font-display text-sm font-bold ${
                  p.highlight ? 'bg-forest-900 text-white' : 'btn'
                }`}
              >
                Choose {p.name}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
