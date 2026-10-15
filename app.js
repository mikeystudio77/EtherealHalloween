(() => {
  'use strict';

  /* ---------- tiny helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  };
  const randHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');

  // Secret player id (only a hash of it is stored on the server)
  let memPid = null;
  function getPid() {
    try {
      let p = localStorage.getItem('er_pid');
      if (!/^[a-f0-9]{32}$/.test(p || '')) { p = randHex(); localStorage.setItem('er_pid', p); }
      return p;
    } catch { return memPid || (memPid = randHex()); }
  }

  async function post(url, body) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pid: getPid(), ...body }) });
      const data = await r.json().catch(() => ({}));
      return { ok: r.ok, data };
    } catch {
      return { ok: false, data: { error: 'Network error. Check your connection.' } };
    }
  }
  const game = (type, extra = {}) => post('/api/game', { type, ...extra });

  /* ---------- state ---------- */
  const state = { candies: 0, ends: { daily: 0, wheel: 0, memory: 0 } };
  let spinning = false;
  let memActive = false;

  const left = n => Math.max(0, Math.ceil((state.ends[n] - Date.now()) / 1000));
  const startCd = (n, s) => { state.ends[n] = Date.now() + s * 1000; };
  const fmt = s => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
    return h ? `${h}h ${m}m` : `${m}m ${String(x).padStart(2, '0')}s`;
  };

  function setCandies(n) {
    state.candies = n;
    document.querySelectorAll('[data-candies]').forEach(e => { e.textContent = n.toLocaleString(); });
  }

  async function refresh() {
    const r = await game('state');
    if (r.ok) {
      setCandies(r.data.candies);
      for (const k in r.data.cooldowns) startCd(k, r.data.cooldowns[k]);
    } else {
      toast(r.data.error || 'Could not load your candies.', 'error');
    }
    tick();
  }

  /* ---------- UI primitives ---------- */
  function toast(msg, kind = 'info') {
    let box = $('#toasts');
    if (!box) { box = el('div'); box.id = 'toasts'; box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const t = el('div', `toast ${kind}`, msg);
    box.appendChild(t);
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 4000);
  }

  const openModal = id => { const m = $('#' + id); if (!m) return; m.classList.add('active'); const f = m.querySelector('input, button'); if (f) f.focus(); };
  const closeModal = id => { const m = $('#' + id); if (m) m.classList.remove('active'); };

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  });
  document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal-overlay')) e.target.classList.remove('active');
    const c = e.target.closest && e.target.closest('[data-close]');
    if (c) closeModal(c.dataset.close);
  });

  /* ---------- shared nav + footer ---------- */
  function buildChrome() {
    const page = document.body.dataset.page;
    const nav = $('#site-nav');
    if (nav) {
      nav.className = 'nav';
      const links = [['index.html', 'games', 'Games'], ['shop.html', 'shop', 'Shop'], ['events.html', 'events', 'Events']]
        .map(([href, id, label]) => `<a href="${href}" class="nav-link${page === id ? ' active' : ''}"${page === id ? ' aria-current="page"' : ''}>${label}</a>`).join('');
      nav.innerHTML = `
        <a href="index.html" class="brand-area"><span class="pumpkin-icon" aria-hidden="true">🎃</span><span class="brand-title">ETHEREAL VAULT</span></a>
        <div class="nav-links">${links}</div>
        <div class="coin-badge" title="Your Soul Candies"><span>🍬</span><span class="coin-amount" data-candies>0</span></div>`;
    }
    const foot = $('#site-footer');
    if (foot) foot.innerHTML = `<p>© 2026 Ethereal Radiance · Engineered by <strong>Mikey's Studio</strong></p><p style="margin-top:4px">Candies have no cash value and can only be used inside the Ethereal Radiance Discord.</p>`;
  }

  /* ---------- cooldown buttons ---------- */
  function setBtn(btnId, txtId, name, label, busyLabel) {
    const b = $('#' + btnId); if (!b) return;
    const t = $('#' + txtId);
    const s = left(name);
    const busy = (btnId === 'spinBtn' && spinning) || (btnId === 'memoryBtn' && memActive);
    b.disabled = s > 0 || busy;
    b.textContent = busy ? busyLabel : (s > 0 ? 'Locked ⏳' : label);
    if (t) t.textContent = s > 0 ? `Ready in ${fmt(s)}` : (busy ? '' : 'Ready!');
  }
  function tick() {
    setBtn('dailyBtn', 'dailyTimer', 'daily', 'Harvest 100 🍬', '');
    setBtn('spinBtn', 'spinTimer', 'wheel', 'Spin the Wheel 🌀', 'Spinning…');
    setBtn('memoryBtn', 'memoryTimer', 'memory', 'Start Match 🃏', 'In progress…');
  }

  /* ---------- daily ---------- */
  async function claimDaily() {
    const r = await game('daily');
    if (r.ok) { setCandies(r.data.candies); startCd('daily', 86400); toast('🎃 +100 Soul Candies added to your pouch!', 'success'); }
    else { toast(r.data.error || 'Try again later.', 'error'); await refresh(); }
    tick();
  }

  /* ---------- wheel ---------- */
  let rotation = 0;
  async function spinWheel() {
    if (spinning) return;
    spinning = true; tick();
    const r = await game('wheel');
    if (!r.ok) { spinning = false; toast(r.data.error || 'Could not spin.', 'error'); await refresh(); return; }

    const target = (360 - (r.data.index * 45 + 22.5)) % 360;
    let delta = target - (rotation % 360);
    if (delta < 0) delta += 360;
    rotation += 360 * 6 + delta;
    const wheel = $('#wheelBox');
    if (wheel) wheel.style.transform = `rotate(${rotation}deg)`;

    setTimeout(() => {
      setCandies(r.data.candies);
      startCd('wheel', 600);
      spinning = false;
      toast(r.data.reward ? `🎉 The wheel granted you +${r.data.reward} candies!` : '💀 Bad luck! 0 candies this time.', r.data.reward ? 'success' : 'info');
      tick();
    }, 3600);
  }

  /* ---------- memory match ---------- */
  const ICONS = ['🎃', '👻', '🧙‍♀️', '💀'];
  let cards = [], flipped = [], pairs = 0, evaluating = false;
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  async function startMemory() {
    if (memActive) return;
    const r = await game('memory_start');
    if (!r.ok) { toast(r.data.error || 'Cannot start right now.', 'error'); await refresh(); return; }
    startCd('memory', 300);
    memActive = true; evaluating = false; flipped = []; pairs = 0;
    cards = shuffle([...ICONS, ...ICONS]).map(icon => ({ icon, matched: false }));
    renderMemory(); tick();
  }

  function renderMemory() {
    const grid = $('#memoryGrid'); if (!grid) return;
    grid.replaceChildren();
    cards.forEach((c, i) => {
      const open = c.matched || flipped.includes(i);
      const b = el('button', 'memory-card' + (c.matched ? ' matched' : open ? ' flipped' : ''), open ? c.icon : '❓');
      b.type = 'button';
      b.setAttribute('aria-label', open ? c.icon : 'Hidden card');
      b.addEventListener('click', () => flip(i));
      grid.appendChild(b);
    });
  }

  function flip(i) {
    if (!memActive || evaluating || cards[i].matched || flipped.includes(i)) return;
    flipped.push(i); renderMemory();
    if (flipped.length < 2) return;
    evaluating = true;
    const [a, b] = flipped;
    if (cards[a].icon === cards[b].icon) {
      cards[a].matched = cards[b].matched = true; pairs++; flipped = []; evaluating = false; renderMemory();
      if (pairs === 4) setTimeout(winMemory, 300);
    } else {
      setTimeout(() => {
        flipped = [];
        // Anti-cheat: reshuffle the unmatched cards after every miss
        const idx = cards.map((c, k) => (c.matched ? -1 : k)).filter(k => k >= 0);
        const vals = shuffle(idx.map(k => cards[k].icon));
        idx.forEach((k, n) => { cards[k].icon = vals[n]; });
        evaluating = false; renderMemory();
      }, 900);
    }
  }

  async function winMemory() {
    const r = await game('memory_win');
    memActive = false;
    if (r.ok) { setCandies(r.data.candies); toast('🎉 Spooky pairs cleared! +50 Soul Candies!', 'success'); }
    else toast(r.data.error || 'Could not verify your win.', 'error');
    tick();
  }

  /* ---------- promo ---------- */
  async function redeemPromo() {
    const input = $('#promoInput'), msg = $('#promoMsg'); if (!input || !msg) return;
    const code = input.value.trim();
    if (!code) return;
    const r = await game('promo', { code });
    msg.className = 'msg ' + (r.ok ? 'ok' : 'err');
    if (r.ok) { setCandies(r.data.candies); msg.textContent = `+${r.data.reward} candies added!`; input.value = ''; }
    else msg.textContent = r.data.error || 'Something went wrong.';
  }

  /* ---------- ghost ---------- */
  function initGhost() {
    const g = el('div', null, '👻');
    g.id = 'spookyGhost'; g.setAttribute('role', 'button'); g.setAttribute('aria-label', 'Catch the wandering ghost'); g.tabIndex = 0;
    document.body.appendChild(g);
    let hideT;
    const schedule = () => setTimeout(spawn, 20000 + Math.random() * 30000);
    function spawn() {
      g.style.left = Math.floor(Math.random() * Math.max(40, innerWidth - 70)) + 'px';
      g.style.top = Math.floor(90 + Math.random() * Math.max(40, innerHeight - 180)) + 'px';
      g.style.display = 'block';
      hideT = setTimeout(() => { g.style.display = 'none'; schedule(); }, 5000);
    }
    async function catchIt() {
      clearTimeout(hideT); g.style.display = 'none'; schedule();
      const r = await game('ghost');
      if (r.ok) { setCandies(r.data.candies); toast(`👻 You caught a spirit! +${r.data.loot} candies`, 'success'); }
    }
    g.addEventListener('click', catchIt);
    g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') catchIt(); });
    schedule();
  }

  /* ---------- shop ---------- */
  const CATALOG = [
    { id: 'mist25', icon: '🪙', name: '25 MistCoins', cost: 500, desc: 'Exchange candies for direct server currency added to your Mistbot balance.', kind: 'coin', cta: 'Claim Coins' },
    { id: 'witch', icon: '🧙‍♀️', name: "Witch's Favorite", cost: 500, mc: 25, desc: 'Permanent exclusive Halloween vanity profile role.' },
    { id: 'sweet', icon: '🍭', name: 'Sweet Treat', cost: 500, mc: 25, desc: 'Permanent festive Halloween vanity profile role.' },
    { id: 'ghost', icon: '👻', name: 'Ghostly Guest', cost: 500, mc: 25, desc: 'Permanent phantom ghost vanity profile role.' },
    { id: 'haunted', icon: '🕸️', name: 'Haunted Soul', cost: 500, mc: 25, desc: 'Permanent eerie gothic vanity profile role.' },
    { id: 'reaper', icon: '🎃', name: 'Pumpkin Reaper', cost: 500, mc: 25, desc: 'Permanent elite harvest reaper vanity profile role.' },
    { id: 'cursed', icon: '🎃', name: 'Cursed Luck', cost: 800, mc: 40, desc: 'Permanent role: +1 extra giveaway entry for all Halloween events.' },
    { id: 'phantom', icon: '💀', name: 'Phantom Pass', cost: 800, mc: 40, desc: 'Permanent role: bypass giveaway requirements on all server events.' },
    { id: 'vip', icon: '👻', name: 'Halloween VIP', cost: 2000, mc: 100, desc: 'Ultimate permanent role: +3 extra giveaway entries for all Halloween events.', kind: 'featured', cta: 'Claim VIP' }
  ];
  let selected = null;

  function renderShop() {
    const grid = $('#shopGrid'); if (!grid) return;
    CATALOG.forEach(item => {
      const card = el('div', 'card shop-card' + (item.kind ? ' ' + item.kind : ''));
      const top = el('div');
      top.appendChild(el('span', 'price', `🍬 ${item.cost.toLocaleString()}` + (item.mc ? ` (${item.mc} MC)` : '')));
      top.appendChild(el('h3', null, `${item.icon} ${item.name}`));
      top.appendChild(el('p', null, item.desc));
      const btn = el('button', 'btn btn-pumpkin', item.cta || 'Claim Role');
      btn.type = 'button';
      btn.addEventListener('click', () => startPurchase(item));
      card.append(top, btn);
      grid.appendChild(card);
    });
    $('#confirmBtn')?.addEventListener('click', confirmPurchase);
    $('#copyBtn')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText($('#voucherCodeText').textContent); toast('Code copied!', 'success'); }
      catch { toast('Press and hold the code to copy it.', 'info'); }
    });
    $('#discordUser')?.addEventListener('keydown', e => { if (e.key === 'Enter') confirmPurchase(); });
  }

  function startPurchase(item) {
    if (state.candies < item.cost) { toast(`Not enough candies! You need ${(item.cost - state.candies).toLocaleString()} more.`, 'error'); return; }
    selected = item;
    $('#buyItemDesc').textContent = `${item.icon} ${item.name} for 🍬 ${item.cost.toLocaleString()}`;
    openModal('buyModal');
  }

  async function confirmPurchase() {
    const input = $('#discordUser'), btn = $('#confirmBtn');
    const username = input.value.trim();
    if (username.length < 2) { toast('Please enter your Discord username.', 'error'); return; }
    if (!selected) return;
    btn.disabled = true; btn.textContent = 'Processing…';
    const r = await post('/api/redeem', { username, itemId: selected.id });
    btn.disabled = false; btn.textContent = 'Confirm purchase';
    if (!r.ok) { toast(r.data.error || 'Purchase failed.', 'error'); await refresh(); return; }
    setCandies(r.data.candies);
    closeModal('buyModal');
    $('#claimedItemName').textContent = `${r.data.itemName} for ${username}`;
    $('#voucherCodeText').textContent = r.data.code;
    openModal('voucherModal');
  }

  /* ---------- boot ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    buildChrome();
    $('#dailyBtn')?.addEventListener('click', claimDaily);
    $('#spinBtn')?.addEventListener('click', spinWheel);
    $('#memoryBtn')?.addEventListener('click', startMemory);
    $('#promoBtn')?.addEventListener('click', redeemPromo);
    $('#promoInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') redeemPromo(); });
    renderShop();
    initGhost();
    refresh();
    setInterval(tick, 1000);
  });
})();
