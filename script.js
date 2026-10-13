// Webhook for #🎃 | web-shop-logs
const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1559658470465212457/EX76LajYk-VP6WNa4BvcHq8bQ259rJ9gb7pPOfr9dFjIL1SorqKlNpVqKvTu-NgwnAAG";

// Candies Balance Engine (Shared via localStorage)
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
  localStorage.setItem('er_candies', balance.toString());
  checkDailyTimer();
  checkSpinTimer();
  checkMemoryTimer();
}

// ==========================================
// 🍬 DAILY HARVEST (EXPLOIT & RELOAD PROOF)
// ==========================================
function claimDaily() {
  const now = Date.now();
  const lastClaim = parseInt(localStorage.getItem('er_last_claim')) || 0;
  const cooldown = 24 * 60 * 60 * 1000;

  // Strict check: cooldown active toh block
  if (lastClaim && (now - lastClaim) < cooldown) {
    alert('⏳ Daily harvest already claimed! Please wait for cooldown.');
    checkDailyTimer();
    return;
  }

  // Pehle lock state save karo
  localStorage.setItem('er_last_claim', now.toString());
  balance += 100;
  updateDisplay();
  alert('🎃 BOO! 100 Soul Candies added to your pouch!');
}

function checkDailyTimer() {
  const lastClaim = parseInt(localStorage.getItem('er_last_claim')) || 0;
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
// 🎁 PROMO CODE (STRICT DUPLICATE LOCK)
// ==========================================
function redeemPromo() {
  const input = document.getElementById('promoInput');
  const msg = document.getElementById('promoMsg');
  if (!input || !msg) return;

  const code = input.value.trim().toUpperCase();
  if (!code) return;

  let redeemed = [];
  try {
    redeemed = JSON.parse(localStorage.getItem('er_redeemed_promos')) || [];
  } catch (e) {
    redeemed = [];
  }

  // Reload exploit lock: already claimed check
  if (redeemed.includes(code)) {
    msg.style.color = '#ef4444';
    msg.innerText = 'Code already redeemed on this browser!';
    return;
  }

  if (testPromoCodes[code]) {
    const reward = testPromoCodes[code];
    redeemed.push(code);
    localStorage.setItem('er_redeemed_promos', JSON.stringify(redeemed));
    balance += reward;
    updateDisplay();
    msg.style.color = '#22c55e';
    msg.innerText = `+${reward} Candies added!`;
    input.value = '';
  } else {
    msg.style.color = '#ef4444';
    msg.innerText = 'Invalid secret code!';
  }
}

// ==========================================
// 🌀 WHEEL OF SOULS
// ==========================================
let isSpinning = false;
let currentWheelRotation = 0;

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
  const lastSpin = parseInt(localStorage.getItem('er_last_spin')) || 0;
  const cooldown = 10 * 60 * 1000;

  if (lastSpin && (now - lastSpin) < cooldown) {
    alert('⏳ Wheel is cooling down!');
    checkSpinTimer();
    return;
  }

  isSpinning = true;
  const spinBtn = document.getElementById('spinBtn');
  if (spinBtn) spinBtn.disabled = true;

  const targetIndex = Math.floor(Math.random() * wheelSegments.length);
  const targetSegment = wheelSegments[targetIndex];

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
    localStorage.setItem('er_last_spin', Date.now().toString());
    updateDisplay();
    if (targetSegment.reward === 0) {
      alert('💀 Bad luck! The cursed wheel gave you 0 candies this time.');
    } else {
      alert(`🎉 The Cursed Wheel granted you +${targetSegment.reward} Soul Candies!`);
    }
    isSpinning = false;
  }, 3600);
}

