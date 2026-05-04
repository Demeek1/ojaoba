import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';
import * as wa from './whatsapp.service';
import * as shopify from './shopify.service';

// ── Helpers ───────────────────────────────────────────────────────────────────
const kobo = (n: number | bigint) => `₦${(Number(n)/100).toLocaleString('en-NG',{minimumFractionDigits:0})}`;
const EMOJI = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
const MAIN  = new Set(['menu','home','start','hi','hello','hey','0','back to menu','main menu']);
const BACK  = new Set(['back','b','cancel','go back']);
const HELP  = new Set(['help','support','human','agent']);
const ORDERS= new Set(['orders','my orders','track','order status']);
const CART  = new Set(['cart','my cart','basket']);

// ── Session ───────────────────────────────────────────────────────────────────
async function getSession(phone: string, name?: string) {
  const { rows } = await db.query(`SELECT * FROM wa_sessions WHERE phone=$1`, [phone]);
  if (rows.length) {
    await db.query(`UPDATE wa_sessions SET last_active=NOW() WHERE phone=$1`, [phone]);
    const r = rows[0];
    r.context = typeof r.context==='string'?JSON.parse(r.context):r.context||{};
    r.cart    = typeof r.cart   ==='string'?JSON.parse(r.cart)   :r.cart   ||[];
    return r;
  }
  const id = uuidv4();
  await db.query(`INSERT INTO wa_sessions (id,phone,name,state,context,cart,order_count,favorite_items) VALUES ($1,$2,$3,'IDLE','{}','[]',0,'{}')`, [id, phone, name||null]);
  return { id, phone, name:name||null, state:'IDLE', context:{}, cart:[], order_count:0, favorite_items:[] };
}

async function set(id: string, updates: any) {
  const sets: string[] = ['last_active=NOW()'];
  const vals: any[] = [];
  let i = 1;
  if (updates.state   !== undefined) { sets.push(`state=$${i++}`);   vals.push(updates.state); }
  if (updates.context !== undefined) { sets.push(`context=$${i++}`); vals.push(JSON.stringify(updates.context)); }
  if (updates.cart    !== undefined) { sets.push(`cart=$${i++}`);    vals.push(JSON.stringify(updates.cart)); }
  if (updates.name    !== undefined) { sets.push(`name=$${i++}`);    vals.push(updates.name); }
  if (sets.length>1) { vals.push(id); await db.query(`UPDATE wa_sessions SET ${sets.join(',')} WHERE id=$${i}`, vals); }
}

async function track(phone: string, event: string, meta: any={}) {
  await db.query(`INSERT INTO analytics (id,phone,event,metadata) VALUES ($1,$2,$3,$4)`, [uuidv4(),phone,event,JSON.stringify(meta)]).catch(()=>{});
}

const cartTotal = (cart: any[]) => cart.reduce((s,i)=>s+i.priceKobo*i.quantity,0);
const cartCount = (cart: any[]) => cart.reduce((s,i)=>s+i.quantity,0);

async function getSetting(key: string, fallback = '') {
  const { rows } = await db.query(`SELECT value FROM settings WHERE key=$1`, [key]);
  return rows[0]?.value || fallback;
}

// ── Screens ───────────────────────────────────────────────────────────────────
async function mainMenu(s: any) {
  await set(s.id, { state:'MAIN_MENU', context:{} });
  const cartQty = cartCount(s.cart);
  const isReturn = s.order_count > 0;
  const name = s.name ? ` *${s.name}*` : '';
  const greeting = isReturn
    ? `Welcome back${name}! 🎉 Great to have you again.\n\n`
    : `👋 Welcome${name} to *Ojaoba Food Market!* 🍎\nNigeria's freshest food marketplace.\n\n`;
  const cartNote = cartQty>0 ? `🛒 You have *${cartQty} item${cartQty>1?'s':''}* in your cart.\n\n` : '';
  await wa.sendList(s.phone,
    '🍎 Ojaoba Food Market',
    `${greeting}${cartNote}What would you like to do?`,
    '📋 Open Menu',
    [{ title: 'Shop', rows: [
      { id:'btn_browse',  title:'🛍️ Browse Products', description:'Shop by category' },
      { id:'btn_search',  title:'🔍 Search Products',  description:'Find any item instantly' },
      { id:`btn_cart`,    title:`🛒 My Cart${cartQty?` (${cartQty} items)`:''}`, description: cartQty?`${cartQty} item${cartQty>1?'s':''} waiting`:'Your shopping cart' },
    ]}, { title: 'Account', rows: [
      { id:'btn_orders',  title:'📦 My Orders',  description:'Track your deliveries' },
      { id:'btn_support', title:'🤝 Support',    description:'Talk to a human agent' },
    ]}],
    'Type anything to search 🔍'
  );
  await track(s.phone,'main_menu');
}

