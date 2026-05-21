'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ShoppingCart, CheckCircle, MapPin,
  Phone, User, Mail, FileText, ChevronDown, ChevronUp,
} from 'lucide-react';
import { loadCart, clearCart, CartItem } from '@/lib/cart';
import { fmt } from '@/lib/api';

const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const DELIVERY_FEE = 150000; // ₦1,500 in kobo

const NG_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
];

const CHIPS = ['Chopped','Sliced','Minced','De-boned','Washed','Peeled','Leave whole','No packaging'];

declare global { interface Window { PaystackPop: any } }

/* ─── Field wrapper — defined OUTSIDE any component ─── */
function Field({
  label, name, type = 'text', placeholder, icon: Icon, error, as,
}: {
  label: string; name: string; type?: string;
  placeholder: string; icon: any; error?: string;
  as?: 'select' | 'input';
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label
        htmlFor={name}
        style={{ display:'block', color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}
      >
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none', zIndex:1 }}>
          <Icon size={16} color="rgba(255,255,255,0.3)" />
        </div>
        {as === 'select' ? (
          <select
            id={name} name={name} defaultValue="Lagos"
            style={{ width:'100%', padding:'13px 14px 13px 40px', borderRadius:12, background:'#1A0040', border:`1.5px solid ${error?'#EF4444':'rgba(255,255,255,0.12)'}`, color:'white', fontSize:14, outline:'none' }}
          >
            {NG_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input
            id={name} name={name} type={type}
            placeholder={placeholder}
            autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'on'}
            style={{ width:'100%', padding:'13px 14px 13px 40px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:`1.5px solid ${error?'#EF4444':'rgba(255,255,255,0.12)'}`, color:'white', fontSize:14, outline:'none' }}
          />
        )}
      </div>
      {error && <p style={{ color:'#F87171', fontSize:11, marginTop:5 }}>{error}</p>}
    </div>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [cart, setCart]             = useState<CartItem[]>([]);
  const [itemNotes, setItemNotes]   = useState<Record<string, string>>({});
  const [expanded, setExpanded]     = useState<string | null>(null);
  const [errors, setErrors]         = useState<Record<string, string>>({});
  const [loading, setLoading]       = useState(false);
  const [success, setSuccess]       = useState(false);

  useEffect(() => {
    const c = loadCart();
    setCart(c);
    if (c.length === 0) router.push('/');
    if (!document.getElementById('paystack-js')) {
      const s = document.createElement('script');
      s.id = 'paystack-js';
      s.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(s);
    }
  }, [router]);

  const subtotal  = cart.reduce((s, c) => s + c.price_kobo * c.qty, 0);
  const total     = subtotal + DELIVERY_FEE;
  const itemCount = cart.reduce((s, c) => s + c.qty, 0);

  function addNote(id: string, text: string) {
    setItemNotes(n => ({ ...n, [id]: text }));
  }
  function appendChip(id: string, chip: string) {
    setItemNotes(n => {
      const cur = n[id] || '';
      return { ...n, [id]: cur ? `${cur}, ${chip}` : chip };
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data    = new FormData(e.currentTarget);
    const name    = (data.get('name') as string || '').trim();
    const phone   = (data.get('phone') as string || '').trim();
    const email   = (data.get('email') as string || '').trim();
    const address = (data.get('address') as string || '').trim();
    const city    = (data.get('city') as string || '').trim();
    const state   = (data.get('state') as string || '').trim();
    const genNote = (data.get('generalNote') as string || '').trim();

    /* Validate */
    const errs: Record<string, string> = {};
    if (!name)    errs.name    = 'Full name is required';
    if (!phone)   errs.phone   = 'Phone number is required';
    if (phone && !/^\d{7,15}$/.test(phone.replace(/[\s\-\+]/g, '')))
                  errs.phone   = 'Enter a valid phone number';
    if (!address) errs.address = 'Delivery address is required';
    if (!city)    errs.city    = 'City / LGA is required';
    if (email && !/\S+@\S+\.\S+/.test(email))
                  errs.email   = 'Enter a valid email address';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    /* Build Paystack metadata */
    const itemLines = cart.map(c => {
      const note = itemNotes[c.id] ? ` [${itemNotes[c.id]}]` : '';
      return `• ${c.title}${note} x${c.qty} — ${fmt(c.price_kobo * c.qty)}`;
    }).join('\n');
    const addrFull = `${address}, ${city}, ${state}`;
    const noteFull = genNote ? `General: ${genNote}` : '';
    const psEmail  = email || `${phone.replace(/\D/g, '')}@ojaoba.customer`;

    if (!window.PaystackPop) {
      alert('Payment is loading — please try again in a moment.');
      return;
    }

    setLoading(true);
    window.PaystackPop.setup({
      key:      PAYSTACK_KEY || 'pk_test_placeholder',
      email:    psEmail,
      amount:   total,
      currency: 'NGN',
      ref:      `OJA-${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name:'Name',    variable_name:'name',    value: name },
          { display_name:'Phone',   variable_name:'phone',   value: phone },
          { display_name:'Address', variable_name:'address', value: addrFull },
          { display_name:'Items',   variable_name:'items',   value: itemLines },
          { display_name:'Notes',   variable_name:'notes',   value: noteFull || 'None' },
        ],
      },
      callback() { clearCart(); setSuccess(true); setLoading(false); },
      onClose()  { setLoading(false); },
    }).openIframe();
  }

  /* ── Success ── */
  if (success) return (
    <div style={{ minHeight:'100dvh', background:'#0D001A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(22,163,74,0.15)', border:'2px solid #16A34A', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
        <CheckCircle size={40} color="#16A34A" />
      </div>
      <h1 style={{ color:'white', fontWeight:900, fontSize:24, margin:'0 0 8px', textAlign:'center' }}>Order Placed! 🎉</h1>
      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
        Your order is confirmed and we're getting it ready for delivery!
      </p>
      <Link href="/" style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#000', fontWeight:800, padding:'14px 32px', borderRadius:16, textDecoration:'none', fontSize:15 }}>
        Continue Shopping
      </Link>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(180deg,#0D001A 0%,#1A0033 100%)', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, paddingBottom:40 }}>

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

        {/* ── The actual form ── */}
        <form ref={formRef} onSubmit={handleSubmit} noValidate style={{ padding:'20px 16px 0' }}>

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
                      {/* This is the ONLY controlled input — just for item notes */}
                      <input
                        type="text"
                        value={itemNotes[ci.id]||''}
                        onChange={e=>addNote(ci.id,e.target.value)}
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
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
              <MapPin size={16} color="#F59E0B" /> Delivery Details
            </h2>
            <Field label="Full Name"        name="name"    placeholder="e.g. Chioma Adeyemi"    icon={User}  error={errors.name} />
            <Field label="Phone Number"     name="phone"   placeholder="e.g. 08012345678" type="tel"   icon={Phone} error={errors.phone} />
            <Field label="Email (optional)" name="email"   placeholder="e.g. you@email.com" type="email" icon={Mail}  error={errors.email} />
            <Field label="Delivery Address" name="address" placeholder="Street address, house number" icon={MapPin} error={errors.address} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:4 }}>
              <div>
                <label htmlFor="city" style={{ display:'block',color:'rgba(255,255,255,0.65)',fontSize:12,fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>City / LGA</label>
                <input id="city" name="city" type="text" placeholder="e.g. Surulere"
                  style={{ width:'100%',padding:'13px 12px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:`1.5px solid ${errors.city?'#EF4444':'rgba(255,255,255,0.12)'}`,color:'white',fontSize:14,outline:'none' }} />
                {errors.city && <p style={{ color:'#F87171',fontSize:11,marginTop:4 }}>{errors.city}</p>}
              </div>
              <div>
                <label htmlFor="state" style={{ display:'block',color:'rgba(255,255,255,0.65)',fontSize:12,fontWeight:600,marginBottom:6,textTransform:'uppercase',letterSpacing:.5 }}>State</label>
                <select id="state" name="state" defaultValue="Lagos"
                  style={{ width:'100%',padding:'13px 12px',borderRadius:12,background:'#1A0040',border:'1.5px solid rgba(255,255,255,0.12)',color:'white',fontSize:14,outline:'none' }}>
                  {NG_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* GENERAL NOTES */}
          <section style={{ marginBottom:28 }}>
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 12px', display:'flex', alignItems:'center', gap:7 }}>
              <FileText size={16} color="#F59E0B" /> Additional Notes
            </h2>
            <textarea
              name="generalNote" rows={3}
              placeholder="Any instructions for the whole order? e.g. call before delivery, leave at gate…"
              style={{ width:'100%',padding:'12px 14px',borderRadius:12,background:'rgba(255,255,255,0.06)',border:'1.5px solid rgba(255,255,255,0.12)',color:'white',fontSize:13,outline:'none',resize:'none',lineHeight:1.6 }}
            />
          </section>

          {/* PRICE BREAKDOWN */}
          <div style={{ padding:16,borderRadius:16,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',marginBottom:20 }}>
            <div style={{ display:'flex',justifyContent:'space-between',marginBottom:8 }}>
              <span style={{ color:'rgba(255,255,255,0.5)',fontSize:13 }}>Subtotal ({itemCount} items)</span>
              <span style={{ color:'white',fontWeight:600,fontSize:13 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',paddingBottom:10,marginBottom:10,borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ color:'rgba(255,255,255,0.5)',fontSize:13 }}>Delivery fee</span>
              <span style={{ color:'white',fontWeight:600,fontSize:13 }}>{fmt(DELIVERY_FEE)}</span>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between' }}>
              <span style={{ color:'white',fontWeight:700,fontSize:15 }}>Total</span>
              <span style={{ color:'#F59E0B',fontWeight:900,fontSize:20 }}>{fmt(total)}</span>
            </div>
          </div>

          {!PAYSTACK_KEY && (
            <div style={{ padding:'10px 14px',borderRadius:10,background:'rgba(251,146,60,0.08)',border:'1px solid rgba(251,146,60,0.25)',marginBottom:14 }}>
              <p style={{ color:'#FB923C',fontSize:12,margin:0 }}>⚠ Set NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY in Vercel env vars to enable payments.</p>
            </div>
          )}

          {/* PAY BUTTON */}
          <button type="submit" disabled={loading||cart.length===0}
            style={{ width:'100%',padding:'17px 0',borderRadius:16,border:'none',cursor:loading?'wait':'pointer',background:loading?'rgba(245,158,11,0.45)':'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:900,fontSize:17,boxShadow:loading?'none':'0 10px 30px rgba(245,158,11,0.35)',transition:'all 0.2s' }}>
            {loading ? '⏳ Opening payment…' : `Pay ${fmt(total)} securely`}
          </button>
          <p style={{ textAlign:'center',color:'rgba(255,255,255,0.2)',fontSize:11,marginTop:10 }}>
            🔒 Secured by Paystack · Card, transfer & USSD
          </p>
        </form>
      </div>
    </div>
  );
}
