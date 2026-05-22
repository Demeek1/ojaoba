'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Phone, ArrowLeft, ChevronDown, ChevronUp, Search, User, ShoppingBag, Star, Mail } from 'lucide-react';
import { fmt } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  paid:              { label: 'Paid',             color: '#3B82F6', emoji: '💳' },
  PAID:              { label: 'Paid',             color: '#3B82F6', emoji: '💳' },
  fulfilled:         { label: 'Delivered',        color: '#10B981', emoji: '✅' },
  DELIVERED:         { label: 'Delivered',        color: '#10B981', emoji: '✅' },
  partial:           { label: 'Processing',       color: '#F59E0B', emoji: '🔄' },
  PROCESSING:        { label: 'Processing',       color: '#F59E0B', emoji: '🔄' },
  CONFIRMED:         { label: 'Confirmed',        color: '#8B5CF6', emoji: '✅' },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery', color: '#F97316', emoji: '🚚' },
  unfulfilled:       { label: 'Pending',          color: '#6B7280', emoji: '⏳' },
  PENDING_PAYMENT:   { label: 'Pending',          color: '#6B7280', emoji: '⏳' },
  CANCELLED:         { label: 'Cancelled',        color: '#EF4444', emoji: '❌' },
  refunded:          { label: 'Refunded',         color: '#6B7280', emoji: '💸' },
  REFUNDED:          { label: 'Refunded',         color: '#6B7280', emoji: '💸' },
};

interface Order {
  id: string; status: string; items: any[];
  subtotal_kobo?: number; delivery_fee_kobo?: number; total_kobo: number;
  delivery_address: string; customer_name?: string; source: string; created_at: string;
  name?: string; // Shopify order name e.g. #1001
}

interface Profile { name: string; email: string | null; shopifyCustomerId: string | null; }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?';
}