async function showSearch(s: any) {
  await set(s.id, { state:'SEARCH_INPUT' });
  await wa.sendText(s.phone, `🔍 *Search Ojaoba*\n\nJust type what you're looking for:\n\n_Examples:_\n• rice\n• palm oil\n• indomie\n• zobo drink\n\nType *menu* to go back.`);
}

async function showCategories(s: any) {
  const cats = await shopify.getCategories();
  if (!cats.length) { await wa.sendText(s.phone,'😔 Our catalogue is updating. Please check back in a few minutes!\n\nType *menu* to go home.'); return; }
  await set(s.id, { state:'CATEGORIES', context:{} });
  // Split into sections of max 10 rows each — all tappable buttons
  const sections: { title: string; rows: { id: string; title: string; description: string }[] }[] = [];
  const chunkSize = 10;
  for (let i = 0; i < cats.length; i += chunkSize) {
    const chunk = cats.slice(i, i + chunkSize);
    sections.push({
      title: i === 0 ? '🛒 Shop by Category' : '📦 More Categories',
      rows: chunk.map(c => ({ id: `cat_${c}`, title: c.slice(0, 24), description: `Tap to browse ${c.slice(0,30)}` })),
    });
  }
  await wa.sendList(s.phone, '🛍️ Product Categories', `We have ${cats.length} categories — tap any to start shopping!`, '🗂️ Pick Category', sections, 'Or type a product name to search');
  await track(s.phone,'categories');
}

async function showProducts(s: any, category: string, page=1) {
  const { products, total, totalPages } = await shopify.getProductsByCategory(category, page, 9);
  if (!products.length) {
    await wa.sendButtons(s.phone, `😔 No products in *${category}* right now.`, [{ id:'btn_browse', title:'🛍️ Browse Categories' }, { id:'btn_search', title:'🔍 Search' }, { id:'btn_menu', title:'🏠 Menu' }]);
    return;
  }
  await set(s.id,{ state:'PRODUCTS', context:{ currentCategory:category, currentPage:page, totalPages, searchResults:products.map((p:any)=>p.id) } });

  // Products as tappable list rows
  const rows = products.map((p:any) => ({
    id: `view_${p.id}`,
    title: p.title.slice(0, 24),
    description: `${kobo(p.price_kobo)}${p.compare_price_kobo && p.compare_price_kobo > p.price_kobo ? ' 🔖SALE' : ''}`,
  }));
  const navRows: {id:string;title:string;description:string}[] = [];
  if (page > 1) navRows.push({ id:'btn_prev', title:'⬅️ Previous Page', description:`Back to page ${page-1}` });
  if (page < totalPages) navRows.push({ id:'btn_next', title:'➡️ Next Page', description:`Page ${page+1} of ${totalPages}` });

  const sections: { title: string; rows: typeof rows }[] = [
    { title: `🛍️ ${category.slice(0,24)} — Page ${page}/${totalPages}`, rows },
  ];
  if (navRows.length) sections.push({ title: '📄 Navigation', rows: navRows });

  await wa.sendList(
    s.phone,
    `🛍️ ${category.slice(0,40)}`,
    `${total} products available. Tap any item to view details & add to cart.`,
    '👀 View Products',
    sections,
    `Page ${page} of ${totalPages} · Type product name to search`
  );
}

