import Link from 'next/link';
import {
  MessageCircle, Store, ShieldCheck, Zap, Plug, BarChart3, ArrowRight, Play, Menu, Check, BadgeCheck,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-forest-900 text-white">
      {/* ── Nav ─────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <div className="font-display text-2xl font-extrabold tracking-tight text-white">chatcommerce</div>
        <div className="hidden flex-1 sm:block">
          <div className="mx-auto h-11 max-w-md rounded-full bg-white" />
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-sm font-semibold text-white/80 hover:text-white sm:block">
            Log in
          </Link>
          <Link href="/signup" className="btn px-5 py-2.5 text-sm">Get started</Link>
          <button className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 sm:hidden">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 pb-10 pt-8 sm:pt-14">
        <h1 className="max-w-4xl font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
          Sell where your customers already chat.
        </h1>
        <p className="mt-7 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
          Turn your WhatsApp, Telegram or Instagram into a storefront! Connect your Shopify or
          WordPress shop, let customers browse, add to cart and check out — all inside the
          conversation, from anywhere.
        </p>

        <div className="mt-9 flex flex-wrap items-center gap-4">
          <Link href="/signup" className="btn text-base">Get started for free <ArrowRight className="h-4 w-4" /></Link>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <div className="flex -space-x-3">
            {['#f9a8d4', '#fcd34d', '#93c5fd', '#86efac'].map((c, i) => (
              <span key={i} className="h-9 w-9 rounded-full border-2 border-forest-900" style={{ background: c }} />
            ))}
          </div>
          <span className="text-sm font-medium text-white/80">Join 500+ vendors</span>
        </div>

        {/* Phone / chat mockup with floating stat + notifications */}
        <div className="relative mt-12">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative overflow-hidden rounded-4xl">
              <div className="grad-lime aspect-[4/3] w-full" />
              {/* floating payout card */}
              <div className="absolute left-5 top-5 rounded-2xl bg-white px-4 py-3 shadow-soft">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-forest-900/60">Total sales</span>
                  <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">+29.4%</span>
                </div>
                <p className="font-display text-xl font-extrabold text-forest-900">$26,700.00</p>
              </div>
              {/* floating notifications */}
              <div className="absolute bottom-16 right-5 space-y-2">
                <Toast>You got a review! Real magic! ✨</Toast>
                <Toast>New product sale <b className="text-brand-700">$25</b>. Dope!</Toast>
              </div>
              {/* play pill */}
              <div className="absolute bottom-5 left-5 flex items-center gap-2 rounded-full bg-white/85 px-3 py-2 backdrop-blur">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest-900 text-white"><Play className="h-3.5 w-3.5" /></span>
                <span className="font-display text-sm font-bold text-forest-900">Why we built ChatCommerce</span>
              </div>
            </div>

            {/* WhatsApp-style chat */}
            <div className="mx-auto w-full max-w-sm overflow-hidden rounded-4xl border-8 border-black bg-[#e9f7ef] shadow-soft">
              <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-display font-bold">B</div>
                <div><p className="text-sm font-semibold leading-tight text-white">Bella&apos;s Boutique</p><p className="text-xs text-white/80">online</p></div>
              </div>
              <div className="space-y-3 px-4 py-5 text-sm text-forest-900">
                <Bubble side="in">Hi! 👋 Reply <b>menu</b> to see today&apos;s items.</Bubble>
                <Bubble side="out">menu</Bubble>
                <Bubble side="in">🛍️ Here&apos;s what we have:<br />1. Silk Scarf — $24.00<br />2. Leather Tote — $89.00</Bubble>
                <Bubble side="out">add 2</Bubble>
                <Bubble side="in">✅ Added <b>Leather Tote</b>. Reply <b>checkout</b>.</Bubble>
                <Bubble side="out">checkout</Bubble>
                <Bubble side="in">🎉 Order placed! Total <b>$89.00</b>.</Bubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Lime stat band ──────────────────────────────── */}
      <section className="grad-lime py-20 text-center text-forest-900">
        <p className="font-display text-6xl font-extrabold sm:text-7xl">$5.1B</p>
        <p className="mt-3 font-display text-lg font-semibold text-forest-900/70">Africa social-commerce market</p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-forest-900" />
          <span className="h-2.5 w-2.5 rounded-full bg-forest-900/30" />
          <span className="h-2.5 w-2.5 rounded-full bg-forest-900/30" />
        </div>
      </section>

      {/* ── Features ────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">
          Built with you in mind — whatever you sell
        </h2>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Plug />} title="Plug in any channel">
            Connect WhatsApp Cloud API, Telegram bots, or Instagram DMs in minutes — one webhook per channel, generated for you.
          </FeatureCard>
          <FeatureCard icon={<Store />} title="Import your catalog">
            Sync products from Shopify or WooCommerce/WordPress automatically, or add them by hand.
          </FeatureCard>
          <FeatureCard icon={<MessageCircle />} title="Order inside chat">
            Customers say “menu”, add items, and check out without ever leaving the conversation.
          </FeatureCard>
          <FeatureCard icon={<ShieldCheck />} title="Isolated & encrypted">
            Every vendor is sealed off from every other — enforced in the database. Secrets are AES-256-GCM encrypted at rest.
          </FeatureCard>
          <FeatureCard icon={<Zap />} title="Fast & reliable">
            Runs on a global edge network with serverless Postgres built to scale to millions of vendors.
          </FeatureCard>
          <FeatureCard icon={<BarChart3 />} title="You stay in control">
            Track orders, channels and customers from one clean dashboard. The platform owner monitors everything centrally.
          </FeatureCard>
        </div>
      </section>

      {/* ── Get started ─────────────────────────────────── */}
      <section className="surface-light py-20">
        <div className="mx-auto max-w-6xl px-5 text-center">
          <h2 className="font-display text-5xl font-extrabold tracking-tight sm:text-6xl">Get started in 5 mins</h2>
          <div className="mx-auto mt-14 grid max-w-4xl gap-6 md:grid-cols-3">
            <Step n="01" title="Create an account">Sign up and get your isolated store + storefront link in seconds.</Step>
            <Step n="02" title="Connect store & channel">Import products and add WhatsApp, Telegram or Instagram.</Step>
            <Step n="03" title="Take chat orders">Customers message “menu” and order in seconds. 🎉</Step>
          </div>
          <Link href="/signup" className="btn mt-12 text-base">Create your store <ArrowRight className="h-4 w-4" /></Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-forest-700 px-5 py-14 text-white/70">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <p className="font-display text-2xl font-extrabold text-white">chatcommerce</p>
            <p className="mt-2 max-w-sm text-sm">Sell where your customers already are. Built for vendors everywhere.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Get started</Link>
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
      <div className={`max-w-[82%] rounded-2xl px-3 py-2 leading-snug shadow-sm ${
        side === 'out' ? 'rounded-br-sm bg-brand-500 text-forest-900' : 'rounded-bl-sm bg-white text-forest-900'
      }`}>{children}</div>
    </div>
  );
}

function FeatureCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card-mint text-forest-900">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500 text-forest-900">{icon}</div>
      <h3 className="font-display text-xl font-extrabold">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-forest-900/70">{children}</p>
      <p className="mt-5 inline-flex items-center gap-1.5 font-display text-sm font-bold text-forest-900">Get started <ArrowRight className="h-4 w-4" /></p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card-mint text-left">
      <span className="font-display text-3xl font-extrabold text-brand-600">{n}</span>
      <h3 className="mt-3 font-display text-xl font-extrabold text-forest-900">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-forest-900/70">{children}</p>
    </div>
  );
}