export default function TrackPage() {
  const [phone, setPhone]       = useState('');
  const [email, setEmail]       = useState('');
  const [orders, setOrders]     = useState<Order[] | null>(null);
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    const cleanEmail = email.trim();
    if (clean.length < 7 && !cleanEmail.includes('@')) {
      setError('Enter a phone number or email address');
      return;
    }
    setError(''); setLoading(true); setSearched(false);
    try {
      const params = new URLSearchParams();
      if (clean.length >= 7) params.set('phone', clean);
      else params.set('phone', '0000000'); // placeholder so backend doesn't error
      if (cleanEmail.includes('@')) params.set('email', cleanEmail);
      const res  = await fetch(`${API_URL}/whatsapp/orders/track?${params.toString()}`);
      const data = await res.json();
      setOrders(data.orders || []);
      setProfile(data.customer || null);
      setSearched(true);
    } catch {
      setError('Could not load orders. Please check your connection.');
    } finally { setLoading(false); }
  }

  const totalSpent   = (orders || []).reduce((s, o) => s + (o.total_kobo || 0), 0);
  const orderCount   = (orders || []).length;
  const displayName  = profile?.name || (orders?.[0] as any)?.customer_name || '';

  return (
    <div style={{ minHeight:'100dvh', background:'#0D001A', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:430, paddingBottom:48 }}>

        {/* ── HEADER ── */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#2D0A4E', boxShadow:'0 2px 16px rgba(0,0,0,0.5)' }}>
          <Link href="/" style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <ArrowLeft size={17} color="white" />
          </Link>
          <div style={{ flex:1 }}>
            <h1 style={{ color:'white', fontWeight:800, fontSize:16, margin:0 }}>My Profile</h1>
            <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, margin:0 }}>View your orders &amp; history</p>
          </div>
          <div style={{ width:38,height:38,borderRadius:'50%',background:'rgba(245,158,11,0.15)',border:'1.5px solid rgba(245,158,11,0.3)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <User size={18} color="#F59E0B" />
          </div>
        </div>

        <div style={{ padding:'24px 16px 0' }}>

          {/* ── SEARCH FORM ── */}
          {!searched && (
            <div style={{ marginBottom:28 }}>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <div style={{ width:72,height:72,borderRadius:'50%',background:'linear-gradient(135deg,#2D0A4E,#4A1070)',border:'2px solid rgba(245,158,11,0.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px' }}>
                  <User size={32} color="#F59E0B" />
                </div>
                <h2 style={{ color:'white', fontWeight:800, fontSize:20, margin:'0 0 6px' }}>Find your account</h2>
                <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, margin:0, lineHeight:1.5 }}>Enter the phone number you use to order from OjaOba</p>
              </div>

              <form onSubmit={search}>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* Phone field */}
                  <div style={{ position:'relative' }}>
                    <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <Phone size={16} color="rgba(255,255,255,0.3)" />
                    </div>
                    <input
                      type="tel" value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="Phone number e.g. 08012345678"
                      style={{ width:'100%',padding:'14px 14px 14px 40px',borderRadius:14,background:'rgba(255,255,255,0.06)',border:`1.5px solid ${error?'#EF4444':'rgba(255,255,255,0.12)'}`,color:'white',fontSize:15,outline:'none' }}
                    />
                  </div>

                  {/* Divider */}
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
                    <span style={{ color:'rgba(255,255,255,0.25)', fontSize:12, fontWeight:600 }}>OR</span>
                    <div style={{ flex:1, height:1, background:'rgba(255,255,255,0.07)' }} />
                  </div>

                  {/* Email field */}
                  <div style={{ position:'relative' }}>
                    <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                      <Mail size={16} color="rgba(255,255,255,0.3)" />
                    </div>
                    <input
                      type="email" value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="Email used on OjaOba website"
                      style={{ width:'100%',padding:'14px 14px 14px 40px',borderRadius:14,background:'rgba(255,255,255,0.06)',border:`1.5px solid ${error?'#EF4444':'rgba(255,255,255,0.12)'}`,color:'white',fontSize:15,outline:'none' }}
                    />
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={loading} style={{ padding:'14px 20px',borderRadius:14,background:'linear-gradient(135deg,#F59E0B,#D97706)',border:'none',cursor:loading?'wait':'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:8,fontWeight:800,fontSize:15,color:'#000',boxShadow:'0 4px 16px rgba(245,158,11,0.35)' }}>
                    {loading ? 'Searching…' : <><Search size={17} /> Find My Account</>}
                  </button>
                </div>
                {error && <p style={{ color:'#F87171',fontSize:12,marginTop:8 }}>{error}</p>}
              </form>
            </div>
          )}

          {/* ── PROFILE CARD (shown after search) ── */}
          {searched && (
            <>
              {/* Avatar + name */}
              <div style={{ textAlign:'center', marginBottom:24 }}>
                <div style={{ width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#F59E0B,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',boxShadow:'0 0 24px rgba(245,158,11,0.4)' }}>
                  {displayName
                    ? <span style={{ color:'#000',fontWeight:900,fontSize:28 }}>{initials(displayName)}</span>
                    : <User size={36} color="#000" />
                  }
                </div>
                {displayName && <h2 style={{ color:'white',fontWeight:800,fontSize:20,margin:'0 0 4px' }}>{displayName}</h2>}
                {profile?.email && <p style={{ color:'rgba(255,255,255,0.4)',fontSize:13,margin:'0 0 4px' }}>{profile.email}</p>}
                {phone.replace(/\D/g,'').length >= 7 && <p style={{ color:'rgba(255,255,255,0.3)',fontSize:13,margin:0 }}>{phone}</p>}

                {/* Switch account */}
                <button onClick={() => { setSearched(false); setOrders(null); setProfile(null); setPhone(''); setEmail(''); }}
                  style={{ marginTop:10,padding:'5px 14px',borderRadius:20,background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.12)',color:'rgba(255,255,255,0.45)',fontSize:12,cursor:'pointer' }}>
                  Not you? Switch
                </button>
              </div>

              {/* Stats */}
              {orderCount > 0 && (
                <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24 }}>
                  <div style={{ padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',textAlign:'center' }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:4 }}>
                      <ShoppingBag size={14} color="#F59E0B" />
                      <span style={{ color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>Orders</span>
                    </div>
                    <p style={{ color:'white',fontWeight:900,fontSize:26,margin:0 }}>{orderCount}</p>
                  </div>
                  <div style={{ padding:'14px 16px',borderRadius:16,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',textAlign:'center' }}>
                    <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:6,marginBottom:4 }}>
                      <Star size={14} color="#F59E0B" />
                      <span style={{ color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>Spent</span>
                    </div>
                    <p style={{ color:'#F59E0B',fontWeight:900,fontSize:18,margin:0 }}>{fmt(totalSpent)}</p>
                  </div>
                </div>
              )}

              {/* No orders */}
              {orderCount === 0 && (
                <div style={{ textAlign:'center',padding:'36px 0' }}>
                  <span style={{ fontSize:48 }}>📦</span>
                  <p style={{ color:'rgba(255,255,255,0.45)',fontSize:15,marginTop:12 }}>No orders found for this number</p>
                  <p style={{ color:'rgba(255,255,255,0.25)',fontSize:13,marginTop:4 }}>Try the exact number you used when ordering</p>
                </div>
              )}

              {/* Orders list */}
              {orderCount > 0 && (
                <div>
                  <h3 style={{ color:'rgba(255,255,255,0.5)',fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:.8,margin:'0 0 12px' }}>Order History</h3>
                  <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
                    {(orders || []).map(o => {
                      const st     = STATUS_META[o.status] || { label: o.status, color:'#9CA3AF', emoji:'📦' };
                      const isOpen = expanded === o.id;
                      const date   = new Date(o.created_at).toLocaleDateString('en-NG',{ day:'numeric',month:'short',year:'numeric' });
                      const ref    = o.name || `#${o.id.slice(-6).toUpperCase()}`;
                      const src    = o.source === 'shopify' ? '🛍️ Shopify' : o.source === 'website' ? '🌐 Web' : '💬 WhatsApp';

                      return (
                        <div key={o.id} style={{ borderRadius:16,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden' }}>
                          <button onClick={() => setExpanded(isOpen ? null : o.id)}
                            style={{ width:'100%',padding:'14px 16px',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left' }}>
                            <div style={{ width:44,height:44,borderRadius:12,background:`${st.color}18`,border:`1.5px solid ${st.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                              {st.emoji}
                            </div>
                            <div style={{ flex:1,minWidth:0 }}>
                              <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap' }}>
                                <span style={{ color:'white',fontWeight:700,fontSize:14 }}>{ref}</span>
                                <span style={{ padding:'2px 8px',borderRadius:20,background:`${st.color}22`,color:st.color,fontSize:11,fontWeight:600 }}>{st.label}</span>
                              </div>
                              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                                <span style={{ color:'#F59E0B',fontWeight:800,fontSize:15 }}>{fmt(o.total_kobo)}</span>
                                <span style={{ color:'rgba(255,255,255,0.25)',fontSize:11 }}>· {date}</span>
                                <span style={{ color:'rgba(255,255,255,0.2)',fontSize:11 }}>· {src}</span>
                              </div>
                            </div>
                            {isOpen ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                          </button>

                          {isOpen && (
                            <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)',padding:'12px 16px' }}>
                              <p style={{ color:'rgba(255,255,255,0.35)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:.5,margin:'0 0 8px' }}>Items</p>
                              <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:12 }}>
                                {(o.items || []).map((it: any, idx: number) => (
                                  <div key={idx} style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                                    <span style={{ color:'rgba(255,255,255,0.65)',fontSize:13 }}>
                                      {it.title} <span style={{ color:'rgba(255,255,255,0.3)' }}>× {it.quantity || it.qty}</span>
                                    </span>
                                    <span style={{ color:'white',fontSize:13,fontWeight:600 }}>
                                      {fmt((it.priceKobo || it.price_kobo || 0) * (it.quantity || it.qty || 1))}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)',paddingTop:10,display:'flex',justifyContent:'space-between' }}>
                                <span style={{ color:'white',fontWeight:700,fontSize:14 }}>Total</span>
                                <span style={{ color:'#F59E0B',fontWeight:900,fontSize:16 }}>{fmt(o.total_kobo)}</span>
                              </div>
                              {o.delivery_address && (
                                <p style={{ color:'rgba(255,255,255,0.3)',fontSize:12,marginTop:10,paddingTop:10,borderTop:'1px solid rgba(255,255,255,0.05)' }}>
                                  📍 {o.delivery_address}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Shop more CTA */}
              <div style={{ textAlign:'center',marginTop:28 }}>
                <Link href="/" style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'13px 28px',borderRadius:16,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:800,fontSize:15,textDecoration:'none',boxShadow:'0 6px 20px rgba(245,158,11,0.3)' }}>
                  🛒 Shop Again
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`* { box-sizing:border-box; } ::-webkit-scrollbar { display:none; }`}</style>
    </div>
  );
}
