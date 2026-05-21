'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ShoppingCart, CheckCircle, MapPin, Phone, User, Mail, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { loadCart, saveCart, clearCart, CartItem } from '@/lib/cart';
import { fmt } from '@/lib/api';

const PAYSTACK_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || '';
const DELIVERY_FEE = 150000; // ₦1,500 in kobo — adjust as needed

/* ── Defined OUTSIDE the page so React never remounts it on re-render ── */
function FormInput({
  label, value, onChange, type = 'text', placeholder, icon: Icon, error,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder: string; icon: any; error?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>
        {label}
      </label>
      <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
          <Icon size={16} color="rgba(255,255,255,0.3)" />
        </div>
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={e => onChange(e.target.value)}
          style={{
            width:'100%', padding:'13px 14px 13px 40px', borderRadius:12,
            background:'rgba(255,255,255,0.06)',
            border:`1.5px solid ${error ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
            color:'white', fontSize:14, outline:'none',
          }}
        />
      </div>
      {error && <p style={{ color:'#F87171', fontSize:11, marginTop:4 }}>{error}</p>}
    </div>
  );
}

const NIGERIAN_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT - Abuja','Gombe',
  'Imo','Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos',
  'Nasarawa','Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto',
  'Taraba','Yobe','Zamfara',
];

const NOTE_SUGGESTIONS = ['Chopped','Sliced','Minced','De-boned','Washed','Peeled','Leave whole','No packaging'];

declare global {
  interface Window { PaystackPop: any; }
}

export default function CheckoutPage() {
  const router = useRouter();
  const [cart, setCartState] = useState<CartItem[]>([]);
  const [notes, setNotes]    = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    address: '', city: '', state: 'Lagos',
    generalNote: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const c = loadCart();
    setCartState(c);
    if (c.length === 0) router.push('/');
    // Load Paystack script
    if (!document.getElementById('paystack-script')) {
      const s = document.createElement('script');
      s.id  = 'paystack-script';
      s.src = 'https://js.paystack.co/v1/inline.js';
      document.head.appendChild(s);
    }
  }, [router]);

  const subtotal     = cart.reduce((s, c) => s + c.price_kobo * c.qty, 0);
  const total        = subtotal + DELIVERY_FEE;
  const cartCount    = cart.reduce((s, c) => s + c.qty, 0);

  function field(k: keyof typeof form, v: string) {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!form.name.trim())    e.name    = 'Full name is required';
    if (!form.phone.trim())   e.phone   = 'Phone number is required';
    if (!/^\d{10,14}$/.test(form.phone.replace(/\D/g,''))) e.phone = 'Enter a valid phone number';
    if (!form.address.trim()) e.address = 'Delivery address is required';
    if (!form.city.trim())    e.city    = 'City / LGA is required';
    if (!form.state)          e.state   = 'Select your state';
    if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function buildOrderMeta() {
    const items = cart.map(c => {
      const note = notes[c.id] ? ` [${notes[c.id]}]` : '';
      return `• ${c.title}${note} x${c.qty} — ${fmt(c.price_kobo * c.qty)}`;
    }).join('\n');
    const addr  = `${form.address}, ${form.city}, ${form.state}`;
    const gNote = form.generalNote ? `\nGeneral note: ${form.generalNote}` : '';
    return { items, addr, gNote };
  }

  function handlePayment() {
    if (!validate()) return;
    setLoading(true);

    const { items, addr, gNote } = buildOrderMeta();
    const email = form.email || `${form.phone.replace(/\D/g,'')}@ojaoba.customer`;

    if (!window.PaystackPop) {
      alert('Payment is loading, please try again in a moment.');
      setLoading(false);
      return;
    }

    const handler = window.PaystackPop.setup({
      key:      PAYSTACK_KEY || 'pk_test_placeholder',
      email,
      amount:   total,   // already in kobo
      currency: 'NGN',
      ref:      `OJA-${Date.now()}`,
      metadata: {
        custom_fields: [
          { display_name:'Customer Name',  variable_name:'name',    value: form.name },
          { display_name:'Phone',          variable_name:'phone',   value: form.phone },
          { display_name:'Delivery Address',variable_name:'address',value: addr },
          { display_name:'Items',          variable_name:'items',   value: items },
          { display_name:'Notes',          variable_name:'notes',   value: gNote || 'None' },
        ],
      },
      callback(response: { reference: string }) {
        clearCart();
        setCartState([]);
        setSuccess(true);
        setLoading(false);
      },
      onClose() { setLoading(false); },
    });
    handler.openIframe();
  }

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={{ minHeight:'100dvh', background:'#0D001A', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:24 }}>
        <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(22,163,74,0.15)', border:'2px solid #16A34A', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
          <CheckCircle size={40} color="#16A34A" />
        </div>
        <h1 style={{ color:'white', fontWeight:900, fontSize:24, margin:'0 0 8px', textAlign:'center' }}>Order Placed! 🎉</h1>
        <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, textAlign:'center', marginBottom:32, lineHeight:1.6 }}>
          Your order has been confirmed and we're getting it ready for delivery!
        </p>
        <Link href="/" style={{ background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#000', fontWeight:800, padding:'14px 32px', borderRadius:16, textDecoration:'none', fontSize:15 }}>
          Continue Shopping
        </Link>
      </div>
    );
  }


  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(180deg,#0D001A 0%,#1A0033 100%)', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, padding:'0 0 40px' }}>

        {/* Header */}
        <div style={{ position:'sticky', top:0, zIndex:10, display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'rgba(13,0,26,0.95)', backdropFilter:'blur(12px)', borderBottom:'1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={()=>router.back()} style={{ width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.08)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <ArrowLeft size={18} color="white" />
          </button>
          <h1 style={{ color:'white', fontWeight:800, fontSize:17, margin:0 }}>Checkout</h1>
          <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6, color:'rgba(255,255,255,0.45)', fontSize:13 }}>
            <ShoppingCart size={15} />
            {cartCount} item{cartCount!==1?'s':''}
          </div>
        </div>

        <div style={{ padding:'20px 16px 0' }}>

          {/* ── ORDER SUMMARY ── */}
          <section style={{ marginBottom:24 }}>
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 12px' }}>Order Summary</h2>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {cart.map(ci => {
                const expanded = expandedItem === ci.id;
                return (
                  <div key={ci.id} style={{ borderRadius:14, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', overflow:'hidden' }}>
                    {/* Item row */}
                    <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px' }}>
                      <div style={{ width:46, height:46, borderRadius:10, overflow:'hidden', flexShrink:0, background:'rgba(255,255,255,0.07)' }}>
                        {ci.image_url ? <img src={ci.image_url} alt={ci.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} /> : <div style={{ width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20 }}>🛒</div>}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ color:'white', fontSize:13, fontWeight:600, margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ci.title}</p>
                        <p style={{ color:'#F59E0B', fontSize:12, margin:'2px 0 0' }}>x{ci.qty} · {fmt(ci.price_kobo * ci.qty)}</p>
                        {notes[ci.id] && <p style={{ color:'rgba(245,158,11,0.6)', fontSize:11, margin:'2px 0 0', fontStyle:'italic' }}>"{notes[ci.id]}"</p>}
                      </div>
                      {/* Toggle notes */}
                      <button onClick={()=>setExpandedItem(expanded?null:ci.id)} style={{ flexShrink:0, padding:'4px 8px', borderRadius:8, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.5)', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', gap:3 }}>
                        Note {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                      </button>
                    </div>

                    {/* Expandable notes section */}
                    {expanded && (
                      <div style={{ padding:'0 12px 12px', borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                        <p style={{ color:'rgba(255,255,255,0.45)', fontSize:11, margin:'8px 0 6px' }}>How should we prepare this item?</p>
                        {/* Quick suggestion chips */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:8 }}>
                          {NOTE_SUGGESTIONS.map(s => (
                            <button key={s} onClick={()=>setNotes(n=>({...n,[ci.id]:notes[ci.id]?`${notes[ci.id]}, ${s}`:s}))}
                              style={{ padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:500, cursor:'pointer', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.25)', color:'#F59E0B' }}>
                              {s}
                            </button>
                          ))}
                        </div>
                        <input
                          type="text" placeholder={`e.g. "Chopped into small pieces"`}
                          value={notes[ci.id] || ''}
                          onChange={e => setNotes(n=>({...n,[ci.id]:e.target.value}))}
                          style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', color:'white', fontSize:13, outline:'none' }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── DELIVERY DETAILS ── */}
          <section style={{ marginBottom:24 }}>
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 14px', display:'flex', alignItems:'center', gap:7 }}>
              <MapPin size={16} color="#F59E0B" /> Delivery Details
            </h2>

            <FormInput label="Full Name"         value={form.name}    onChange={v=>field('name',v)}    placeholder="e.g. Chioma Ade"        icon={User}  error={errors.name} />
            <FormInput label="Phone Number"       value={form.phone}   onChange={v=>field('phone',v)}   placeholder="e.g. 08012345678" type="tel"   icon={Phone} error={errors.phone} />
            <FormInput label="Email (optional)"   value={form.email}   onChange={v=>field('email',v)}   placeholder="e.g. you@email.com" type="email" icon={Mail}  error={errors.email} />
            <FormInput label="Delivery Address"   value={form.address} onChange={v=>field('address',v)} placeholder="Street address, house number" icon={MapPin} error={errors.address} />

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:16 }}>
              <div>
                <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>City / LGA</label>
                <input type="text" value={form.city} placeholder="e.g. Surulere" onChange={e=>field('city',e.target.value)}
                  style={{ width:'100%', padding:'13px 12px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:`1.5px solid ${errors.city?'#EF4444':'rgba(255,255,255,0.1)'}`, color:'white', fontSize:14, outline:'none' }} />
                {errors.city && <p style={{ color:'#F87171', fontSize:11, marginTop:4 }}>{errors.city}</p>}
              </div>
              <div>
                <label style={{ display:'block', color:'rgba(255,255,255,0.7)', fontSize:12, fontWeight:600, marginBottom:6, textTransform:'uppercase', letterSpacing:.5 }}>State</label>
                <select value={form.state} onChange={e=>field('state',e.target.value)}
                  style={{ width:'100%', padding:'13px 12px', borderRadius:12, background:'#1A0040', border:`1.5px solid ${errors.state?'#EF4444':'rgba(255,255,255,0.1)'}`, color:'white', fontSize:14, outline:'none' }}>
                  {NIGERIAN_STATES.map(s=><option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </section>

          {/* ── GENERAL NOTES ── */}
          <section style={{ marginBottom:28 }}>
            <h2 style={{ color:'white', fontWeight:700, fontSize:15, margin:'0 0 12px', display:'flex', alignItems:'center', gap:7 }}>
              <FileText size={16} color="#F59E0B" /> Additional Notes
            </h2>
            <textarea
              rows={3} placeholder="Any special instructions for your entire order? e.g. call before delivery, leave at gate, etc."
              value={form.generalNote} onChange={e=>field('generalNote',e.target.value)}
              style={{ width:'100%', padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', color:'white', fontSize:13, outline:'none', resize:'none', lineHeight:1.6 }}
            />
          </section>

          {/* ── PRICE BREAKDOWN ── */}
          <div style={{ padding:16, borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', marginBottom:20 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
              <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>Subtotal ({cartCount} items)</span>
              <span style={{ color:'white', fontWeight:600, fontSize:13 }}>{fmt(subtotal)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', paddingBottom:10, marginBottom:10, borderBottom:'1px solid rgba(255,255,255,0.07)' }}>
              <span style={{ color:'rgba(255,255,255,0.55)', fontSize:13 }}>Delivery fee</span>
              <span style={{ color:'white', fontWeight:600, fontSize:13 }}>{fmt(DELIVERY_FEE)}</span>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <span style={{ color:'white', fontWeight:700, fontSize:15 }}>Total</span>
              <span style={{ color:'#F59E0B', fontWeight:900, fontSize:20 }}>{fmt(total)}</span>
            </div>
          </div>

          {/* ── PAY BUTTON ── */}
          {!PAYSTACK_KEY && (
            <div style={{ padding:'10px 14px', borderRadius:10, background:'rgba(251,146,60,0.1)', border:'1px solid rgba(251,146,60,0.3)', marginBottom:14 }}>
              <p style={{ color:'#FB923C', fontSize:12, margin:0 }}>⚠ Add NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY to .env.local to enable payments.</p>
            </div>
          )}

          <button onClick={handlePayment} disabled={loading||cart.length===0}
            style={{
              width:'100%', padding:'17px 0', borderRadius:16, border:'none', cursor:loading?'wait':'pointer',
              background:loading?'rgba(245,158,11,0.5)':'linear-gradient(135deg,#F59E0B,#D97706)',
              color:'#000', fontWeight:900, fontSize:17,
              boxShadow:loading?'none':'0 10px 30px rgba(245,158,11,0.4)',
              transition:'all 0.2s', opacity:cart.length===0?0.5:1,
            }}>
            {loading ? '⏳ Opening payment...' : `Pay ${fmt(total)} securely`}
          </button>
          <p style={{ textAlign:'center', color:'rgba(255,255,255,0.2)', fontSize:11, marginTop:10 }}>
            🔒 Secured by Paystack · Card, transfer & USSD accepted
          </p>
        </div>
      </div>
    </div>
  );
}
