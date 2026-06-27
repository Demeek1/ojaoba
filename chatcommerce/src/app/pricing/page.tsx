import Link from 'next/link';
import { Check } from 'lucide-react';

const plans = [
  { name: 'Trial', price: 'Free', tagline: '14 days', features: ['1 channel', '1 store', 'Up to 50 products', 'Chat ordering'] },
  { name: 'Starter', price: '$29/mo', tagline: 'Solo vendors', features: ['2 channels', 'Shopify / WooCommerce sync', 'Unlimited products', 'Order dashboard'], highlight: true },
  { name: 'Pro', price: '$99/mo', tagline: 'Growing brands', features: ['All channels', 'Priority webhooks', 'Broadcast messages', 'Analytics'] },
  { name: 'Enterprise', price: 'Contact us', tagline: 'High volume', features: ['Dedicated infra', 'Custom integrations', 'SLA & support', 'SSO'] },
];

export default function Pricing() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-14">
      <Link href="/" className="text-sm text-brand-600">← Back</Link>
      <h1 className="mt-4 text-center text-4xl font-extrabold">Simple pricing. Pay to plug in.</h1>
      <p className="mt-3 text-center text-slate-600">Start free. Upgrade when you’re ready to go live.</p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {plans.map((p) => (
          <div key={p.name} className={`card flex flex-col ${p.highlight ? 'ring-2 ring-brand-500' : ''}`}>
            <h3 className="font-semibold">{p.name}</h3>
            <p className="text-xs text-slate-500">{p.tagline}</p>
            <p className="mt-3 text-2xl font-bold">{p.price}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
              {p.features.map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-brand-600" /> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="btn mt-5 text-sm">Choose {p.name}</Link>
          </div>
        ))}
      </div>
    </main>
  );
}