async function showProduct(s: any, product: any) {
  await set(s.id,{ state:'PRODUCT_DETAIL', context:{ ...s.context, currentProductId:product.id } });
  const variants = typeof product.variants==='string'?JSON.parse(product.variants):product.variants||[];
  const stock = product.inventory!==null?(product.inventory>10?'✅ In Stock':product.inventory>0?`⚠️ Only ${product.inventory} left!`:'❌ Out of Stock'):'✅ Available';
  const vtext = variants.length>1&&variants[0].title?`\n\n📦 *Options:* ${variants.map((v:any)=>v.title).filter(Boolean).join(', ')}` :'';
  const disc = product.compare_price_kobo&&product.compare_price_kobo>product.price_kobo?`\n~~${kobo(product.compare_price_kobo)}~~ → *${kobo(product.price_kobo)}* 🎉`:`\n💰 *${kobo(product.price_kobo)}*`;
  await wa.sendButtons(s.phone,
    `🍽️ *${product.title}*${disc}${product.description?`\n\n${product.description.slice(0,180)}`:''}${vtext}\n\n${stock}`,
    [{ id:`add_1_${product.id}`, title:'🛒 Add to Cart' }, { id:`qty_${product.id}`, title:'🔢 Choose Qty' }, { id:'btn_back', title:'⬅️ Back' }],
    undefined, undefined, product.image_url||undefined
  );
  await track(s.phone,'product_viewed',{ productId:product.id, title:product.title });
}

async function showQtyPicker(s: any, productId: string) {
  const p = await shopify.getProduct(productId);
  if (!p) return;
  await set(s.id,{ state:'QTY_SELECT', context:{ ...s.context, currentProductId:productId } });
  await wa.sendList(s.phone,
    `🔢 How many *${p.title.slice(0,40)}*?`,
    `Price per unit: ${kobo(p.price_kobo)}`,
    'Pick Quantity',
    [{ title:'Select quantity', rows:[
      { id:`add_1_${productId}`, title:'➕ 1', description:`${kobo(p.price_kobo)}` },
      { id:`add_2_${productId}`, title:'➕ 2', description:`${kobo(p.price_kobo*2)}` },
      { id:`add_3_${productId}`, title:'➕ 3', description:`${kobo(p.price_kobo*3)}` },
      { id:`add_4_${productId}`, title:'➕ 4', description:`${kobo(p.price_kobo*4)}` },
      { id:`add_5_${productId}`, title:'➕ 5', description:`${kobo(p.price_kobo*5)}` },
      { id:`add_6_${productId}`, title:'➕ 6', description:`${kobo(p.price_kobo*6)}` },
    ]}],
    'Tap to select how many you want'
  );
}

async function showCart(s: any) {
  await set(s.id,{ state:'CART' });
  if (!s.cart.length) {
    await wa.sendButtons(s.phone,'🛒 Your cart is empty!\n\nBrowse our fresh products and add items to get started.',[{ id:'btn_browse', title:'🛍️ Browse Products' }, { id:'btn_menu', title:'🏠 Main Menu' }]);
    return;
  }
  const subtotal = cartTotal(s.cart);
  const deliveryFee = parseInt(await getSetting('delivery_fee_kobo','50000'));
  const total = subtotal + deliveryFee;
  const lines = s.cart.map((i:any,n:number)=>`${n+1}. *${i.title}* × ${i.quantity} — ${kobo(i.priceKobo*i.quantity)}`);
  await wa.sendButtons(s.phone,
    `🛒 *Your Cart* (${cartCount(s.cart)} items)\n\n${lines.join('\n')}\n\n${'─'.repeat(22)}\nSubtotal: ${kobo(subtotal)}\nDelivery: ${kobo(deliveryFee)}\n*Total: ${kobo(total)}*\n\n_Type *remove N* to remove item N_\n_Type *clear* to empty cart_`,
    [{ id:'btn_checkout', title:'✅ Checkout' }, { id:'btn_browse', title:'🛍️ Add More' }, { id:'btn_menu', title:'🏠 Main Menu' }]
  );
}

async function showOrders(s: any) {
  await set(s.id,{ state:'ORDER_TRACKING' });
  const { rows } = await db.query(`SELECT id,status,total_kobo,created_at FROM orders WHERE phone=$1 ORDER BY created_at DESC LIMIT 5`, [s.phone]);
  if (!rows.length) { await wa.sendButtons(s.phone,`📦 You haven't placed any orders yet!\n\nStart shopping to see your order history.`,[{ id:'btn_browse', title:'🛍️ Browse Products' }, { id:'btn_menu', title:'🏠 Main Menu' }]); return; }
  const SEMOJI: any={PENDING_PAYMENT:'⏳',PAID:'💳',PROCESSING:'🔄',OUT_FOR_DELIVERY:'🚚',DELIVERED:'✅',CANCELLED:'❌',REFUNDED:'💸'};
  const lines = rows.map((o:any,i:number)=>`${EMOJI[i]} *#${o.id.slice(-6).toUpperCase()}* — ${kobo(o.total_kobo)}\n   ${SEMOJI[o.status]||'📦'} ${o.status.replace(/_/g,' ')} · ${new Date(o.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'short'})}`);
  await wa.sendText(s.phone,`📦 *Your Recent Orders*\n\n${lines.join('\n\n')}\n\nReply with a *number* for details.\nType *menu* to go home.`);
}

