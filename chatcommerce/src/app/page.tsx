import Link from 'next/link';
import { headers } from 'next/headers';
import Logo from './Logo';
import PricingCards from './PricingCards';
import { currencyForCountry } from '@/lib/plans';
import {
  MessageCircle, Store, ShieldCheck, Zap, Plug, BarChart3, ArrowRight, Play, Menu, Check, X,
  BadgeCheck, Clock, Lock, Sparkles,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function Home() {
  const currency = currencyForCountry(headers().get('x-vercel-ip-country'));

  return (
    <main className="min-h-screen bg-forest-900 text-white">
      {/* Announcement bar */}
      <div className="bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-forest-900">
        🚀 Self-serve — create your store in minutes. Plans from ₦15,000/mo.
      </div>

      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Logo tone="dark" />
        <nav className="hidden items-center gap-7 text-sm font-semibold text-white/70 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#why" className="hover:text-white">Why us</a>
          <a href="#pricing" className="hover:text-white">Pricing</a>
          <a href="#faq" className="hover:text-white">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-semibold text-white/80 hover:text-white sm:block">Log in</Link>
          <Link href="/signup" className="btn px-5 py-2.5 text-sm">Get started</Link>
          <button className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 md:hidden"><Menu className="h-5 w-5" /></button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-6 sm:pt-12">
        <span className="animate-fade-up inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80">
          <Sparkles className="h-4 w-4 text-brand-400" /> WhatsApp-first commerce for African sellers
        </span>
        <h1 className="animate-fade-up d1 mt-5 max-w-4xl font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
          Turn every chat into a <span className="grad-text">checkout.</span>
        </h1>
        <p className="animate-fade-up d2 mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
          ChatCommerce turns your WhatsApp into a storefront — customers browse your catalog, add to
          cart and place an order inside the conversation. Connect your Shopify or WordPress shop, or
          add products by hand. Set up your store in minutes.
        </p>
        <div className="animate-fade-up d3 mt-8 flex flex-wrap items-center gap-4">
          <Link href="/signup" className="btn text-base">Start free <ArrowRight className="h-4 w-4" /></Link>
          <a href="#pricing" className="btn-ghost text-base">See pricing</a>
        </div>
        <p className="animate-fade-up d4 mt-6 text-sm font-medium text-white/60">
          Built for fashion, food, beauty, electronics &amp; more — no code required.
        </p>

        {/* Showcase */}
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-4xl ring-glow">
            <div className="grad-lime aspect-[4/3] w-full" />
            <div className="animate-floaty absolute left-5 top-5 rounded-2xl bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-forest-900/60">Total sales</span>
                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">this month</span>
              </div>
              <p className="font-display text-xl font-extrabold text-forest-900">₦2,140,000</p>
            </div>
            <div className="absolute bottom-16 right-5 space-y-2">
              <Toast>You got a review! ✨</Toast>
              <Toast>New order <b className="text-brand-700">₦12,500</b> 🎉</Toast>
            </div>
            <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 backdrop-blur">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-900 text-white"><Play className="h-3.5 w-3.5" /></span>
              <span className="font-display text-sm font-bold text-forest-900">Why we built ChatCommerce</span>
            </div>
          </div>

          <div className="mx-auto w-full max-w-sm overflow-hidden rounded-4xl border-8 border-black bg-[#e9f7ef] shadow-soft">
            <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-display font-bold">B</div>
              <div><p className="text-sm font-semibold leading-tight text-white">Bella&apos;s Boutique</p><p className="text-xs text-white/80">online</p></div>
            </div>
            <div className="space-y-3 px-4 py-5 text-sm text-forest-900">
              <Bubble side="in">Hi! 👋 Reply <b>menu</b> to see today&apos;s items.</Bubble>
              <Bubble side="out">menu</Bubble>
              <Bubble side="in">🛍️ 1. Silk Scarf — ₦9,000<br />2. Leather Tote — ₦32,000</Bubble>
              <Bubble side="out">add 2</Bubble>
              <Bubble side="in">✅ Added <b>Leather Tote</b>. Reply <b>checkout</b>.</Bubble>
              <Bubble side="out">checkout</Bubble>
              <Bubble side="in">🎉 Order placed! Total <b>₦32,000</b>.</Bubble>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-white/10 py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-9 gap-y-3 px-5 text-sm font-semibold text-white/40">
          <span className="text-white/30">Works with</span>
          <span>WhatsApp</span><span>Telegram</span><span>Instagram</span><span>Shopify</span><span>WooCommerce</span><span>Paystack</span>
        </div>
      </section>

      {/* Stat band (sourced, no invented figure) */}
      <section className="grad-lime py-16 text-center text-forest-900">
        <p className="font-display text-4xl font-extrabold sm:text-5xl">Your customers already chat.</p>
        <p className="mt-3 font-display text-lg font-semibold text-forest-900/70">Meet them there — and turn conversations into orders.</p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Everything you need to sell on chat</h2>
        <p className="mt-3 max-w-xl text-white/60">Onboard in minutes. Stay in control. Built multi-tenant and secure from day one.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Plug />} title="Plug in WhatsApp">Connect WhatsApp through Meta’s official Business Platform — with Telegram &amp; Instagram rolling out.</FeatureCard>
          <FeatureCard icon={<Store />} title="Import your catalog">Sync products from Shopify or WooCommerce, or add them by hand or CSV.</FeatureCard>
          <FeatureCard icon={<MessageCircle />} title="Order inside chat">Customers say “menu”, add items and place an order without leaving the conversation.</FeatureCard>
          <FeatureCard icon={<Sparkles />} title="AI concierge">Optional AI understands natural language — and never invents prices or stock; it uses your real catalog.</FeatureCard>
          <FeatureCard icon={<ShieldCheck />} title="Isolated & encrypted">Every vendor isolated at the database level (row-level security). Channel secrets encrypted with AES-256-GCM.</FeatureCard>
          <FeatureCard icon={<BarChart3 />} title="One clean dashboard">Track orders, channels and customers. Owner console monitors the whole platform.</FeatureCard>
        </div>
      </section>

      {/* Why us / comparison */}
      <section id="why" className="surface-light py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-4xl font-extrabold tracking-tight text-forest-900 sm:text-5xl">More than an AI chat agent</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-forest-900/60">
            Chatbots answer questions. ChatCommerce runs the whole sale — catalog, cart, order — and you set
            it up yourself, today.
          </p>
          <div className="mt-12 overflow-hidden rounded-3xl border border-forest-900/10 bg-white shadow-card">
            <div className="grid grid-cols-3 bg-forest-900 text-sm font-semibold text-white">
              <div className="px-5 py-4"> </div>
              <div className="px-5 py-4 text-center text-white/60">Typical AI chat agent</div>
              <div className="px-5 py-4 text-center font-display text-base font-extrabold text-brand-400">ChatCommerce</div>
            </div>
            {[
              ['Go live', 'Apply, wait for a pilot batch', 'Self-serve sign-up'],
              ['What it does', 'Answers messages', 'Full store: catalog, cart, orders'],
              ['Channels', 'WhatsApp only', 'WhatsApp today; Telegram & IG rolling out'],
              ['Store sync', '—', 'Shopify + WooCommerce import'],
              ['Storefront page', '—', 'Every vendor gets one'],
              ['Entry price', 'from ₦30,000/mo', 'from ₦15,000/mo'],
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 items-center text-sm ${i % 2 ? 'bg-cream/50' : 'bg-white'}`}>
                <div className="px-5 py-4 font-semibold text-forest-900">{row[0]}</div>
                <div className="flex items-center justify-center gap-2 px-5 py-4 text-center text-forest-900/50"><X className="h-4 w-4 shrink-0 text-red-400" />{row[1]}</div>
                <div className="flex items-center justify-center gap-2 px-5 py-4 text-center font-semibold text-forest-900"><Check className="h-4 w-4 shrink-0 text-brand-600" />{row[2]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Live in a few steps</h2>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
          <Step n="01" title="Create your store" icon={<Store />}>Sign up and get your isolated store + storefront link.</Step>
          <Step n="02" title="Connect a channel" icon={<Plug />}>Add WhatsApp and import your products.</Step>
          <Step n="03" title="Take chat orders" icon={<MessageCircle />}>Customers message “menu” and order in seconds. 🎉</Step>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <div className="rounded-4xl border border-white/10 bg-forest-700 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-sm font-semibold text-brand-300"><Lock className="h-4 w-4" /> Security first</span>
              <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Your data, isolated and encrypted</h2>
              <p className="mt-3 text-white/70">Built multi-tenant from day one — every vendor is isolated at the database level with row-level security, so no one sees anyone else’s data. Channel tokens are encrypted, passwords hashed, traffic on HTTPS, and abuse is rate-limited.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SecItem icon={<ShieldCheck />} title="Row-level isolation">Enforced in the database</SecItem>
              <SecItem icon={<Lock />} title="AES-256-GCM">Channel secrets encrypted</SecItem>
              <SecItem icon={<Clock />} title="Rate limited">Bots &amp; brute-force blunted</SecItem>
              <SecItem icon={<BadgeCheck />} title="HTTPS everywhere">Encrypted in transit</SecItem>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="surface-light py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center font-display text-4xl font-extrabold tracking-tight text-forest-900 sm:text-5xl">Simple pricing. Start free.</h2>
          <p className="mt-3 text-center text-forest-900/60">14-day free trial, no card. Switch currency anytime.</p>
          <div className="mt-12"><PricingCards initialCurrency={currency} variant="compact" /></div>
          <p className="mt-6 text-center"><Link href="/pricing" className="font-display font-bold text-brand-700">Compare all plans →</Link></p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Questions, answered</h2>
        <div className="mt-10 space-y-3">
          <Faq q="Do I need to code?" a="No. Sign up, connect a channel, import or add products — all from the dashboard." />
          <Faq q="Which channels work today?" a="WhatsApp, via Meta’s official Business Platform. Telegram and Instagram are rolling out next." />
          <Faq q="How fast can I start?" a="You can create your store and add products in minutes. WhatsApp itself requires a one-time Meta business approval, which we guide you through." />
          <Faq q="How do payments work?" a="Take orders in chat and get paid with Paystack (Naira) or Stripe. Where in-chat checkout isn’t supported, we send a secure branded checkout link." />
          <Faq q="Is my data safe?" a="Every vendor is isolated at the database level, channel secrets are encrypted (AES-256-GCM), and all traffic is over HTTPS. No system is ever 100% unhackable, but we hold to strong, verifiable controls." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grad-lime rounded-4xl px-6 py-16 text-center text-forest-900">
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Start selling on chat today</h2>
          <p className="mx-auto mt-3 max-w-xl text-forest-900/70">Create your store, connect a channel, and take your first order.</p>
          <Link href="/signup" className="btn-dark mt-8 inline-flex text-base">Get started free <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest-700 px-5 py-14 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Logo tone="dark" />
            <p className="mt-3 max-w-sm text-sm">Sell where your customers already are. Built for vendors everywhere.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <a href="#features" className="hover:text-white">Features</a>
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Get started</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
        <p className="mx-auto mt-10 max-w-6xl text-xs text-white/40">© {new Date().getFullYear()} ChatCommerce. All rights reserved.</p>
      </footer>
    </main>
  );
}

function Toast({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-forest-900 shadow-soft">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-grass text-white"><BadgeCheck className="h-3 w-3" /></span>
      <span>{children}</span>
    </div>
  );
}
function Bubble({ side, children }: { side: 'in' | 'out'; children: React.ReactNode }) {
  return (
    <div className={side === 'out' ? 'flex justify-end' : 'flex justify-start'}>
      <div className={`max-w-[82%] rounded-2xl px-3 py-2 leading-snug shadow-sm ${side === 'out' ? 'rounded-br-sm bg-brand-500 text-forest-900' : 'rounded-bl-sm bg-white text-forest-900'}`}>{children}</div>
    </div>
  );
}
function FeatureCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card-mint text-forest-900 transition hover:-translate-y-1">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-forest-900">{icon}</div>
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-forest-900/70">{children}</p>
    </div>
  );
}
function Step({ n, title, icon, children }: { n: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-4xl border border-white/10 bg-forest-700 p-7">
      <div className="flex items-center justify-between">
        <span className="font-display text-3xl font-extrabold text-brand-400">{n}</span>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500 text-forest-900">{icon}</span>
      </div>
      <h3 className="mt-4 font-display text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{children}</p>
    </div>
  );
}
function SecItem({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/20 text-brand-300">{icon}</span>
      <p className="mt-3 font-display font-bold">{title}</p>
      <p className="text-sm text-white/60">{children}</p>
    </div>
  );
}
function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded-2xl border border-white/10 bg-white/5 p-5">
      <summary className="flex cursor-pointer list-none items-center justify-between font-display font-bold">
        {q}
        <span className="text-brand-400 transition group-open:rotate-45">+</span>
      </summary>
      <p className="mt-3 text-sm leading-relaxed text-white/70">{a}</p>
    </details>
  );
}
