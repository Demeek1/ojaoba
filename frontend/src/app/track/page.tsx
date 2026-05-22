'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Phone, ArrowLeft, Package, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { fmt } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const STATUS_META: Record<string, { label: string; color: string; emoji: string }> = {
  PAID:              { label: 'Paid',             color: '#3B82F6', emoji: '💳' },
  CONFIRMED:         { label: 'Confirmed',        color: '#8B5CF6', emoji: '✅' },
  PROCESSING:        { label: 'Processing',       color: '#F59E0B', emoji: '🔄' },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery', color: '#F97316', emoji: '🚚' },
  DELIVERED:         { label: 'Delivered',        color: '#10B981', emoji: '✅' },
  CANCELLED:         { label: 'Cancelled',        color: '#EF4444', emoji: '❌' },
  REFUNDED:          { label: 'Refunded',         color: '#6B7280', emoji: '💸' },
};

interface Order {
  id: string; status: string; items: any; subtotal_kobo: number;
  delivery_fee_kobo: number; total_kobo: number; delivery_address: string;
  customer_name: string; source: string; created_at: string;
}

export default function TrackPage() {
  const [phone, setPhone]     = useState('');
  const [orders, setOrders]   = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  async function search(e: React.FormEvent) {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 7) { setError('Enter a valid phone number'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API_URL}/whatsapp/orders/track?phone=${clean}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {
      setError('Could not fetch orders. Please try again.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ minHeight:'100dvh', background:'linear-gradient(180deg,#0D001A 0%,#1A0033 100%)', display:'flex', justifyContent:'center' }}>
      <div style={{ width:'100%', maxWidth:480, paddingBottom:40 }}>

        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#2D0A4E', boxShadow:'0 2px 12px rgba(0,0,0,0.4)' }}>
          <Link href="/" style={{ width:36,height:36,borderRadius:'50%',background:'rgba(255,255,255,0.1)',border:'1.5px solid rgba(255,255,255,0.15)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <ArrowLeft size={18} color="white" />
          </Link>
          <div style={{ flex:1 }}>
            <h1 style={{ color:'white', fontWeight:800, fontSize:17, margin:0 }}>Track My Orders</h1>
            <p style={{ color:'rgba(255,255,255,0.45)', fontSize:12, margin:0 }}>Enter your phone to see your order history</p>
          </div>
          <Package size={22} color="#F59E0B" />
        </div>

        <div style={{ padding:'24px 16px 0' }}>

          {/* Search Form */}
          <form onSubmit={search} style={{ marginBottom:28 }}>
            <label style={{ display:'block', color:'rgba(255,255,255,0.65)', fontSize:12, fontWeight:600, marginBottom:8, textTransform:'uppercase', letterSpacing:.5 }}>
              Your Phone Number
            </label>
            <div style={{ display:'flex', gap:10 }}>
              <div style={{ position:'relative', flex:1 }}>
                <div style={{ position:'absolute', left:13, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}>
                  <Phone size={16} color="rgba(255,255,255,0.3)" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 08012345678"
                  style={{ width:'100%', padding:'13px 14px 13px 40px', borderRadius:12, background:'rgba(255,255,255,0.06)', border:`1.5px solid ${error?'#EF4444':'rgba(255,255,255,0.12)'}`, color:'white', fontSize:14, outline:'none' }}
                />
              </div>
              <button type="submit" disabled={loading} style={{ padding:'0 18px', borderRadius:12, background:'linear-gradient(135deg,#F59E0B,#D97706)', border:'none', cursor:loading?'wait':'pointer', display:'flex', alignItems:'center', gap:6, fontWeight:700, fontSize:14, color:'#000', flexShrink:0 }}>
                {loading ? '...' : <><Search size={16} /> Find</>}
              </button>
            </div>
            {error && <p style={{ color:'#F87171', fontSize:12, marginTop:6 }}>{error}</p>}
          </form>

          {/* No orders */}
          {orders !== null && orders.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <span style={{ fontSize:48 }}>📦</span>
              <p style={{ color:'rgba(255,255,255,0.5)', fontSize:15, marginTop:12 }}>No orders found for this number</p>
              <p style={{ color:'rgba(255,255,255,0.25)', fontSize:13, marginTop:6 }}>Try the number you used when ordering</p>
            </div>
          )}

          {/* Orders list */}
          {orders && orders.length > 0 && (
            <div>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:13, marginBottom:14 }}>{orders.length} order{orders.length!==1?'s':''} found</p>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {orders.map(o => {
                  const items = typeof o.items === 'string' ? JSON.parse(o.items) : o.items || [];
                  const st = STATUS_META[o.status] || { label: o.status, color:'#9CA3AF', emoji:'📦' };
                  const isOpen = expanded === o.id;
                  const date = new Date(o.created_at).toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' });

                  return (
                    <div key={o.id} style={{ borderRadius:16, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', overflow:'hidden' }}>
                      {/* Order header */}
                      <button onClick={() => setExpanded(isOpen ? null : o.id)}
                        style={{ width:'100%', padding:'14px 16px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:12, textAlign:'left' }}>
                        <div style={{ width:42, height:42, borderRadius:10, background:`${st.color}20`, border:`1.5px solid ${st.color}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, flexShrink:0 }}>
                          {st.emoji}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                            <span style={{ color:'white', fontWeight:700, fontSize:14 }}>#{o.id.slice(-6).toUpperCase()}</span>
                            <span style={{ padding:'2px 8px', borderRadius:20, background:`${st.color}22`, color:st.color, fontSize:11, fontWeight:600 }}>{st.label}</span>
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <span style={{ color:'#F59E0B', fontWeight:800, fontSize:15 }}>{fmt(o.total_kobo)}</span>
                            <span style={{ color:'rgba(255,255,255,0.3)', fontSize:12 }}>· {date}</span>
                            <span style={{ color:'rgba(255,255,255,0.2)', fontSize:11 }}>· {o.source === 'website' ? '🌐' : '💬'}</span>
                          </div>
                        </div>
                        {isOpen ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />}
                      </button>

                      {/* Expanded details */}
                      {isOpen && (
                        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'14px 16px' }}>
                          <p style={{ color:'rgba(255,255,255,0.4)', fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:.5, margin:'0 0 10px' }}>Items</p>
                          <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                            {items.map((it: any, idx: number) => (
                              <div key={idx} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                                <span style={{ color:'rgba(255,255,255,0.7)', fontSize:13 }}>
                                  {it.title} <span style={{ color:'rgba(255,255,255,0.35)' }}>× {it.quantity || it.qty}</span>
                                </span>
                                <span style={{ color:'white', fontSize:13, fontWeight:600 }}>{fmt((it.priceKobo || it.price_kobo || 0) * (it.quantity || it.qty || 1))}</span>
                              </div>
                            ))}
                          </div>
                          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:10, display:'flex', flexDirection:'column', gap:5 }}>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Subtotal</span>
                              <span style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }}>{fmt(o.subtotal_kobo)}</span>
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between' }}>
                              <span style={{ color:'rgba(255,255,255,0.4)', fontSize:12 }}>Delivery</span>
                              <span style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }}>{fmt(o.delivery_fee_kobo)}</span>
                            </div>
                            <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
                              <span style={{ color:'white', fontWeight:700, fontSize:14 }}>Total</span>
                              <span style={{ color:'#F59E0B', fontWeight:900, fontSize:16 }}>{fmt(o.total_kobo)}</span>
                            </div>
                          </div>
                          {o.delivery_address && (
                            <p style={{ color:'rgba(255,255,255,0.35)', fontSize:12, marginTop:10, paddingTop:10, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
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

          {/* Back to shopping */}
          {orders !== null && (
            <div style={{ textAlign:'center', marginTop:28 }}>
              <Link href="/" style={{ display:'inline-flex', alignItems:'center', gap:8, color:'rgba(255,255,255,0.4)', fontSize:13, textDecoration:'none' }}>
                <ArrowLeft size={14} /> Back to shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