// ── Checkout ──────────────────────────────────────────────────────────────────
async function startCheckout(s: any) {
  if (!s.cart.length) { await wa.sendText(s.phone,'🛒 Your cart is empty! Add some products first.\n\nType *menu* to go home.'); return; }
  if (s.name) {
    await set(s.id,{ state:'CHECKOUT_ADDRESS', context:{ ...s.context, checkoutName:s.name } });
    await wa.sendText(s.phone,`📍 Hi *${s.name}*! Please type your full *delivery address*:\n\n_Example: 12 Allen Avenue, Ikeja, Lagos_`);
  } else {
    await set(s.id,{ state:'CHECKOUT_NAME' });
    await wa.sendText(s.phone,`📝 Almost there! Please type your *full name* for delivery:`);
  }
}

async function handleName(s: any, raw: string) {
  const name = raw.trim();
  if (name.length<2) { await wa.sendText(s.phone,'⚠️ Please enter your full name (at least 2 characters).'); return; }
  await set(s.id,{ state:'CHECKOUT_ADDRESS', context:{ ...s.context, checkoutName:name }, name });
  await wa.sendText(s.phone,`✅ Got it, *${name}*!\n\n📍 Please type your full *delivery address*:\n\n_Example: 12 Allen Avenue, Ikeja, Lagos_`);
}

async function handleAddress(s: any, raw: string) {
  const address = raw.trim();
  if (address.length<10) { await wa.sendText(s.phone,'⚠️ Please enter a complete address (street, area, city).'); return; }
  const name = s.context.checkoutName||s.name||'Customer';
  const subtotal = cartTotal(s.cart);
  const deliveryFee = parseInt(await getSetting('delivery_fee_kobo','50000'));
  const total = subtotal + deliveryFee;
  await set(s.id,{ state:'CHECKOUT_CONFIRM', context:{ ...s.context, checkoutAddress:address } });
  const lines = s.cart.map((i:any)=>`• ${i.title} × ${i.quantity} — ${kobo(i.priceKobo*i.quantity)}`);
  await wa.sendButtons(s.phone,
    `📋 *Order Summary*\n\n👤 *Name:* ${name}\n📍 *Address:* ${address}\n\n*Items:*\n${lines.join('\n')}\n\nSubtotal: ${kobo(subtotal)}\nDelivery: ${kobo(deliveryFee)}\n*Total: ${kobo(total)}*\n\nConfirm your order?`,
    [{ id:'btn_confirm', title:'✅ Confirm & Pay' }, { id:'btn_edit_addr', title:'✏️ Edit Address' }, { id:'btn_cancel_order', title:'❌ Cancel' }]
  );
}

async function confirmOrder(s: any) {
  const name = s.context.checkoutName||s.name||'Customer';
  const address = s.context.checkoutAddress!;
  const subtotal = cartTotal(s.cart);
  const deliveryFee = parseInt(await getSetting('delivery_fee_kobo','50000'));
  const total = subtotal + deliveryFee;
  const orderId = uuidv4();
  const ref = `OJA-${Date.now()}`;

  await db.query(`INSERT INTO orders (id,phone,customer_name,delivery_address,items,subtotal_kobo,delivery_fee_kobo,total_kobo,status,paystack_ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PENDING_PAYMENT',$9)`,
    [orderId,s.phone,name,address,JSON.stringify(s.cart),subtotal,deliveryFee,total,ref]);

  let payUrl = '';
  try {
    const { data } = await axios.post('https://api.paystack.co/transaction/initialize',
      { email:`${s.phone.replace(/\D/g,'')}@wa.ojaoba.com`, amount:total, reference:ref,
        callback_url:`${process.env.BACKEND_URL||'http://localhost:4000'}/api/whatsapp/payment/callback`,
        metadata:{ type:'ojaoba_order', orderId, phone:s.phone, customerName:name },
        channels:['card','bank','ussd','bank_transfer','mobile_money'] },
      { headers:{ Authorization:`Bearer ${process.env.PAYSTACK_SECRET_KEY}` }, timeout:10000 }
    );
    payUrl = data.data.authorization_url;
    await db.query(`UPDATE orders SET paystack_url=$1 WHERE id=$2`, [payUrl, orderId]);
  } catch(e:any) { console.error('[Chatbot] Paystack error:', e.message); }

  await set(s.id,{ state:'AWAITING_PAYMENT', context:{ pendingOrderId:orderId }, cart:[] });
  await wa.sendText(s.phone,
    `🎉 *Order #${orderId.slice(-6).toUpperCase()} Placed!*\n\n📦 ${s.cart.length} item${s.cart.length>1?'s':''}\n💰 Total: *${kobo(total)}*\n\n${payUrl?`💳 *Tap to pay securely:*\n${payUrl}\n\n_Powered by Paystack — 100% secure_`:'⚠️ Payment link failed. Type *pay* to retry.'}\n\n_We'll confirm your order right here once payment is received!_`
  );
  await track(s.phone,'order_created',{ orderId, total });
}

