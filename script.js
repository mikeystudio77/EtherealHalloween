// Webhook for #🎃 | web-shop-logs
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1559658470465212457/EX76LajYk-VP6WNa4BvcHq8bQ259rJ9gb7pPOfr9dFjIL1SorqKlNpVqKvTu-NgwnAAG";

// Candies Balance (Shared via localStorage)
let balance = parseInt(localStorage.getItem('er_candies')) || 0;
let selectedItem = null;
let selectedCost = 0;

// Promo Codes
const testPromoCodes = {
  'HALLOWEEN2026': 200,
  'MISTY_PEAK': 300,
  'ETHEREAL': 150
};

function updateDisplay() {
  const badge = document.getElementById('coinBalance');
  if (badge) badge.innerText = balance;
  localStorage.setItem('er_candies', balance);
  checkDailyTimer();
  checkSpinTimer();
}

// Daily Harvest (24h Cooldown)
function claimDaily() {
  const now = Date.now();
  const lastClaim = localStorage.getItem('er_last_claim');
  const cooldown = 24 * 60 * 60 * 1000;

  if (!lastClaim || (now - lastClaim) > cooldown) {
    balance += 100;
    localStorage.setItem('er_last_claim', now);
    updateDisplay();
    alert('🎃 BOO! 100 Soul Candies added to your pouch!');
  }
}

function checkDailyTimer() {
  const lastClaim = localStorage.getItem('er_last_claim');
  const btn = document.getElementById('dailyBtn');
  const timerText = document.getElementById('timerText');
  if (!btn || !timerText) return;

  if (!lastClaim) {
    btn.disabled = false;
    btn.innerText = "Harvest 100 🍬";
    timerText.innerText = "";
    return;
  }

  const now = Date.now();
  const diff = now - lastClaim;
  const cooldown = 24 * 60 * 60 * 1000;

  if (diff < cooldown) {
    btn.disabled = true;
    const remaining = cooldown - diff;
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / 60000);
    btn.innerText = "Harvested Today ✓";
    timerText.innerText = `Next harvest in: ${hours}h${mins}m`;
  } else {
    btn.disabled = false;
    btn.innerText = "Harvest 100 🍬";
    timerText.innerText = "Ready to harvest!";
  }
}

// ==========================================
// 🌀 WHEEL OF SOULS (100% ACCURATE POINTER SYNC)
// ==========================================
let isSpinning = false;
let currentWheelRotation = 0;

// Order of slices matching style.css (i = 0 to 7)
const wheelSegments = [
  { index: 0, reward: 0 },
  { index: 1, reward: 15 },
  { index: 2, reward: 30 },
  { index: 3, reward: 50 },
  { index: 4, reward: 75 },
  { index: 5, reward: 100 },
  { index: 6, reward: 125 },
  { index: 7, reward: 150 }
];

function spinWheel() {
  if (isSpinning) return;
  const now = Date.now();
  const lastSpin = localStorage.getItem('er_last_spin');
  const cooldown = 10 * 60 * 1000;

  if (lastSpin && (now - lastSpin) < cooldown) return;

  isSpinning = true;
  const spinBtn = document.getElementById('spinBtn');
  if (spinBtn) spinBtn.disabled = true;

  // Pick target segment (0 to 7)
  const targetIndex = Math.floor(Math.random() * wheelSegments.length);
  const targetSegment = wheelSegments[targetIndex];

  // Calculate rotation angle to bring slice directly under top arrow
  const targetNormalizedAngle = (360 - (targetIndex * 45 + 22.5)) % 360;
  
  const extraFullSpins = 360 * 6;
  const currentNormalized = currentWheelRotation % 360;
  let delta = targetNormalizedAngle - currentNormalized;
  if (delta < 0) delta += 360;

  currentWheelRotation += extraFullSpins + delta;

  const wheel = document.getElementById('wheelBox');
  if (wheel) wheel.style.transform = `rotate(${currentWheelRotation}deg)`;

  setTimeout(() => {
    balance += targetSegment.reward;
    localStorage.setItem('er_last_spin', Date.now());
    updateDisplay();
    if (targetSegment.reward === 0) {
      alert(`💀 Bad luck! The cursed wheel gave you 0 candies this time.`);
    } else {
      alert(`🎉 The Cursed Wheel granted you +${targetSegment.reward} Soul Candies!`);
    }
    isSpinning = false;
  }, 3600);
}

