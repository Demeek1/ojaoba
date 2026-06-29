'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShoppingCart, CheckCircle, MapPin, Phone, User, Mail, Bike } from 'lucide-react';
import { loadCart, saveCart, clearCart, CartItem } from '@/lib/cart';
import { fmt } from '@/lib/api';
import { track } from '@/lib/track';

const PURPLE_NIGHT = '#170528';
const GOLD = '#F59E0B';
const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const PROFILE_KEY = 'oja_assistant_customer';

declare global { interface Window { PaystackPop: any } }

function isValidNGPhone(raw: string) {
  const d = raw.replace(/[\s\-()+]/g, '');
  return /^(234|0)(7|8|9)\d{9}$/.test(d) || /^\+234(7|8|9)\d{9}$/.test(raw.trim());
}
function isValidEmail(e: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim()); }

interface Saved { name: string; phone: string; email: string; address: string; }
function loadSaved(): Saved {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) || '') || { name: '', phone: '', email: '', address: '' }; }
  catch { return { name: '', phone: '', email: '', address: '' }; }
}

function Field({ label, value, onChange, type = 'text', placeholder, icon: Icon, error }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder: string; icon: any; error?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{label}</label>
      <div className="relative">
        <Icon size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" color={error ? '#F87171' : 'rgba(255,255,255,0.3)'} />
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full py-3.5 pl-10 pr-3.5 rounded-xl text-sm text-white outline-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: `1.5px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.13)'}` }} />
      </div>
      {error && <p className="text-[11px] mt-1.5" style={{ color: '#F87171' }}>⚠ {error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const c = loadCart();
    setCart(c);
    if (!c.length) { router.push('/'); return; }
    track('checkout_start', { valueKobo: c.reduce((s, i) => s + i.price_kobo * i.qty, 0), metadata: { items: c.length } });
    const s = loadSaved();
    if (s.name) { setName(s.name); setPhone(s.phone); setEmail(s.email); setAddress(s.address); }
    if (!document.getElementById('paystack-js')) {
      const el = document.createElement('script');
      el.id = 'paystack-js'; el.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(el);
    }
  }, [router]);

  const subtotal = cart.reduce((s, c) => s + c.price_kobo * c.qty, 0);
  const itemCount = cart.reduce((s, c) => s + c.qty, 0);

  function setQty(id: string, delta: number) {
    setCart((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, qty: c.qty + delta } : c)).filter((c) => c.qty > 0);
      saveCart(next);
      window.dispatchEvent(new Event('oja-cart-changed'));
      if (!next.length) router.push('/');
      return next;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Full name is required';
    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (!isValidNGPhone(phone)) e.phone = 'Enter a valid Nigerian number (e.g. 08012345678)';
    if (!email.trim()) e.email = 'Email is required';
    else if (!isValidEmail(email)) e.email = 'Enter a valid email address';
    if (!address.trim()) e.address = 'Delivery address is required';
    else if (address.trim().length < 15) e.address = 'Please enter your full street address';
    return e;
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (!window.PaystackPop) { alert('Payment is still loading — try again in a second.'); return; }
    if (!PAYSTACK_KEY) { alert('Payment is not configured yet. Please contact support.'); return; }

    setLoading(true);
    const profile: Saved = { name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() };
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profile)); } catch {}
    fetch(`${API_URL}/whatsapp/profile`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) }).catch(() => {});

    const items = cart.map((c) => ({ title: c.title, quantity: c.qty, priceKobo: c.price_kobo, imageUrl: c.image_url, note: c.note || '', shopifyId: c.shopify_id || null, variantId: c.variant_id || null }));
    let orderId = '', psRef = '';
    try {
      const res = await fetch(`${API_URL}/whatsapp/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim(),
          items, subtotal_kobo: subtotal, delivery_fee_kobo: 0, total_kobo: subtotal, notes: note.trim() || null, source: 'assistant' }),
      });
      if (!res.ok) throw new Error('order');
      const json = await res.json();
      orderId = json.orderId; psRef = json.ref;
    } catch { psRef = `OJA-${Date.now()}`; }

    try {
      window.PaystackPop.setup({
        key: PAYSTACK_KEY, email: email.trim(), amount: subtotal, currency: 'NGN', ref: psRef,
        metadata: { custom_fields: [
          { display_name: 'Name', variable_name: 'name', value: name.trim() },
          { display_name: 'Phone', variable_name: 'phone', value: phone.trim() },
          { display_name: 'Address', variable_name: 'address', value: address.trim() },
          { display_name: 'Order ID', variable_name: 'orderId', value: orderId },
        ] },
        callback() {
          fetch(`${API_URL}/whatsapp/orders/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ref: psRef }) }).catch(() => {});
          track('purchase', { valueKobo: subtotal, metadata: { items: cart.length, ref: psRef } });
          clearCart();
          window.dispatchEvent(new Event('oja-cart-changed'));
          setSuccess(true); setLoading(false);
        },
        onClose() { setLoading(false); },
      }).openIframe();
    } catch (err: any) {
      alert(`Payment error: ${err?.message || String(err)}`);
      setLoading(false);
    }
  }

  if (success) return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 text-center" style={{ background: PURPLE_NIGHT }}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center mb-5" style={{ background: 'rgba(34,197,94,0.15)', border: '2px solid #22C55E' }}>
        <CheckCircle size={40} color="#22C55E" />
      </div>
      <h1 className="text-white font-black text-2xl mb-2">Order placed! 🎉</h1>
      <p className="text-white/55 text-sm max-w-xs mb-2">Your order is confirmed and we're getting it ready.</p>
      <p className="text-white/35 text-xs max-w-xs mb-8">Your rider will contact you to arrange delivery and confirm the delivery fee.</p>
      <button onClick={() => router.push('/')} className="px-8 py-3.5 rounded-2xl font-extrabold text-sm" style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#1E0735' }}>
        Back to Adaeze
      </button>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex justify-center" style={{ background: PURPLE_NIGHT }}>
      <div className="w-full max-w-lg pb-12">
        <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3.5" style={{ background: 'rgba(23,5,40,0.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={() => router.push('/')} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <ArrowLeft size={18} color="white" />
          </button>
          <h1 className="text-white font-bold text-base flex-1">Checkout</h1>
          <span className="text-white/45 text-sm flex items-center gap-1.5"><ShoppingCart size={14} /> {itemCount}</span>
        </div>

        <form onSubmit={handlePay} noValidate className="px-4 pt-5">
          {/* Summary */}
          <h2 className="text-white font-bold text-sm mb-3">Your cart</h2>
          <div className="space-y-2 mb-6">
            {cart.map((ci) => (
              <div key={ci.id} className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0" style={{ background: 'rgba(255,255,255,0.07)' }}>
                  {ci.image_url ? <img src={ci.image_url} alt={ci.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-xl">🛒</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-[13px] font-semibold truncate">{ci.title}</p>
                  <p className="text-[12px]" style={{ color: GOLD }}>{fmt(ci.price_kobo * ci.qty)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => setQty(ci.id, -1)} className="w-7 h-7 rounded-lg text-white flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.08)' }}>–</button>
                  <span className="text-white text-sm w-4 text-center">{ci.qty}</span>
                  <button type="button" onClick={() => setQty(ci.id, 1)} className="w-7 h-7 rounded-lg flex items-center justify-center font-bold" style={{ background: 'rgba(245,158,11,0.18)', color: GOLD }}>+</button>
                </div>
              </div>
            ))}
          </div>

          {/* Delivery */}
          <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><MapPin size={16} color={GOLD} /> Delivery details</h2>
          <Field label="Full name" value={name} onChange={setName} placeholder="e.g. Chioma Adeyemi" icon={User} error={errors.name} />
          <Field label="Phone number" value={phone} onChange={setPhone} type="tel" placeholder="e.g. 08012345678" icon={Phone} error={errors.phone} />
          <Field label="Email address" value={email} onChange={setEmail} type="email" placeholder="e.g. chioma@gmail.com" icon={Mail} error={errors.email} />
          <Field label="Delivery address" value={address} onChange={setAddress} placeholder="e.g. 14 Allen Avenue, Ikeja, Lagos" icon={MapPin} error={errors.address} />

          <div className="mb-5">
            <label className="block text-[11px] font-bold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.55)' }}>Notes (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Any instructions? e.g. call before delivery"
              className="w-full p-3 rounded-xl text-sm text-white outline-none resize-none" style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.12)' }} />
          </div>

          {/* Totals */}
          <div className="p-4 rounded-2xl mb-4" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div className="flex justify-between mb-2.5">
              <span className="text-white/55 text-[13px]">Subtotal ({itemCount} items)</span>
              <span className="text-white font-semibold text-[13px]">{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between items-start pb-3 mb-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <span className="text-white/55 text-[13px] flex items-center gap-1.5"><Bike size={14} color={GOLD} /> Delivery</span>
              <span className="text-white/40 text-[12px] text-right max-w-[160px]">Arranged by your rider &amp; billed separately</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-[15px]">Total (items only)</span>
              <span className="font-black text-xl" style={{ color: GOLD }}>{fmt(subtotal)}</span>
            </div>
          </div>

          {!PAYSTACK_KEY && (
            <div className="p-3 rounded-xl mb-4" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.25)' }}>
              <p className="text-[12px]" style={{ color: '#FB923C' }}>⚠ Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to enable payments.</p>
            </div>
          )}

          <button type="submit" disabled={loading || !cart.length}
            className="w-full py-4 rounded-2xl font-black text-base disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#1E0735', boxShadow: '0 10px 30px rgba(245,158,11,0.3)' }}>
            {loading ? '⏳ Opening payment…' : `Pay ${fmt(subtotal)} securely`}
          </button>
          <p className="text-center text-white/25 text-[11px] mt-3">🔒 Secured by Paystack · Card, transfer &amp; USSD</p>
        </form>
      </div>
    </div>
  );
}
