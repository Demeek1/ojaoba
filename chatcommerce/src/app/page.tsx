import Link from 'next/link';
import { MessageCircle, Store, ShieldCheck, Zap, Plug, BarChart3, Check, ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-ink-100/70 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 text-lg font-extrabold text-ink-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-500 text-white">
              <MessageCircle className="h-5 w-5" />
            </span>
            ChatCommerce
          </div>
          <nav className="flex items-center gap-2 sm:gap-4">
            <Link href="/pricing" className="hidden text-sm font-medium text-ink-700 hover:text-ink-900 sm:block">
              Pricing
            </Link>
            <Link href="/login" className="text-sm font-medium text-ink-700 hover:text-ink-900">
              Log in
            </Link>
            <Link href="/signup" className="btn text-sm">
              Start free <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mesh">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white px-3 py-1 text-sm font-medium text-brand-700">
              <span className="h-2 w-2 rounded-full bg-brand-500" /> WhatsApp · Telegram · Instagram
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-6xl">
              Sell where your customers <span className="text-brand-600">already chat.</span>
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-700">
              Plug your WhatsApp, Telegram or Instagram into your store and let customers browse,
              add to cart and check out — all inside the conversation. No app, no friction.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="btn">
                Create your store <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/pricing" className="btn-ghost">See pricing</Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-700">
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-600" /> No code</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-600" /> Shopify &amp; WordPress sync</span>
              <span className="inline-flex items-center gap-1.5"><Check className="h-4 w-4 text-brand-600" /> Fully isolated &amp; encrypted</span>
            </div>
          </div>

          {/* Phone / chat mockup */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="absolute -inset-6 -z-0 rounded-[2.5rem] bg-brand-200/40 blur-2xl" />
            <div className="relative z-10 overflow-hidden rounded-[2.25rem] border-8 border-ink-900 bg-[#e9f7ef] shadow-soft">
              <div className="flex items-center gap-3 bg-brand-600 px-4 py-3 text-white">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 font-bold">B</div>
                <div>
                  <p className="text-sm font-semibold leading-tight">Bella&apos;s Boutique</p>
                  <p className="text-xs text-brand-100">online</p>
                </div>
              </div>
              <div className="space-y-3 px-4 py-5 text-sm">
                <Bubble side="in">Hi! 👋 Reply <b>menu</b> to see today&apos;s items.</Bubble>
                <Bubble side="out">menu</Bubble>
                <Bubble side="in">
                  🛍️ Here&apos;s what we have:<br />1. Silk Scarf — $24.00<br />2. Leather Tote — $89.00<br />3. Gold Hoops — $32.00
                </Bubble>
                <Bubble side="out">add 2</Bubble>
                <Bubble side="in">✅ Added <b>Leather Tote</b>. Reply <b>checkout</b> to order.</Bubble>
                <Bubble side="out">checkout</Bubble>
                <Bubble side="in">🎉 Order placed! Total <b>$89.00</b>. We&apos;ll confirm shortly.</Bubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos / trust strip */}
      <section className="border-y border-ink-100 bg-white py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-6 text-sm font-medium text-ink-700/70">
          <span>Works with</span>
          <span className="font-semibold text-ink-800">Shopify</span>
          <span className="font-semibold text-ink-800">WooCommerce</span>
          <span className="font-semibold text-ink-800">WordPress</span>
          <span className="font-semibold text-ink-800">WhatsApp Cloud API</span>
          <span className="font-semibold text-ink-800">Telegram</span>
          <span className="font-semibold text-ink-800">Instagram</span>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
          Everything you need to sell on chat
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-ink-700">
          Onboard in minutes. Stay in control. Scale to millions of vendors.
        </p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <Feature icon={<Plug />} title="Plug in any channel">
            Connect WhatsApp Cloud API, Telegram bots, or Instagram DMs in minutes. One webhook per
            channel, generated for you.
          </Feature>
          <Feature icon={<Store />} title="Import your catalog">
            Sync products from Shopify or WooCommerce/WordPress automatically — or add them by hand.
          </Feature>
          <Feature icon={<MessageCircle />} title="Order inside chat">
            Customers say “menu”, add items, and check out without ever leaving the conversation.
          </Feature>
          <Feature icon={<ShieldCheck />} title="Isolated &amp; encrypted">
            Every vendor is sealed off from every other — enforced in the database. Secrets are
            AES-256-GCM encrypted at rest.
          </Feature>
          <Feature icon={<Zap />} title="Fast &amp; serverless">
            Runs on a global edge network with serverless Postgres built to scale to millions of
            vendors.
          </Feature>
          <Feature icon={<BarChart3 />} title="You stay in control">
            Track orders, channels and customers from a clean dashboard. The platform owner monitors
            everything centrally.
          </Feature>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink-50/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">
            Live in three steps
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <Step n="1" title="Connect your store">Link Shopify or WooCommerce and import your products in one click.</Step>
            <Step n="2" title="Connect a channel">Add WhatsApp, Telegram or Instagram and copy your ready-made webhook URL.</Step>
            <Step n="3" title="Take chat orders">Your customers message “menu” and order in seconds. 🎉</Step>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink-900 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl px-6">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Plug in today. Sell where your customers already are.
          </h2>
          <p className="mt-4 text-ink-100/80">
            Set up your store, connect a channel, and take your first chat order in under 10 minutes.
          </p>
          <Link href="/signup" className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand-500 px-7 py-3 font-semibold text-white hover:bg-brand-400">
            Get started free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-sm text-ink-700/60">
        © {new Date().getFullYear()} ChatCommerce. Built for vendors everywhere.
      </footer>
    </main>
  );
}

function Bubble({ side, children }: { side: 'in' | 'out'; children: React.ReactNode }) {
  return (
    <div className={side === 'out' ? 'flex justify-end' : 'flex justify-start'}>
      <div
        className={`max-w-[80%] rounded-2xl px-3 py-2 leading-snug shadow-sm ${
          side === 'out' ? 'rounded-br-sm bg-brand-500 text-white' : 'rounded-bl-sm bg-white text-ink-800'
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card transition hover:shadow-soft">
      <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-700">{children}</p>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card relative">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-500 text-lg font-bold text-white">
        {n}
      </div>
      <h3 className="mt-4 font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-sm text-ink-700">{children}</p>
    </div>
  );
}