function checkSpinTimer() {
  if (isSpinning) return;
  const lastSpin = localStorage.getItem('er_last_spin');
  const btn = document.getElementById('spinBtn');
  const timerText = document.getElementById('spinTimerText');
  if (!btn || !timerText) return;

  const cooldown = 10 * 60 * 1000;
  if (!lastSpin) {
    btn.disabled = false;
    btn.innerText = "Spin Wheel 🌀";
    timerText.innerText = "";
    return;
  }

  const diff = Date.now() - lastSpin;
  if (diff < cooldown) {
    btn.disabled = true;
    const mins = Math.floor((cooldown - diff) / 60000);
    const secs = Math.floor(((cooldown - diff) % 60000) / 1000);
    btn.innerText = "Locked ⏳";
    timerText.innerText = `Next spin in: ${mins}m${secs}s`;
  } else {
    btn.disabled = false;
    btn.innerText = "Spin Wheel 🌀";
    timerText.innerText = "Ready to spin!";
  }
}

// Floating Ghost Game
function spawnGhost() {
  const ghost = document.getElementById('spookyGhost');
  if (!ghost) return;

  const maxX = window.innerWidth - 60;
  const maxY = window.innerHeight - 60;
  ghost.style.left = Math.floor(Math.random() * maxX) + 'px';
  ghost.style.top = Math.floor(Math.random() * (maxY - 100) + 80) + 'px';
  ghost.style.display = 'block';

  setTimeout(() => {
    ghost.style.display = 'none';
    scheduleNextGhost();
  }, 5000);
}

function catchGhost() {
  const ghost = document.getElementById('spookyGhost');
  if (ghost) ghost.style.display = 'none';
  const loot = Math.floor(Math.random() * 8) + 5;
  balance += loot;
  updateDisplay();
  alert(`👻 You caught a wandering spirit! +${loot} bonus candies!`);
  scheduleNextGhost();
}

function scheduleNextGhost() {
  const delay = Math.floor(Math.random() * 30000) + 20000;
  setTimeout(spawnGhost, delay);
}

// Shop & Unique User Webhook Logging
function startPurchase(name, cost) {
  if (balance < cost) {
    alert(`Not enough candies! You need ${cost - balance} more.`);
    return;
  }
  selectedItem = name;
  selectedCost = cost;
  document.getElementById('buyItemDesc').innerText = `Item: ${name} (Price: 🍬 ${cost})`;
  document.getElementById('buyModal').classList.add('active');
}

function confirmRedeem() {
  const username = document.getElementById('discordUser').value.trim();
  if (!username) {
    alert('Please enter your Discord username!');
    return;
  }

  balance -= selectedCost;
  updateDisplay();

  // Generate Unique Verification Code per User
  const cleanUser = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5) || "USER";
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const uniqueCode = `ER-${cleanUser}-${rand}`;

  // Direct Log to Discord Webhook
  fetch(DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: "🎃 Ethereal Vault Logger",
      avatar_url: "https://i.imgur.com/8Q5F5gR.png",
      embeds: [{
        title: "🎃 New Web-Shop Purchase Claimed!",
        color: 16739072,
        fields: [
          { name: "👤 Discord Buyer", value: `**${username}**`, inline: true },
          { name: "🎁 Item Redeemed", value: `${selectedItem}`, inline: true },
          { name: "🍬 Candies Spent", value: `${selectedCost} Candies`, inline: true },
          { name: "🔑 Unique Verification Ticket", value: `\`\`\`${uniqueCode}\`\`\``, inline: false },
          { name: "🕒 Log Timestamp", value: new Date().toUTCString(), inline: false }
        ],
        footer: { text: "Verify this exact ticket code in your staff ticket panel." }
      }]
    })
  }).catch(err => console.log('Webhook logging error:', err));

  closeModal('buyModal');
  document.getElementById('claimedItemName').innerText = `Redeemed for ${username}: ${selectedItem}`;
  document.getElementById('voucherCodeText').innerText = uniqueCode;
  document.getElementById('voucherModal').classList.add('active');
}

// Promo Code
function redeemPromo() {
  const input = document.getElementById('promoInput');
  const msg = document.getElementById('promoMsg');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  const redeemed = JSON.parse(localStorage.getItem('er_redeemed_promos') || '[]');

  if (redeemed.includes(code)) {
    msg.style.color = '#ef4444';
    msg.innerText = 'Code already redeemed!';
    return;
  }

  if (testPromoCodes[code]) {
    const reward = testPromoCodes[code];
    balance += reward;
    redeemed.push(code);
    localStorage.setItem('er_redeemed_promos', JSON.stringify(redeemed));
    updateDisplay();
    msg.style.color = '#22c55e';
    msg.innerText = `+${reward} Candies added!`;
    input.value = '';
  } else {
    msg.style.color = '#ef4444';
    msg.innerText = 'Invalid secret code!';
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// Init
window.addEventListener('DOMContentLoaded', () => {
  updateDisplay();
  scheduleNextGhost();
  setInterval(() => {
    checkDailyTimer();
    checkSpinTimer();
  }, 1000);
});