// ── Payment confirmed (called by webhook) ─────────────────────────────────────
export const handlePaymentSuccess = async (orderId: string, ref: string) => {
  await db.query(`UPDATE orders SET status='PAID', updated_at=NOW() WHERE id=$1`, [orderId]);
  const { rows } = await db.query(`SELECT * FROM orders WHERE id=$1`, [orderId]);
  const order = rows[0]; if (!order) return;
  const items = typeof order.items==='string'?JSON.parse(order.items):order.items||[];

  try {
    const shopifyId = await shopify.createShopifyOrder({ items, customerName:order.customer_name, customerPhone:order.phone, deliveryAddress:order.delivery_address, orderRef:ref });
    await db.query(`UPDATE orders SET shopify_order_id=$1, status='PROCESSING', updated_at=NOW() WHERE id=$2`, [shopifyId, orderId]);
    for (const i of items) await shopify.decrementInventory(i.shopifyId, i.quantity);
  } catch(e:any) { console.error('[Chatbot] Shopify order error:', e.message); }

  await db.query(`UPDATE wa_sessions SET order_count=order_count+1 WHERE phone=$1`, [order.phone]).catch(()=>{});
  const shortId = orderId.slice(-6).toUpperCase();
  await wa.sendButtons(order.phone,
    `🎉 *Payment Confirmed! Thank you!*\n\n✅ Order *#${shortId}* is being prepared.\n📍 Delivering to: ${order.delivery_address}\n⏱️ Estimated delivery: *30–60 min*\n\n_You'll receive updates here as your order progresses._`,
    [{ id:'btn_orders', title:'📦 Track Order' }, { id:'btn_browse', title:'🛍️ Shop More' }]
  );
  await track(order.phone,'payment_confirmed',{ orderId, total:order.total_kobo });
};

// ── Admin: push status update to customer ─────────────────────────────────────
export const sendStatusUpdate = async (orderId: string, status: string, msg?: string) => {
  const { rows } = await db.query(`SELECT * FROM orders WHERE id=$1`, [orderId]);
  const order = rows[0]; if (!order) return;
  const defaults: any={PROCESSING:'🔄 Your order *#'+order.id.slice(-6).toUpperCase()+'* is being prepared!',OUT_FOR_DELIVERY:'🚚 Your order is *out for delivery!* Our rider is on the way.',DELIVERED:'✅ Your order has been *delivered!* Enjoy your meal 🍽️\n\nThank you for choosing Ojaoba!',CANCELLED:'❌ Your order was cancelled. Type *help* if you have questions.',REFUNDED:'💸 Your refund is being processed (3–5 business days).'};
  await wa.sendText(order.phone, msg||defaults[status]||`📦 Order #${order.id.slice(-6).toUpperCase()} status: *${status.replace(/_/g,' ')}*`);
  await db.query(`UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2`, [status, orderId]);
};

