'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ShoppingCart, CheckCircle, MapPin,
  Phone, User, Mail, FileText, ChevronDown, ChevronUp,
  Bike, Pencil, Check,
} from 'lucide-react';
import { loadCart, clearCart, CartItem } from '@/lib/cart';
import { fmt } from '@/lib/api';
import { track } from '@/lib/track';

const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const API_URL      = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const PROFILE_KEY  = 'oja_customer_v2';

const CHIPS = ['Chopped','Sliced','Minced','De-boned','Washed','Peeled','Leave whole','No packaging'];

declare global { interface Window { PaystackPop: any } }

/* ── Nigerian phone validator ── */
function isValidNGPhone(raw: string): boolean {
  const d = raw.replace(/[\s\-\(\)\+]/g, '');
  // +234 or 234 prefix + 7/8/9 + 9 more digits  OR  0 + 7/8/9 + 9 more digits
  return /^(234|0)(7|8|9)\d{9}$/.test(d) || /^\+234(7|8|9)\d{9}$/.test(raw.trim());
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.trim());
}

interface SavedProfile { name: string; phone: string; email: string; address: string; }

function loadSaved(): SavedProfile {
  try {
    const r = localStorage.getItem(PROFILE_KEY);
    return r ? JSON.parse(r) : { name:'', phone:'', email:'', address:'' };
  } catch { return { name:'', phone:'', email:'', address:'' }; }
}
function saveSaved(p: SavedProfile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

/* ── Reusable labelled input ── */
function Field({
  label, value, onChange, type = 'text', placeholder, icon: Icon,
  error, hint, locked,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder: string; icon: any;
  error?: string; hint?: string; locked?: boolean;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display:'block', color:'rgba(255,255,255,0.55)', fontSize:11, fontWeight:700, marginBottom:6, textTransform:'uppercase', letterSpacing:.7 }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:1 }}>
          <Icon size={16} color={error ? '#F87171' : 'rgba(255,255,255,0.3)'} />
        </div>
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          readOnly={locked}
          autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'on'}
          style={{
            width:'100%', padding:'14px 14px 14px 40px', borderRadius:13,
            background: locked ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
            border:`1.5px solid ${error ? '#EF4444' : locked ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.13)'}`,
            color: locked ? 'rgba(255,255,255,0.6)' : 'white',
            fontSize:14, outline:'none', cursor: locked ? 'default' : 'text',
          }}
        />
      </div>
      {error && <p style={{ color:'#F87171', fontSize:11, marginTop:5, display:'flex', alignItems:'center', gap:4 }}>⚠ {error}</p>}
      {hint  && !error && <p style={{ color:'rgba(255,255,255,0.28)', fontSize:11, marginTop:5 }}>{hint}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();

  const [cart, setCart]           = useState<CartItem[]>([]);
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [errors, setErrors]       = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [editing, setEditing]     = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  /* controlled form values */
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [email,   setEmail]   = useState('');
  const [address, setAddress] = useState('');
  const [note,    setNote]    = useState('');

  /* load saved profile + cart on mount */
  useEffect(() => {
    const c = loadCart();
    setCart(c);
    if (c.length === 0) router.push('/');
    else track('checkout_start', { valueKobo: c.reduce((s, i) => s + i.price_kobo * i.qty, 0), metadata: { items: c.length } });

    const saved = loadSaved();
    if (saved.name) {
      setHasProfile(true);
      setName(saved.name);
      setPhone(saved.phone);
      setEmail(saved.email);
      setAddress(saved.address);
    }

    // Load Paystack script
    if (!document.getElementById('paystack-js')) {
      const s = document.createElement('script');
      s.id = 'paystack-js';
      s.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(s);
    }
  }, [router]);

  /* auto-lock fields when profile is pre-filled and user hasn't clicked Edit */
  const fieldsLocked = hasProfile && !editing;

  const subtotal  = cart.reduce((s, c) => s + c.price_kobo * c.qty, 0);
  const itemCount = cart.reduce((s, c) => s + c.qty, 0);

  function appendChip(id: string, chip: string) {
    setItemNotes(n => {
      const cur = n[id] || '';
      return { ...n, [id]: cur ? `${cur}, ${chip}` : chip };
    });
  }

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (!name.trim())  errs.name = 'Full name is required';
    if (!phone.trim()) errs.phone = 'Phone number is required';
    else if (!isValidNGPhone(phone)) errs.phone = 'Enter a valid Nigerian number (e.g. 08012345678)';
    if (!email.trim()) errs.email = 'Email address is required';
    else if (!isValidEmail(email)) errs.email = 'Enter a valid email address';
    if (!address.trim()) errs.address = 'Delivery address is required';
    else if (address.trim().length < 20) errs.address = 'Please enter your full street address';
    return errs;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length) return;

    if (!window.PaystackPop) { alert('Payment is still loading — wait a second and try again.'); return; }
    if (!PAYSTACK_KEY)        { alert('Payment is not configured. Please contact support.');     return; }

    setLoading(true);

    // Save profile to localStorage immediately
    const profile: SavedProfile = { name: name.trim(), phone: phone.trim(), email: email.trim(), address: address.trim() };
    saveSaved(profile);

    // Save profile to backend (fire & forget)
    fetch(`${API_URL}/whatsapp/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    }).catch(() => {});

    // Build items
    const items = cart.map(c => ({
      title:     c.title,
      quantity:  c.qty,
      priceKobo: c.price_kobo,
      imageUrl:  c.image_url,
      note:      itemNotes[c.id] || '',
      shopifyId: c.shopify_id || null,
      variantId: c.variant_id || null,
    }));

    // Create pending order
    let orderId = '';
    let psRef   = '';
    try {
      const res = await fetch(`${API_URL}/whatsapp/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), phone: phone.trim(),
          email: email.trim(), address: address.trim(),
          items,
          subtotal_kobo:     subtotal,
          delivery_fee_kobo: 0,
          total_kobo:        subtotal,
          notes: note.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to create order');
      const json = await res.json();
      orderId = json.orderId;
      psRef   = json.ref;
    } catch {
      psRef = `OJA-${Date.now()}`;
    }

    // Open Paystack
    try {
      window.PaystackPop.setup({
        key:      PAYSTACK_KEY,
        email:    email.trim(),
        amount:   subtotal,
        currency: 'NGN',
        ref:      psRef,
        metadata: {
          custom_fields: [
            { display_name:'Name',     variable_name:'name',    value: name.trim() },
            { display_name:'Phone',    variable_name:'phone',   value: phone.trim() },
            { display_name:'Address',  variable_name:'address', value: address.trim() },
            { display_name:'Order ID', variable_name:'orderId', value: orderId },
          ],
        },
        callback: function() {
          fetch(`${API_URL}/whatsapp/orders/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ref: psRef }),
          }).catch(() => {});
          track('purchase', { valueKobo: subtotal, metadata: { items: cart.length, ref: psRef } });
          clearCart();
          setSuccess(true);
          setLoading(false);
        },
        onClose() { setLoading(false); },
      }).openIframe();
    } catch (err: any) {
      alert(`Payment error: ${err?.message || String(err)}`);
      setLoading(false);
    }
  }

  /* ── Success screen ── */
  if (success) return (
    <div style={{ minHeight:'100dvh', background:'#0D001A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(22,163,74,0.15)', border:'2px solid #16A34A', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <CheckCircle size={40} color="#16A34A" />
      </div>
      <h1 style={{ color:'white', fontWeight:900, fontSize:24, margin:'0 0 8px', textAlign:'center' }}>Order Placed! 🎉</h1>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, textAlign:'center', marginBottom:8, lineHeight:1.6 }}>
        Your order is confirmed and we're getting it ready.
      </p>
      <p style={{ color:'rgba(255,255,255,0.35)', fontSize:13, textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
        Your rider will contact you directly to arrange delivery and confirm the delivery fee.
      </p>
      <Link href="/" style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#000', fontWeight:800, padding:'14px 32px', borderRadius:16, textDecoration:'none', fontSize:15 }}>
        Continue Shopping
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(180deg,#0D001A 0%,#1A0033 100%)', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, paddingBottom:48 }}>

        {/* Header */}
        <div style={{ position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'rgba(13,0,26,0.96)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <button type="button" onClick={()=>router.back()} style={{ width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.08)',border:'none',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <ArrowLeft size={18} color="white" />
          </button>
          <h1 style={{ color:'white', fontWeight:800, fontSize:17, margin:0, flex:1 }}>Checkout</h1>
          <span style={{ color:'rgba(255,255,255,0.4)', fontSize:13, display:'flex', alignItems:'center', gap:5 }}>
            <ShoppingCart size={14} /> {itemCount} item{itemCount!==1?'s':''}
          </span>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ padding:'20px 16px 0' }}>

          {/* ORDER SUMMARY */}
          <section style={{ marginBottom:24 }}>
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 12px' }}>Order Summary</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cart.map(ci => (
                <div key={ci.id} style={{ borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px' }}>
                    <div style={{ width:46,height:46,borderRadius:10,overflow:'hidden',flexShrink:0,background:'rgba(255,255,255,0.07)' }}>
                      {ci.image_url
                        ? <img src={ci.image_url} alt={ci.title} style={{ width:'100%',height:'100%',objectFit:'cover' }} />
                        : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🛒</div>}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ color:'white',fontSize:13,fontWeight:600,margin:0,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{ci.title}</p>
                      <p style={{ color:'#F59E0B',fontSize:12,margin:'2px 0 0' }}>x{ci.qty} · {fmt(ci.price_kobo*ci.qty)}</p>
                      {itemNotes[ci.id] && <p style={{ color:'rgba(245,158,11,0.6)',fontSize:11,margin:'2px 0 0',fontStyle:'italic' }}>"{itemNotes[ci.id]}"</p>}
                    </div>
                    <button type="button" onClick={()=>setExpanded(expanded===ci.id?null:ci.id)}
                      style={{ padding:'4px 8px',borderRadius:8,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.5)',fontSize:11,cursor:'pointer',display:'flex',alignItems:'center',gap:3,flexShrink:0 }}>
                      Note {expanded===ci.id?<ChevronUp size={12}/>:<ChevronDown size={12}/>}
                    </button>
                  </div>
                  {expanded===ci.id && (
                    <div style={{ padding:'0 12px 12px',borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                      <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,margin:'8px 0 6px' }}>How should we prepare this item?</p>
                      <div style={{ display:'flex',flexWrap:'wrap',gap:6,marginBottom:8 }}>
                        {CHIPS.map(chip => (
                          <button key={chip} type="button" onClick={()=>appendChip(ci.id,chip)}
                            style={{ padding:'4px 10px',borderRadius:20,fontSize:11,fontWeight:500,cursor:'pointer',background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.25)',color:'#F59E0B' }}>
                            {chip}
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        value={itemNotes[ci.id]||''}
                        onChange={e=>setItemNotes(n=>({...n,[ci.id]:e.target.value}))}
                        placeholder='e.g. "Chopped into small pieces"'
                        style={{ width:'100%',padding:'10px 12px',borderRadius:10,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white',fontSize:13,outline:'none' }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* DELIVERY DETAILS */}
          <section style={{ marginBottom:24 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:0, display:'flex', alignItems:'center', gap:7 }}>
                <MapPin size={16} color="#F59E0B" /> Delivery Details
              </h2>
              {hasProfile && (
                <button type="button" onClick={() => setEditing(e => !e)}
                  style={{ display:'flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer' }}>
                  {editing ? <><Check size={12}/> Done</> : <><Pencil size={12}/> Edit</>}
                </button>
              )}
            </div>

            <Field
              label="Full Name" value={name} onChange={setName}
              placeholder="e.g. Chioma Adeyemi" icon={User}
              error={errors.name} locked={fieldsLocked}
            />
            <Field
              label="Phone Number" value={phone} onChange={setPhone}
              type="tel" placeholder="e.g. 08012345678" icon={Phone}
              error={errors.phone} locked={fieldsLocked}
              hint="Nigerian number only (070 / 080 / 081 / 090 / 091)"
            />
            <Field
              label="Email Address" value={email} onChange={setEmail}
              type="email" placeholder="e.g. chioma@gmail.com" icon={Mail}
              error={errors.email} locked={fieldsLocked}
              hint="Used to send your order confirmation"
            />
            <Field
              label="Delivery Address" value={address} onChange={setAddress}
              placeholder="e.g. 14 Allen Avenue, Ikeja, Lagos" icon={MapPin}
              error={errors.address} locked={fieldsLocked}
              hint="Enter your full street address exactly as it appears on Google Maps"
            />
          </section>

          {/* ADDITIONAL NOTES */}
          <section style={{ marginBottom:24 }}>
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 12px', display:'flex', alignItems:'center', gap:7 }}>
              <FileText size={16} color="#F59E0B" /> Additional Notes
            </h2>
            <textarea
              value={note} onChange={e=>setNote(e.target.value)} rows={3}
              placeholder="Any instructions for the whole order? e.g. call before delivery, leave at gate…"
              style={{ width:'100%',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.12)',color:'white',fontSize:13,outline:'none',resize:'none',lineHeight:1.6 }}
            />
          </section>

          {/* PRICE BREAKDOWN */}
          <div style={{ padding:16,borderRadius:16,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',marginBottom:16 }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:10 }}>
              <span style={{ color:'rgba(255,255,255,0.5)',fontSize:13 }}>Subtotal ({itemCount} items)</span>
              <span style={{ color:'white',fontWeight:600,fontSize:13 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',paddingBottom:12,marginBottom:12,borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:6 }}>
                <Bike size={14} color="#F59E0B" />
                <span style={{ color:'rgba(255,255,255,0.5)',fontSize:13 }}>Delivery fee</span>
              </div>
              <span style={{ color:'rgba(255,255,255,0.4)',fontSize:12,textAlign:'right',maxWidth:160,lineHeight:1.4 }}>
                Arranged by your rider &amp; billed separately
              </span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between' }}>
              <span style={{ color:'white',fontWeight:700,fontSize:15 }}>Total (items only)</span>
              <span style={{ color:'#F59E0B',fontWeight:900,fontSize:20 }}>{fmt(subtotal)}</span>
            </div>
          </div>

          {/* Delivery note pill */}
          <div style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 14px',borderRadius:12,background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',marginBottom:20 }}>
            <Bike size={15} color="#F59E0B" style={{ flexShrink:0 }} />
            <p style={{ color:'rgba(255,255,255,0.5)',fontSize:12,margin:0,lineHeight:1.5 }}>
              <span style={{ color:'#F59E0B',fontWeight:700 }}>Delivery is handled by our dispatch rider.</span>{' '}
              They will reach out to you directly to confirm your delivery fee and arrange pick-up time.
            </p>
          </div>

          {!PAYSTACK_KEY && (
            <div style={{ padding:'10px 14px',borderRadius:10,background:'rgba(251,146,60,0.08)',border:'1px solid rgba(251,146,60,0.25)',marginBottom:14 }}>
              <p style={{ color:'#FB923C',fontSize:12,margin:0 }}>⚠ Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in Vercel env vars to enable payments.</p>
            </div>
          )}

          {/* PAY BUTTON */}
          <button type="submit" disabled={loading||cart.length===0}
            style={{ width:'100%',padding:'17px 0',borderRadius:16,border:'none',cursor:loading?'wait':'pointer',background:loading?'rgba(245,158,11,0.45)':'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:900,fontSize:17,boxShadow:loading?'none':'0 10px 30px rgba(245,158,11,0.35)',transition:'all 0.2s' }}>
            {loading ? '⏳ Opening payment…' : `Pay ${fmt(subtotal)} securely`}
          </button>
          <p style={{ textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:11,marginTop:10 }}>
            🔒 Secured by Paystack · Card, transfer &amp; USSD
          </p>

        </form>
      </div>
    </div>
  );
}
