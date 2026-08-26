import Link from 'next/link';
import Logo from './Logo';
import {
  MessageCircle, Store, ShieldCheck, Zap, Plug, BarChart3, ArrowRight, Play, Menu, Check, X,
  BadgeCheck, Clock, Lock, Sparkles, Star, Quote,
} from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-forest-900 text-white">
      {/* Announcement bar */}
      <div className="bg-brand-500 px-4 py-2 text-center text-sm font-semibold text-forest-900">
        🚀 No waitlist — go live in minutes. Plans from ₦7,500/mo.
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
          <Sparkles className="h-4 w-4 text-brand-400" /> WhatsApp · Telegram · Instagram commerce
        </span>
        <h1 className="animate-fade-up d1 mt-5 max-w-4xl font-display text-5xl font-extrabold leading-[0.98] tracking-tight sm:text-7xl">
          Turn every chat into a <span className="grad-text">checkout.</span>
        </h1>
        <p className="animate-fade-up d2 mt-6 max-w-2xl text-lg leading-relaxed text-white/75 sm:text-xl">
          ChatCommerce turns your WhatsApp, Telegram or Instagram into a full storefront — customers
          browse your catalog, add to cart and check out inside the conversation. Connect your Shopify
          or WordPress shop, or add products by hand. Live in minutes, no waitlist.
        </p>
        <div className="animate-fade-up d3 mt-8 flex flex-wrap items-center gap-4">
          <Link href="/signup" className="btn text-base">Start free <ArrowRight className="h-4 w-4" /></Link>
          <a href="#pricing" className="btn-ghost text-base">See pricing</a>
        </div>
        <div className="animate-fade-up d4 mt-7 flex items-center gap-3">
          <div className="flex -space-x-3">
            {['#f9a8d4', '#fcd34d', '#93c5fd', '#86efac'].map((c, i) => (
              <span key={i} className="h-9 w-9 rounded-full border-2 border-forest-900" style={{ background: c }} />
            ))}
          </div>
          <span className="text-sm font-medium text-white/80">Join 500+ vendors selling on chat</span>
        </div>

        {/* Showcase: gradient panel + phone chat */}
        <div className="mt-12 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="relative overflow-hidden rounded-4xl ring-glow">
            <div className="grad-lime aspect-[4/3] w-full" />
            <div className="animate-floaty absolute left-5 top-5 rounded-2xl bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-forest-900/60">Total sales</span>
                <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">+29.4%</span>
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

      {/* Stat band */}
      <section className="grad-lime py-16 text-center text-forest-900">
        <p className="font-display text-6xl font-extrabold sm:text-7xl">$5.1B</p>
        <p className="mt-3 font-display text-lg font-semibold text-forest-900/70">Africa social-commerce market — sell your slice of it</p>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="max-w-2xl font-display text-4xl font-extrabold leading-tight sm:text-5xl">Everything you need to sell on chat</h2>
        <p className="mt-3 max-w-xl text-white/60">Onboard in minutes. Stay in control. Built to scale to millions of vendors.</p>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard icon={<Plug />} title="Plug in any channel">Connect WhatsApp, Telegram or Instagram in minutes — a ready-made webhook per channel.</FeatureCard>
          <FeatureCard icon={<Store />} title="Import your catalog">Sync products from Shopify or WooCommerce automatically, or add them by hand.</FeatureCard>
          <FeatureCard icon={<MessageCircle />} title="Order inside chat">Customers say “menu”, add items and check out without leaving the conversation.</FeatureCard>
          <FeatureCard icon={<Sparkles />} title="AI concierge">Optional AI understands natural language (“I’ll take two totes”) — with your prices always in control.</FeatureCard>
          <FeatureCard icon={<ShieldCheck />} title="Isolated & encrypted">Every vendor sealed off in the database. Secrets encrypted with AES-256.</FeatureCard>
          <FeatureCard icon={<BarChart3 />} title="One clean dashboard">Track orders, channels and customers. Owner console monitors the whole platform.</FeatureCard>
        </div>
      </section>

      {/* Why us / comparison */}
      <section id="why" className="surface-light py-20">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-center font-display text-4xl font-extrabold tracking-tight text-forest-900 sm:text-5xl">More than an AI chat agent</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-forest-900/60">
            Chatbots answer questions. ChatCommerce runs the whole sale — catalog, cart, checkout, orders —
            and you’re live today, not after a waitlist.
          </p>
          <div className="mt-12 overflow-hidden rounded-3xl border border-forest-900/10 bg-white shadow-card">
            <div className="grid grid-cols-3 bg-forest-900 text-sm font-semibold text-white">
              <div className="px-5 py-4"> </div>
              <div className="px-5 py-4 text-center text-white/60">Typical AI chat agent</div>
              <div className="px-5 py-4 text-center font-display text-base font-extrabold text-brand-400">ChatCommerce</div>
            </div>
            {[
              ['Go live', 'Apply, wait for a pilot batch', 'Self-serve in minutes'],
              ['What it does', 'Answers messages', 'Full store: cart, checkout, orders'],
              ['Channels', 'WhatsApp only', 'WhatsApp + Telegram + Instagram'],
              ['Store sync', '—', 'Shopify + WooCommerce import'],
              ['Storefront page', '—', 'Every vendor gets one'],
              ['Entry price', 'from ₦30,000/mo', 'from ₦7,500/mo'],
            ].map((row, i) => (
              <div key={i} className={`grid grid-cols-3 items-center text-sm ${i % 2 ? 'bg-cream/50' : 'bg-white'}`}>
                <div className="px-5 py-4 font-semibold text-forest-900">{row[0]}</div>
                <div className="flex items-center justify-center gap-2 px-5 py-4 text-forest-900/50"><X className="h-4 w-4 text-red-400" />{row[1]}</div>
                <div className="flex items-center justify-center gap-2 px-5 py-4 font-semibold text-forest-900"><Check className="h-4 w-4 text-brand-600" />{row[2]}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Live in three steps</h2>
        <div className="mx-auto mt-12 grid max-w-4xl gap-6 md:grid-cols-3">
          <Step n="01" title="Create your store" icon={<Store />}>Sign up and get your isolated store + storefront link instantly.</Step>
          <Step n="02" title="Connect a channel" icon={<Plug />}>Add WhatsApp, Telegram or Instagram and import your products.</Step>
          <Step n="03" title="Take chat orders" icon={<MessageCircle />}>Customers message “menu” and order in seconds. 🎉</Step>
        </div>
      </section>

      {/* Security */}
      <section className="mx-auto max-w-6xl px-5 pb-4">
        <div className="rounded-4xl border border-white/10 bg-forest-700 p-8 sm:p-12">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-500/15 px-3 py-1 text-sm font-semibold text-brand-300"><Lock className="h-4 w-4" /> Security first</span>
              <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">Your data, sealed and encrypted</h2>
              <p className="mt-3 text-white/70">Built multi-tenant from day one — every vendor is isolated at the database level, so no one can see anyone else’s data. Tokens are encrypted, passwords hashed, traffic on HTTPS, and abuse is rate-limited.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <SecItem icon={<ShieldCheck />} title="Row-level isolation">Enforced in the database</SecItem>
              <SecItem icon={<Lock />} title="AES-256 encryption">Secrets safe at rest</SecItem>
              <SecItem icon={<Clock />} title="Rate limited">Bots &amp; brute-force blocked</SecItem>
              <SecItem icon={<BadgeCheck />} title="HTTPS everywhere">Encrypted in transit</SecItem>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Loved by chat-first sellers</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          <Testimonial name="Amaka O." role="Fashion vendor, Lagos" text="I stopped losing sales to slow replies. Customers just order in WhatsApp now." />
          <Testimonial name="Tunde A." role="Gadget store" text="Set up in one evening. The storefront link alone doubled my DMs into real orders." />
          <Testimonial name="Blessing E." role="Skincare brand" text="The dashboard makes it feel like a real business. Way easier than juggling chats." />
        </div>
      </section>

      {/* Pricing teaser */}
      <section id="pricing" className="surface-light py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center font-display text-4xl font-extrabold tracking-tight text-forest-900 sm:text-5xl">Simple pricing. Start free.</h2>
          <p className="mt-3 text-center text-forest-900/60">14-day free trial. No card. Upgrade when you’re ready to go live.</p>
          <div className="mt-12 grid gap-5 sm:grid-cols-3">
            <PriceCard name="Starter" price="₦7,500" per="/mo" features={['1 channel', '1 store', 'Up to 50 products', 'Chat ordering']} />
            <PriceCard name="Growth" price="₦20,000" per="/mo" highlight features={['WhatsApp + sync', 'Unlimited products', 'Broadcasts', 'Order dashboard']} />
            <PriceCard name="Pro" price="₦50,000" per="/mo" features={['All channels', 'Analytics', 'Priority support', 'AI concierge']} />
          </div>
          <p className="mt-6 text-center"><Link href="/pricing" className="font-display font-bold text-brand-700">See full pricing →</Link></p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-20">
        <h2 className="text-center font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Questions, answered</h2>
        <div className="mt-10 space-y-3">
          <Faq q="Do I need to code?" a="No. Sign up, connect a channel, import or add products — all from the dashboard." />
          <Faq q="Which channels work?" a="WhatsApp, Telegram and Instagram. WhatsApp uses Meta’s official Business API." />
          <Faq q="Is there a waitlist?" a="No. You can create your store and start selling in minutes." />
          <Faq q="How do payments work?" a="Take orders in chat and get paid with Paystack (NGN) or Stripe. Your customers, your money." />
          <Faq q="Is my data safe?" a="Yes. Every vendor is isolated in the database, secrets are encrypted, and all traffic is over HTTPS." />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-5 pb-20">
        <div className="grad-lime rounded-4xl px-6 py-16 text-center text-forest-900">
          <h2 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Start selling on chat today</h2>
          <p className="mx-auto mt-3 max-w-xl text-forest-900/70">Create your store, connect a channel, and take your first order in under 10 minutes.</p>
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
function Testimonial({ name, role, text }: { name: string; role: string; text: string }) {
  return (
    <div className="card-mint text-forest-900">
      <Quote className="h-7 w-7 text-brand-500" />
      <p className="mt-3 text-sm leading-relaxed text-forest-900/80">“{text}”</p>
      <div className="mt-5 flex items-center gap-1 text-brand-500">{[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}</div>
      <p className="mt-3 font-display font-bold text-forest-900">{name}</p>
      <p className="text-xs text-forest-900/50">{role}</p>
    </div>
  );
}
function PriceCard({ name, price, per, features, highlight }: { name: string; price: string; per: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`flex flex-col rounded-3xl p-7 ${highlight ? 'grad-lime text-forest-900 ring-glow' : 'border border-forest-900/10 bg-white text-forest-900'}`}>
      {highlight && <span className="mb-2 inline-block w-fit rounded-full bg-forest-900 px-3 py-0.5 text-xs font-bold text-brand-400">Most popular</span>}
      <h3 className="font-display text-lg font-extrabold">{name}</h3>
      <p className="mt-2 font-display text-3xl font-extrabold">{price}<span className="text-base font-semibold opacity-60">{per}</span></p>
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {features.map((f) => <li key={f} className="flex items-center gap-2"><Check className={`h-4 w-4 ${highlight ? 'text-forest-900' : 'text-brand-600'}`} /> {f}</li>)}
      </ul>
      <Link href="/signup" className={`mt-6 inline-flex items-center justify-center rounded-full px-5 py-2.5 font-display text-sm font-bold ${highlight ? 'bg-forest-900 text-white' : 'btn'}`}>Choose {name}</Link>
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