// ── Main entry point ──────────────────────────────────────────────────────────
export const processMessage = async (phone: string, rawText: string, messageId: string, msgType: string, interactiveId?: string, profileName?: string) => {
  const s = await getSession(phone, profileName);
  wa.markRead(messageId);
  const input = (interactiveId||rawText||'').toLowerCase().trim();
  await track(phone,'message',{ state:s.state, input:input.slice(0,40) });

  // Global commands
  if (MAIN.has(input)||input==='btn_menu') return mainMenu(s);
  if (input==='btn_browse'||input==='categories'||input==='browse') return showCategories(s);
  if (CART.has(input)||input==='btn_cart') return showCart({ ...s });
  if (ORDERS.has(input)||input==='btn_orders') return showOrders(s);
  if (input==='search'||input==='btn_search'||input==='find') return showSearch(s);
  if (HELP.has(input)||input==='btn_support') {
    await set(s.id,{ state:'SUPPORT' });
    const phone_s = await getSetting('support_phone','+234 800 000 0000');
    await wa.sendText(s.phone,`🤝 *Ojaoba Support*\n\nA support agent will respond to you shortly.\n\n📞 Call: ${phone_s}\n📧 Email: support@ojaoba.com\n\nType your message and we'll get back to you.\nType *menu* to continue shopping.`);
    return;
  }

  switch(s.state) {
    case 'IDLE':
    case 'MAIN_MENU':
      if (input==='btn_browse'||input==='1') return showCategories(s);
      if (input==='btn_cart'  ||input==='3') return showCart(s);
      if (input==='btn_orders'||input==='4') return showOrders(s);
      if (input==='5') { await set(s.id,{ state:'SUPPORT' }); const sp=await getSetting('support_phone','+234 800 000 0000'); await wa.sendText(s.phone,`🤝 *Ojaoba Support*\n\nA support agent will respond to you shortly.\n\n📞 Call: ${sp}\n📧 Email: support@ojaoba.com\n\nType your message and we'll get back to you.\nType *menu* to continue shopping.`); return; }
      // Auto-search: if user just types a product name from main menu
      if (rawText.trim().length >= 2 && !input.startsWith('btn_')) return handleSearch(s, rawText.trim());
      return mainMenu(s);

    case 'SEARCH_INPUT':
      if (rawText.trim().length >= 2) return handleSearch(s, rawText.trim());
      await wa.sendText(s.phone, '⚠️ Please type at least 2 characters to search.');
      break;

    case 'CATEGORIES': {
      if (input.startsWith('cat_')) { const slug=input.slice(4); const allCats=await shopify.getCategories(); const match=allCats.find(c=>c.toLowerCase()===slug)||slug; return showProducts(s,match,1); }
      const n=parseInt(input); if (!isNaN(n)&&n>0) { const cats=await shopify.getCategories(); if(cats[n-1]) return showProducts(s,cats[n-1],1); }
      if (rawText.toLowerCase().startsWith('search ')) return handleSearch(s, rawText.slice(7).trim());
      const cats=await shopify.getCategories(); const m=cats.find(c=>c.toLowerCase().includes(input)); if(m) return showProducts(s,m,1);
      // Auto-search fallback in categories
      if (rawText.trim().length >= 2) return handleSearch(s, rawText.trim());
      await wa.sendText(s.phone,'⚠️ Select a category number, or just type a product name to search.');
      break;
    }

    case 'PRODUCTS': {
      if (BACK.has(input)||input==='btn_back'||input==='btn_categories') return showCategories(s);
      if (input==='next'||input==='btn_next') return showProducts(s,s.context.currentCategory!,(s.context.currentPage||1)+1);
      if (input==='prev'||input==='previous'||input==='btn_prev') return showProducts(s,s.context.currentCategory!,Math.max(1,(s.context.currentPage||1)-1));
      // Tappable list row — view product
      if (input.startsWith('view_')) { const pid=input.slice(5); const p=await shopify.getProduct(pid); if(p) return showProduct(s,p); break; }
      const addMatch=input.match(/^add_(\d+)_(.+)$/);
      if (addMatch) return addToCart(s, addMatch[2], parseInt(addMatch[1])||1);
      const n=parseInt(input);
      if (!isNaN(n)&&n>0) { const pid=(s.context.searchResults||[])[n-1]; if(pid){const p=await shopify.getProduct(pid);if(p)return showProduct(s,p);} }
      // Auto-search: typing any word searches instantly
      if (rawText.trim().length >= 2) return handleSearch(s, rawText.trim());
      break;
    }

    case 'PRODUCT_DETAIL': {
      if (BACK.has(input)||input==='btn_back') { if(s.context.currentCategory) return showProducts(s,s.context.currentCategory,s.context.currentPage||1); return showCategories(s); }
      if (input.startsWith('qty_')) return showQtyPicker(s, input.slice(4));
      const addMatch=input.match(/^add_(\d+)_(.+)$/);
      if (addMatch||input==='add'||input==='buy'||rawText.toLowerCase().startsWith('add')) {
        const qty=addMatch?parseInt(addMatch[1]):1;
        const pid=addMatch?addMatch[2]:s.context.currentProductId;
        if (pid) return addToCart(s, pid, isNaN(qty)?1:qty);
      }
      break;
    }

    case 'QTY_SELECT': {
      const addMatch=input.match(/^add_(\d+)_(.+)$/);
      if (addMatch) return addToCart(s, addMatch[2], parseInt(addMatch[1])||1);
      if (BACK.has(input)||input==='btn_back') { if(s.context.currentProductId){const p=await shopify.getProduct(s.context.currentProductId);if(p)return showProduct(s,p);} return showCategories(s); }
      break;
    }

    case 'CART': {
      if (input==='btn_checkout'||input==='checkout'||input==='order') return startCheckout(s);
      if (input==='btn_browse') return showCategories(s);
      const rm=rawText.toLowerCase().match(/^remove\s+(\d+)/);
      if (rm) { const idx=parseInt(rm[1])-1; if(idx<0||idx>=s.cart.length){await wa.sendText(s.phone,'⚠️ Invalid item number.');return;} const cart=s.cart.filter((_:any,i:number)=>i!==idx); await set(s.id,{cart}); if(!cart.length){await set(s.id,{state:'MAIN_MENU'});await wa.sendText(s.phone,'🗑️ Removed! Cart is now empty.\n\nType *browse* to shop again.');} else await showCart({...s,cart}); return; }
      if (input==='clear'||input==='clear cart') { await set(s.id,{cart:[],state:'MAIN_MENU'}); await wa.sendText(s.phone,'🗑️ Cart cleared!\n\nType *browse* to start shopping again.'); return; }
      break;
    }

    case 'CHECKOUT_NAME':    return handleName(s, rawText);
    case 'CHECKOUT_ADDRESS': return handleAddress(s, rawText);

    case 'CHECKOUT_CONFIRM': {
      if (input==='btn_confirm'||input==='confirm'||input==='yes') return confirmOrder(s);
      if (input==='btn_edit_addr'||input==='edit') { await set(s.id,{state:'CHECKOUT_ADDRESS'}); await wa.sendText(s.phone,'📍 Please type your updated delivery address:'); return; }
      if (input==='btn_cancel_order'||input==='cancel') { await set(s.id,{state:'CART'}); return showCart(s); }
      await wa.sendText(s.phone,'Type *confirm* to place your order or *cancel* to go back to cart.');
      break;
    }

    case 'AWAITING_PAYMENT': {
      if (input==='pay'||input==='resend link'||input==='retry') {
        const { rows } = await db.query(`SELECT paystack_url,status,total_kobo FROM orders WHERE id=$1`, [s.context.pendingOrderId||'']);
        if (rows[0]?.paystack_url&&rows[0].status==='PENDING_PAYMENT') { await wa.sendText(s.phone,`💳 *Your payment link:*\n\n${rows[0].paystack_url}\n\nTotal: *${kobo(rows[0].total_kobo)}*`); return; }
      }
      await wa.sendButtons(s.phone,'⏳ Waiting for your payment.\n\nType *resend link* to get the link again.',
        [{ id:'resend link', title:'🔗 Resend Link' }, { id:'btn_orders', title:'📦 My Orders' }, { id:'btn_menu', title:'🏠 Main Menu' }]);
      break;
    }

    case 'ORDER_TRACKING': {
      const n=parseInt(input);
      if (!isNaN(n)&&n>0) { const { rows }=await db.query(`SELECT * FROM orders WHERE phone=$1 ORDER BY created_at DESC LIMIT 5`,[s.phone]); const o=rows[n-1]; if(o) return showOrderDetail(s,o); await wa.sendText(s.phone,'⚠️ Invalid order number.'); return; }
      return showOrders(s);
    }

    case 'SUPPORT':
      await db.query(`INSERT INTO analytics (id,phone,event,metadata) VALUES ($1,$2,'support_message',$3)`,[uuidv4(),phone,JSON.stringify({message:rawText})]).catch(()=>{});
      await wa.sendText(s.phone,`💬 *Message received!*\n\nA support agent will reply shortly.\nFor urgent help: ${await getSetting('support_phone')}\n\nType *menu* to continue shopping.`);
      break;

    default: return mainMenu(s);
  }
};