function checkSpinTimer() {
  if (isSpinning) return;
  const lastSpin = parseInt(localStorage.getItem('er_last_spin')) || 0;
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

// ==========================================
// 🃏 MEMORY CARD MATCH
// ==========================================
const memoryIcons = ['🎃', '👻', '🧙‍♀️', '💀'];
let cardState = [];
let flippedIndices = [];
let matchedPairs = 0;
let isMemoryActive = false;
let isEvaluating = false;

function initMemoryGame() {
  const now = Date.now();
  const lastPlayed = parseInt(localStorage.getItem('er_last_memory')) || 0;
  const cooldown = 5 * 60 * 1000;

  if (lastPlayed && (now - lastPlayed) < cooldown) {
    alert('⏳ Memory match is cooling down!');
    checkMemoryTimer();
    return;
  }

  flippedIndices = [];
  matchedPairs = 0;
  isMemoryActive = true;
  isEvaluating = false;

  const rawIcons = [...memoryIcons, ...memoryIcons].sort(() => Math.random() - 0.5);
  cardState = rawIcons.map((icon, idx) => ({
    id: idx,
    icon: icon,
    matched: false
  }));

  renderMemoryGrid();

  const btn = document.getElementById('memoryBtn');
  if (btn) btn.disabled = true;
}

function renderMemoryGrid() {
  const grid = document.getElementById('memoryGrid');
  if (!grid) return;
  grid.innerHTML = '';

  cardState.forEach((item, index) => {
    const card = document.createElement('div');
    card.classList.add('memory-card');
    card.dataset.index = index;

    if (item.matched) {
      card.classList.add('matched');
      card.innerText = item.icon;
    } else if (flippedIndices.includes(index)) {
      card.classList.add('flipped');
      card.innerText = item.icon;
    } else {
      card.innerText = '❓';
    }

    card.onclick = () => handleMemoryClick(index);
    grid.appendChild(card);
  });
}

function handleMemoryClick(index) {
  if (!isMemoryActive || isEvaluating) return;
  if (cardState[index].matched || flippedIndices.includes(index)) return;

  flippedIndices.push(index);
  renderMemoryGrid();

  if (flippedIndices.length === 2) {
    isEvaluating = true;
    const [firstIdx, secondIdx] = flippedIndices;
    const card1 = cardState[firstIdx];
    const card2 = cardState[secondIdx];

    if (card1.icon === card2.icon) {
      card1.matched = true;
      card2.matched = true;
      matchedPairs++;
      flippedIndices = [];
      isEvaluating = false;
      renderMemoryGrid();

      if (matchedPairs === 4) {
        setTimeout(() => {
          balance += 50;
          localStorage.setItem('er_last_memory', Date.now().toString());
          updateDisplay();
          alert('🎉 Spooky Pairs Cleared! +50 Soul Candies added!');
          isMemoryActive = false;
          checkMemoryTimer();
        }, 300);
      }
    } else {
      setTimeout(() => {
        flippedIndices = [];
        shuffleUnmatchedCards();
        isEvaluating = false;
        renderMemoryGrid();
      }, 900);
    }
  }
}

function shuffleUnmatchedCards() {
  const unmatchedIndices = [];
  const unmatchedValues = [];

  cardState.forEach((item, idx) => {
    if (!item.matched) {
      unmatchedIndices.push(idx);
      unmatchedValues.push(item.icon);
    }
  });

  unmatchedValues.sort(() => Math.random() - 0.5);

  unmatchedIndices.forEach((gridIdx, i) => {
    cardState[gridIdx].icon = unmatchedValues[i];
  });
}

function checkMemoryTimer() {
  const lastPlayed = parseInt(localStorage.getItem('er_last_memory')) || 0;
  const btn = document.getElementById('memoryBtn');
  const timerText = document.getElementById('memoryTimerText');
  if (!btn || !timerText) return;

  const cooldown = 5 * 60 * 1000;
  if (!lastPlayed) {
    if (!isMemoryActive) {
      btn.disabled = false;
      btn.innerText = "Start Match 🃏";
    }
    timerText.innerText = "";
    return;
  }

  const diff = Date.now() - lastPlayed;
  if (diff < cooldown) {
    btn.disabled = true;
    const mins = Math.floor((cooldown - diff) / 60000);
    const secs = Math.floor(((cooldown - diff) % 60000) / 1000);
    btn.innerText = "Locked ⏳";
    timerText.innerText = `Next match in: ${mins}m${secs}s`;
  } else {
    if (!isMemoryActive) {
      btn.disabled = false;
      btn.innerText = "Start Match 🃏";
    }
    timerText.innerText = "Ready to play!";
  }
}

// ==========================================
// 👻 GHOST CLICKER
// ==========================================
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

// ==========================================
// 🛒 SHOP & WEBHOOK LOGGING
// ==========================================
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

  const cleanUser = username.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 5) || "USER";
  const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
  const uniqueCode = `ER-${cleanUser}-${rand}`;

  // Log to Discord Webhook
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
        footer: { text: "Verify this ticket code in staff logs." }
      }]
    })
  }).catch(err => console.log('Webhook logging error:', err));

  closeModal('buyModal');
  document.getElementById('claimedItemName').innerText = `Redeemed for ${username}: ${selectedItem}`;
  document.getElementById('voucherCodeText').innerText = uniqueCode;
  document.getElementById('voucherModal').classList.add('active');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('active');
}

// Auto Init on Page Load
window.addEventListener('DOMContentLoaded', () => {
  updateDisplay();
  scheduleNextGhost();
  setInterval(() => {
    checkDailyTimer();
    checkSpinTimer();
    checkMemoryTimer();
  }, 1000);
});
                            
