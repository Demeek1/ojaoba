'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/client';
import Logo from '../Logo';
import { Check, ArrowRight, Store, Plug, Sparkles, PartyPopper, ExternalLink } from 'lucide-react';

type State = { profile?: any; completed?: boolean };

export default function Onboarding() {
  const router = useRouter();
  const [state, setState] = useState<State>({});
  const [counts, setCounts] = useState({ products: 0, channels: 0 });
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(0);
  const [profile, setProfile] = useState({ industry: 'Fashion', country: 'Nigeria', currency: 'NGN', voice: 'Warm' });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await api<{ state: State; counts: any }>('/api/vendor/onboarding');
    setState(r.state || {});
    setCounts(r.counts);
    if (r.state?.profile) setProfile((p) => ({ ...p, ...r.state.profile }));
    setLoaded(true);
  }
  useEffect(() => { load().catch(() => setLoaded(true)); }, []);

  const steps = [
    { done: !!state.profile, title: 'Business basics', icon: <Sparkles className="h-4 w-4" /> },
    { done: counts.products > 0, title: 'Add products', icon: <Store className="h-4 w-4" /> },
    { done: counts.channels > 0, title: 'Connect a channel', icon: <Plug className="h-4 w-4" /> },
    { done: !!state.completed, title: 'Go live', icon: <PartyPopper className="h-4 w-4" /> },
  ];
  const completed = steps.filter((s) => s.done).length;
  const pct = Math.round((completed / steps.length) * 100);

  async function saveProfile() {
    setSaving(true);
    try {
      await api('/api/vendor/onboarding', { method: 'PATCH', body: { patch: { profile } } });
      setState((s) => ({ ...s, profile }));
      setOpen(1);
    } finally { setSaving(false); }
  }

  async function goLive() {
    setSaving(true);
    try {
      await api('/api/vendor/onboarding', { method: 'PATCH', body: { patch: { completed: true } } });
      router.push('/dashboard?welcome=1');
    } finally { setSaving(false); }
  }

  if (!loaded) return <main className="min-h-screen bg-forest-900 p-10 text-white/50">Loading…</main>;

  return (
    <main className="min-h-screen bg-forest-900 text-white">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-5 py-5">
        <Logo tone="dark" href="/dashboard" />
        <Link href="/dashboard" className="text-sm font-semibold text-white/60 hover:text-white">Skip for now</Link>
      </header>

      <div className="mx-auto max-w-3xl px-5 pb-16">
        <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">Let’s set up your store</h1>
        <p className="mt-2 text-white/60">A few quick steps and you’ll be taking orders on chat.</p>

        {/* Progress */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
            <div className="grad-lime h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
          <span className="font-display text-sm font-bold text-brand-400">{pct}%</span>
        </div>

        <div className="mt-8 space-y-3">
          {/* Step 0: business basics */}
          <StepShell i={0} steps={steps} open={open} setOpen={setOpen}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Industry" value={profile.industry} onChange={(v) => setProfile({ ...profile, industry: v })}
                options={['Fashion', 'Food & Restaurant', 'Beauty & Cosmetics', 'Electronics', 'Services', 'Other']} />
              <Field label="Country" value={profile.country} onChange={(v) => setProfile({ ...profile, country: v })}
                options={['Nigeria', 'Ghana', 'Kenya', 'South Africa', 'Other']} />
              <Field label="Currency" value={profile.currency} onChange={(v) => setProfile({ ...profile, currency: v })}
                options={['NGN', 'USD', 'GHS', 'KES', 'ZAR']} />
              <Field label="Brand voice" value={profile.voice} onChange={(v) => setProfile({ ...profile, voice: v })}
                options={['Warm', 'Professional', 'Playful', 'Luxury']} />
            </div>
            <button className="btn mt-5" onClick={saveProfile} disabled={saving}>{saving ? 'Saving…' : 'Save & continue'} <ArrowRight className="h-4 w-4" /></button>
          </StepShell>

          {/* Step 1: products */}
          <StepShell i={1} steps={steps} open={open} setOpen={setOpen}>
            <p className="text-sm text-white/70">Add products manually, or import from Shopify / WooCommerce / CSV. You have <b className="text-white">{counts.products}</b> so far.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard/products" className="btn-grass">Add products <ExternalLink className="h-4 w-4" /></Link>
              <Link href="/dashboard/stores" className="btn-ghost">Import from a store</Link>
            </div>
            <button className="mt-4 text-sm font-semibold text-brand-400" onClick={() => { load(); setOpen(2); }}>I’ve added products — refresh →</button>
          </StepShell>

          {/* Step 2: channel */}
          <StepShell i={2} steps={steps} open={open} setOpen={setOpen}>
            <p className="text-sm text-white/70">Connect WhatsApp (or Telegram) so customers can chat and order. You have <b className="text-white">{counts.channels}</b> connected.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/dashboard/channels" className="btn-grass">Connect a channel <ExternalLink className="h-4 w-4" /></Link>
            </div>
            <button className="mt-4 text-sm font-semibold text-brand-400" onClick={() => { load(); setOpen(3); }}>I’ve connected one — refresh →</button>
          </StepShell>

          {/* Step 3: go live */}
          <StepShell i={3} steps={steps} open={open} setOpen={setOpen}>
            <p className="text-sm text-white/70">
              {completed >= 3 ? 'Everything’s ready — publish your store and start taking orders! 🎉' : 'Finish the steps above, then come back to go live.'}
            </p>
            <button className="btn mt-5" onClick={goLive} disabled={saving || completed < 3}>
              {saving ? 'Publishing…' : 'Go live'} <PartyPopper className="h-4 w-4" />
            </button>
          </StepShell>
        </div>
      </div>
    </main>
  );
}

function StepShell({ i, steps, open, setOpen, children }: any) {
  const s = steps[i];
  const isOpen = open === i;
  return (
    <div className={`rounded-3xl border p-5 transition ${isOpen ? 'border-brand-500/40 bg-white/5' : 'border-white/10 bg-white/[0.03]'}`}>
      <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(isOpen ? -1 : i)}>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.done ? 'bg-brand-500 text-forest-900' : 'border border-white/25 text-white/60'}`}>
          {s.done ? <Check className="h-4 w-4" /> : s.icon}
        </span>
        <span className="flex-1 font-display font-extrabold">{s.title}</span>
        <span className="text-xs font-semibold text-white/40">Step {i + 1}</span>
      </button>
      {isOpen && <div className="mt-4 pl-11">{children}</div>}
    </div>
  );
}

function Field({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-white/70">{label}</label>
      <select className="w-full rounded-xl border border-white/15 bg-forest-800 px-3 py-2.5 text-white outline-none focus:border-brand-400" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}