async function addToCart(s: any, productId: string, qty: number) {
  const p = await shopify.getProduct(productId);
  if (!p) { await wa.sendText(s.phone,'⚠️ Product not found. Please try again.'); return; }
  if (!p.available) { await wa.sendText(s.phone,`😔 *${p.title}* is currently out of stock.\n\nType *back* to browse other products.`); return; }
  const cart = [...s.cart];
  const idx = cart.findIndex((i:any)=>i.productId===productId);
  if (idx>=0) cart[idx].quantity+=qty;
  else cart.push({ productId:p.id, shopifyId:p.shopify_id, title:p.title, priceKobo:p.price_kobo, quantity:qty, imageUrl:p.image_url, variantId:null });
  await set(s.id,{ cart });
  const total = cartTotal(cart); const count = cartCount(cart);
  await wa.sendButtons(s.phone,`✅ *${p.title}* × ${qty} added!\n\n🛒 ${count} item${count>1?'s':''} in cart — ${kobo(total)}`,
    [{ id:'btn_cart', title:'🛒 View Cart' }, { id:'btn_browse', title:'🛍️ Keep Shopping' }, { id:'btn_menu', title:'🏠 Main Menu' }]);
  await track(s.phone,'add_to_cart',{ productId, qty });
}

async function handleSearch(s: any, q: string) {
  if (!q||q.length<2) { await wa.sendText(s.phone,'⚠️ Type at least 2 characters to search.\n\nExample: *rice*'); return; }
  const results = await shopify.searchProducts(q, 8);
  if (!results.length) {
    await wa.sendButtons(s.phone,
      `😔 No results for *"${q}"*\n\nTry a different keyword or browse by category.`,
      [{ id:'btn_search', title:'🔍 Search Again' }, { id:'btn_browse', title:'🛍️ Browse' }, { id:'btn_menu', title:'🏠 Menu' }]
    );
    return;
  }
  await set(s.id,{ state:'PRODUCTS', context:{ currentCategory:`🔍 "${q}"`, currentPage:1, searchResults:results.map((p:any)=>p.id) } });
  const lines = results.map((p:any,i:number)=>`${EMOJI[i]||(i+1)+'.'} *${p.title}*\n    💰 ${kobo(p.price_kobo)}  _${p.category}_`);
  await wa.sendText(s.phone,`🔍 *"${q}"* — ${results.length} result${results.length>1?'s':''}\n${'─'.repeat(24)}\n\n${lines.join('\n\n')}\n\n${'─'.repeat(24)}\n_Tap a number to view & add to cart_`);
  await wa.sendButtons(s.phone, `Found ${results.length} result${results.length>1?'s':''} for *"${q}"*`, [{ id:'btn_search', title:'🔍 New Search' }, { id:'btn_browse', title:'🛍️ Browse' }, { id:'btn_menu', title:'🏠 Menu' }]);
  await track(s.phone,'search',{ q, results:results.length });
}

