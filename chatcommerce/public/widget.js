/*!
 * ChatCommerce embeddable chat widget.
 * Usage:  <script src="https://YOUR-APP/widget.js" data-store="TENANT_ID"></script>
 * Optional: data-name="Store Name"  data-color="#7ed957"
 */
(function () {
  var script = document.currentScript;
  if (!script) return;
  var store = script.getAttribute('data-store');
  if (!store) { console.error('[chatcommerce] missing data-store'); return; }
  var base = new URL(script.src).origin;
  var name = script.getAttribute('data-name') || 'Chat with us';
  var accent = script.getAttribute('data-color') || '#7ed957';
  var ink = '#0b150d';
  var key = 'cc_widget_cart_' + store;

  var cart = [];
  try { cart = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
  var slug = null;
  var open = false;

  // ---- styles ----
  var css = document.createElement('style');
  css.textContent = [
    '.ccw-btn{position:fixed;right:20px;bottom:20px;z-index:2147483000;width:60px;height:60px;border-radius:50%;border:none;cursor:pointer;background:' + accent + ';color:' + ink + ';box-shadow:0 10px 30px rgba(0,0,0,.25);font-size:26px;display:flex;align-items:center;justify-content:center}',
    '.ccw-panel{position:fixed;right:20px;bottom:92px;z-index:2147483000;width:360px;max-width:calc(100vw - 40px);height:520px;max-height:calc(100vh - 120px);background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.3);display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}',
    '.ccw-panel.ccw-open{display:flex}',
    '.ccw-head{background:' + ink + ';color:#fff;padding:14px 16px;font-weight:800;display:flex;align-items:center;justify-content:space-between}',
    '.ccw-head span{font-size:15px}',
    '.ccw-x{background:none;border:none;color:#fff;font-size:20px;cursor:pointer;opacity:.7}',
    '.ccw-body{flex:1;overflow-y:auto;padding:14px;background:#f4f8ee;display:flex;flex-direction:column;gap:10px}',
    '.ccw-msg{max-width:82%;padding:9px 12px;border-radius:14px;font-size:14px;line-height:1.4;white-space:pre-wrap;word-wrap:break-word}',
    '.ccw-in{align-self:flex-start;background:#fff;color:' + ink + ';border-bottom-left-radius:4px}',
    '.ccw-out{align-self:flex-end;background:' + accent + ';color:' + ink + ';border-bottom-right-radius:4px}',
    '.ccw-cart{border-top:1px solid #eee;padding:8px 14px;font-size:12px;color:#456;background:#fff;display:none;align-items:center;justify-content:space-between}',
    '.ccw-cart a{color:' + ink + ';font-weight:700;text-decoration:none;background:' + accent + ';padding:6px 12px;border-radius:999px}',
    '.ccw-foot{display:flex;gap:8px;padding:10px;border-top:1px solid #eee;background:#fff}',
    '.ccw-foot input{flex:1;border:1px solid #dce4d5;border-radius:999px;padding:10px 14px;font-size:14px;outline:none}',
    '.ccw-foot button{border:none;background:' + ink + ';color:#fff;border-radius:999px;width:42px;font-size:16px;cursor:pointer}',
    '.ccw-powered{text-align:center;font-size:10px;color:#9aa;padding:4px}'
  ].join('');
  document.head.appendChild(css);

  // ---- elements ----
  var btn = el('button', 'ccw-btn', '💬');
  var panel = el('div', 'ccw-panel');
  panel.innerHTML =
    '<div class="ccw-head"><span>' + esc(name) + '</span><button class="ccw-x" aria-label="Close">×</button></div>' +
    '<div class="ccw-body"></div>' +
    '<div class="ccw-cart"></div>' +
    '<div class="ccw-foot"><input type="text" placeholder="Type a message…" /><button aria-label="Send">➤</button></div>' +
    '<div class="ccw-powered">Powered by ChatCommerce</div>';
  document.body.appendChild(btn);
  document.body.appendChild(panel);

  var body = panel.querySelector('.ccw-body');
  var input = panel.querySelector('input');
  var cartBar = panel.querySelector('.ccw-cart');

  btn.onclick = function () { toggle(true); };
  panel.querySelector('.ccw-x').onclick = function () { toggle(false); };
  panel.querySelector('.ccw-foot button').onclick = send;
  input.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

  function toggle(v) {
    open = v; panel.classList.toggle('ccw-open', v); btn.style.display = v ? 'none' : 'flex';
    if (v && body.childElementCount === 0) send('', true);
    if (v) input.focus();
  }

  function addMsg(text, side) {
    var m = el('div', 'ccw-msg ' + (side === 'out' ? 'ccw-out' : 'ccw-in'), text);
    body.appendChild(m); body.scrollTop = body.scrollHeight;
    return m;
  }

  function renderCart() {
    var count = cart.reduce(function (s, c) { return s + (c.qty || 0); }, 0);
    if (!count) { cartBar.style.display = 'none'; return; }
    cartBar.style.display = 'flex';
    var link = slug ? base + '/store/' + slug : base;
    cartBar.innerHTML = '<span>🛒 ' + count + ' item' + (count > 1 ? 's' : '') + ' in cart</span>' +
      '<a href="' + link + '" target="_blank" rel="noopener">Checkout</a>';
  }

  function send(preset, silent) {
    var text = typeof preset === 'string' && preset ? preset : input.value.trim();
    if (!silent && !text) return;
    if (text) { addMsg(text, 'out'); input.value = ''; }
    var typing = addMsg('…', 'in');
    fetch(base + '/api/widget/' + store + '/chat', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: text, cart: cart })
    }).then(function (r) { return r.json(); }).then(function (d) {
      typing.remove();
      if (d.slug) slug = d.slug;
      if (Array.isArray(d.cart)) { cart = d.cart; try { localStorage.setItem(key, JSON.stringify(cart)); } catch (e) {} }
      addMsg(d.reply || 'Sorry, please try again.', 'in');
      renderCart();
    }).catch(function () { typing.remove(); addMsg('Network error — please try again.', 'in'); });
  }

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  renderCart();
})();
