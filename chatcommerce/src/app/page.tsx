import Link from 'next/link';
import { MessageCircle, Store, ShieldCheck, Zap, Plug, BarChart3 } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 text-lg font-bold text-brand-700">
          <MessageCircle className="h-6 w-6" /> ChatCommerce
        </div>
        <nav className="flex items-center gap-3">
          <Link href="/pricing" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Pricing
          </Link>
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
            Log in
          </Link>
          <Link href="/signup" className="btn text-sm">
            Start free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-10 text-center">
        <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          For vendors on WhatsApp · Telegram · Instagram
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
          Turn your chats into a checkout.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Plug in your WhatsApp, Telegram or Instagram and connect your Shopify or WordPress store.
          Your customers browse and order right inside the chat — no app, no friction. You stay in
          full control, fully isolated, fully encrypted.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/signup" className="btn">
            Create your store
          </Link>
          <Link href="/pricing" className="btn-ghost">
            See pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto grid max-w-6xl gap-5 px-6 pb-20 sm:grid-cols-2 lg:grid-cols-3">
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
        <Feature icon={<ShieldCheck />} title="Isolated & encrypted">
          Every vendor is sealed off from every other — enforced in the database. Secrets are
          AES-256-GCM encrypted at rest.
        </Feature>
        <Feature icon={<Zap />} title="Fast & serverless">
          Runs on Vercel’s edge network with a serverless Postgres built to scale to millions of
          vendors.
        </Feature>
        <Feature icon={<BarChart3 />} title="You stay in control">
          Track orders, channels and customers from a clean dashboard. The platform owner monitors
          everything centrally.
        </Feature>
      </section>

      {/* CTA */}
      <section className="bg-brand-900 py-16 text-center text-white">
        <h2 className="text-3xl font-bold">Plug in today. Sell where your customers already are.</h2>
        <p className="mx-auto mt-3 max-w-xl text-brand-100">
          Set up your store, connect a channel, and take your first chat order in under 10 minutes.
        </p>
        <Link href="/signup" className="mt-7 inline-block rounded-lg bg-white px-6 py-3 font-semibold text-brand-700">
          Get started free
        </Link>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} ChatCommerce. Built for vendors everywhere.
      </footer>
    </main>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
        {icon}
      </div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{children}</p>
    </div>
  );
}