async function showOrderDetail(s: any, order: any) {
  const items = typeof order.items==='string'?JSON.parse(order.items):order.items||[];
  const S: any={PENDING_PAYMENT:'⏳ Pending Payment',PAID:'💳 Paid',PROCESSING:'🔄 Processing',OUT_FOR_DELIVERY:'🚚 Out for Delivery',DELIVERED:'✅ Delivered',CANCELLED:'❌ Cancelled',REFUNDED:'💸 Refunded'};
  const lines = items.map((i:any)=>`• ${i.title} × ${i.quantity} — ${kobo(i.priceKobo*i.quantity)}`);
  let body=`📦 *Order #${order.id.slice(-6).toUpperCase()}*\n📅 ${new Date(order.created_at).toLocaleDateString('en-NG',{day:'numeric',month:'long',year:'numeric'})}\n📍 ${order.delivery_address}\n\n*Status:* ${S[order.status]||order.status}\n\n*Items:*\n${lines.join('\n')}\n\n*Total:* ${kobo(order.total_kobo)}`;
  if (order.status==='PENDING_PAYMENT'&&order.paystack_url) body+=`\n\n💳 Complete payment:\n${order.paystack_url}`;
  await wa.sendButtons(s.phone, body, [{ id:'btn_orders', title:'📦 All Orders' }, { id:'btn_menu', title:'🏠 Main Menu' }]);
}
