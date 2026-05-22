'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ChevronDown, ChevronUp, User, ShoppingBag,
  Star, Pencil, Check, X, Phone, Mail, MapPin,
} from 'lucide-react';
import { fmt } from '@/lib/api';

const API_URL     = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const PROFILE_KEY = 'oja_customer_v2';

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  paid:             { label: 'Paid',             color: '#3B82F6', emoji: '💳' },
  PAID:             { label: 'Paid',             color: '#3B82F6', emoji: '💳' },
  fulfilled:        { label: 'Delivered',        color: '#10B981', emoji: '✅' },
  DELIVERED:        { label: 'Delivered',        color: '#10B981', emoji: '✅' },
  partial:          { label: 'Processing',       color: '#F59E0B', emoji: '🔄' },
  PROCESSING:       { label: 'Processing',       color: '#F59E0B', emoji: '🔄' },
  CONFIRMED:        { label: 'Confirmed',        color: '#8B5CF6', emoji: '✅' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery', color: '#F97316', emoji: '🚚' },
  unfulfilled:      { label: 'Pending',          color: '#6B7280', emoji: '⏳' },
  PENDING_PAYMENT:  { label: 'Pending',          color: '#6B7280', emoji: '⏳' },
  CANCELLED:        { label: 'Cancelled',        color: '#EF4444', emoji: '❌' },
  refunded:         { label: 'Refunded',         color: '#6B7280', emoji: '💸' },
  REFUNDED:         { label: 'Refunded',         color: '#6B7280', emoji: '💸' },
};

interface Order {
  id: string; status: string; items: any[];
  total_kobo: number; delivery_address: string;
  customer_name?: string; source: string; created_at: string; name?: string;
}

interface Profile { name: string; phone: string; email: string; address: string; }

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

function loadProfile(): Profile | null {
  try {
    const r = localStorage.getItem(PROFILE_KEY);
    if (!r) return null;
    const p = JSON.parse(r);
    return p.name ? p : null;
  } catch { return null; }
}
function saveProfile(p: Profile) {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}

export default function ProfilePage() {
  const [profile, setProfile]   = useState<Profile | null>(null);
  const [orders, setOrders]     = useState<Order[]>([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing]   = useState(false);

  /* edit state */
  const [eName, setEName]       = useState('');
  const [ePhone, setEPhone]     = useState('');
  const [eEmail, setEEmail]     = useState('');
  const [eAddress, setEAddress] = useState('');

  useEffect(() => {
    const p = loadProfile();
    setProfile(p);
    if (p?.phone) {
      const clean = p.phone.replace(/\D/g, '');
      const params = new URLSearchParams({ phone: clean });
      if (p.email) params.set('email', p.email);
      fetch(`${API_URL}/whatsapp/orders/track?${params}`)
        .then(r => r.json())
        .then(d => setOrders(d.orders || []))
        .catch(() => {})
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function startEdit() {
    if (!profile) return;
    setEName(profile.name);
    setEPhone(profile.phone);
    setEEmail(profile.email);
    setEAddress(profile.address);
    setEditing(true);
  }

  function saveEdit() {
    const updated: Profile = {
      name: eName.trim() || profile?.name || '',
      phone: ePhone.trim() || profile?.phone || '',
      email: eEmail.trim() || profile?.email || '',
      address: eAddress.trim() || profile?.address || '',
    };
    saveProfile(updated);
    setProfile(updated);
    // Sync to backend
    fetch(`${API_URL}/whatsapp/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).catch(() => {});
    setEditing(false);
  }

  const orderCount = orders.length;
  const lastOrderDate = orderCount > 0
    ? new Date(orders[0].created_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  /* ── No profile saved yet ── */
  if (!loading && !profile) return (
    <div style={{ minHeight:'100dvh', background:'#0D001A', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:430 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#2D0A4E', boxShadow:'0 2px 16px rgba(0,0,0,0.5)' }}>
          <Link href="/" style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <ArrowLeft size={17} color="white" />
          </Link>
          <h1 style={{ color:'white', fontWeight:800, fontSize:16, margin:0, flex:1 }}>My Profile</h1>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'80px 24px', textAlign:'center' }}>
          <div style={{ width:80, height:80, borderRadius:'50%', background:'rgba(255,255,255,0.06)', border:'1.5px solid rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:20 }}>
            <User size={36} color="rgba(255,255,255,0.25)" />
          </div>
          <h2 style={{ color:'white', fontWeight:800, fontSize:20, margin:'0 0 10px' }}>No profile yet</h2>
          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:14, lineHeight:1.7, margin:'0 0 32px' }}>
            Your profile is created automatically<br/>when you complete your first order.
          </p>
          <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'13px 28px', borderRadius:16, background:'linear-gradient(135deg,#F59E0B,#D97706)', color:'#000', fontWeight:800, fontSize:15, textDecoration:'none' }}>
            🛒 Start Shopping
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:'100dvh', background:'#0D001A', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:430, paddingBottom:48 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#2D0A4E', boxShadow:'0 2px 16px rgba(0,0,0,0.5)' }}>
          <Link href="/" style={{ width:38,height:38,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
            <ArrowLeft size={17} color="white" />
          </Link>
          <h1 style={{ color:'white', fontWeight:800, fontSize:16, margin:0, flex:1 }}>My Profile</h1>
          {!editing && (
            <button onClick={startEdit}
              style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:20,background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.14)',color:'rgba(255,255,255,0.6)',fontSize:12,cursor:'pointer' }}>
              <Pencil size={12} /> Edit
            </button>
          )}
          {editing && (
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={saveEdit}
                style={{ display:'flex',alignItems:'center',gap:5,padding:'7px 14px',borderRadius:20,background:'rgba(245,158,11,0.15)',border:'1px solid rgba(245,158,11,0.35)',color:'#F59E0B',fontSize:12,cursor:'pointer',fontWeight:700 }}>
                <Check size={12} /> Save
              </button>
              <button onClick={() => setEditing(false)}
                style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer' }}>
                <X size={14} color="rgba(255,255,255,0.4)" />
              </button>
            </div>
          )}
        </div>

        <div style={{ padding:'24px 16px 0' }}>

          {/* Avatar + name */}
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ width:80,height:80,borderRadius:'50%',background:'linear-gradient(135deg,#F59E0B,#D97706)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px',boxShadow:'0 0 28px rgba(245,158,11,0.35)' }}>
              <span style={{ color:'#000',fontWeight:900,fontSize:28 }}>
                {profile?.name ? initials(profile.name) : <User size={32} color="#000" />}
              </span>
            </div>
            {!editing && (
              <>
                <h2 style={{ color:'white', fontWeight:800, fontSize:22, margin:'0 0 4px' }}>{profile?.name}</h2>
                {profile?.email && <p style={{ color:'rgba(255,255,255,0.38)', fontSize:13, margin:0 }}>{profile.email}</p>}
              </>
            )}
          </div>

          {/* ── VIEW MODE: info pills ── */}
          {!editing && (
            <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:24 }}>
              {profile?.phone && (
                <div style={{ display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:13,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)' }}>
                  <Phone size={15} color="#F59E0B" />
                  <span style={{ color:'rgba(255,255,255,0.7)', fontSize:14 }}>{profile.phone}</span>
                </div>
              )}
              {profile?.address && (
                <div style={{ display:'flex',alignItems:'flex-start',gap:12,padding:'12px 14px',borderRadius:13,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)' }}>
                  <MapPin size={15} color="#F59E0B" style={{ flexShrink:0, marginTop:1 }} />
                  <span style={{ color:'rgba(255,255,255,0.7)', fontSize:14, lineHeight:1.5 }}>{profile.address}</span>
                </div>
              )}
            </div>
          )}

          {/* ── EDIT MODE: inline fields ── */}
          {editing && (
            <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:24 }}>
              {[
                { label:'Full Name',   val:eName,     set:setEName,    icon:User,   type:'text' },
                { label:'Phone',       val:ePhone,    set:setEPhone,   icon:Phone,  type:'tel' },
                { label:'Email',       val:eEmail,    set:setEEmail,   icon:Mail,   type:'email' },
                { label:'Address',     val:eAddress,  set:setEAddress, icon:MapPin, type:'text' },
              ].map(({ label, val, set, icon: Icon, type }) => (
                <div key={label}>
                  <p style={{ color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:.6,margin:'0 0 5px' }}>{label}</p>
                  <div style={{ position:'relative' }}>
                    <div style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }}>
                      <Icon size={15} color="rgba(255,255,255,0.3)" />
                    </div>
                    <input type={type} value={val} onChange={e => set(e.target.value)}
                      style={{ width:'100%',padding:'12px 12px 12px 36px',borderRadius:12,background:'rgba(255,255,255,0.07)',border:'1.5px solid rgba(245,158,11,0.35)',color:'white',fontSize:14,outline:'none' }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Stats */}
          {orderCount > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
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
                  <span style={{ color:'rgba(255,255,255,0.45)',fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:.5 }}>Last Order</span>
                </div>
                <p style={{ color:'#F59E0B',fontWeight:800,fontSize:13,margin:0,lineHeight:1.3 }}>{lastOrderDate}</p>
              </div>
            </div>
          )}

          {/* Orders list */}
          {loading && (
            <div style={{ textAlign:'center', padding:'32px 0' }}>
              <div style={{ width:32,height:32,border:'3px solid rgba(245,158,11,0.2)',borderTop:'3px solid #F59E0B',borderRadius:'50%',margin:'0 auto 12px',animation:'spin 0.8s linear infinite' }} />
              <p style={{ color:'rgba(255,255,255,0.3)', fontSize:13 }}>Loading orders…</p>
            </div>
          )}

          {!loading && orderCount > 0 && (
            <div>
              <h3 style={{ color:'rgba(255,255,255,0.4)',fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:.8,margin:'0 0 12px' }}>Order History</h3>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {orders.map(o => {
                  const st     = STATUS_META[o.status] || { label: o.status, color:'#9CA3AF', emoji:'📦' };
                  const isOpen = expanded === o.id;
                  const date   = new Date(o.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });
                  const ref    = o.name || `#${o.id.slice(-6).toUpperCase()}`;
                  const src    = o.source === 'shopify' ? '🛍️ Shopify' : o.source === 'website' ? '🌐 Web' : '💬 WhatsApp';

                  return (
                    <div key={o.id} style={{ borderRadius:16,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden' }}>
                      <button onClick={() => setExpanded(isOpen ? null : o.id)}
                        style={{ width:'100%',padding:'14px 16px',background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:12,textAlign:'left' }}>
                        <div style={{ width:44,height:44,borderRadius:12,background:`${st.color}18`,border:`1.5px solid ${st.color}44`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,flexShrink:0 }}>
                          {st.emoji}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap' }}>
                            <span style={{ color:'white',fontWeight:700,fontSize:14 }}>{ref}</span>
                            <span style={{ padding:'2px 8px',borderRadius:20,background:`${st.color}22`,color:st.color,fontSize:11,fontWeight:600 }}>{st.label}</span>
                          </div>
                          <div style={{ display:'flex',alignItems:'center',gap:8,flexWrap:'wrap' }}>
                            <span style={{ color:'#F59E0B',fontWeight:800,fontSize:15 }}>{fmt(o.total_kobo)}</span>
                            <span style={{ color:'rgba(255,255,255,0.25)',fontSize:11 }}>· {date}</span>
                            <span style={{ color:'rgba(255,255,255,0.2)',fontSize:11 }}>· {src}</span>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                      </button>

                      {isOpen && (
                        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'12px 16px' }}>
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

          {!loading && orderCount === 0 && profile && (
            <div style={{ textAlign:'center', padding:'36px 0' }}>
              <span style={{ fontSize:48 }}>📦</span>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:15, marginTop:12 }}>No orders yet</p>
            </div>
          )}

          {/* Shop CTA */}
          <div style={{ textAlign:'center', marginTop:28 }}>
            <Link href="/" style={{ display:'inline-flex',alignItems:'center',gap:8,padding:'13px 28px',borderRadius:16,background:'linear-gradient(135deg,#F59E0B,#D97706)',color:'#000',fontWeight:800,fontSize:15,textDecoration:'none',boxShadow:'0 6px 20px rgba(245,158,11,0.3)' }}>
              🛒 Shop Again
            </Link>
          </div>
        </div>
      </div>

      <style>{`
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { display:none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
