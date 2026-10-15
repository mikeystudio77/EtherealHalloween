// Shop purchases. Price check, spending and the Discord log all happen here.
import crypto from 'crypto';
import { redis, playerKey, rateLimit } from './_lib.js';

// Server-side catalog. The browser cannot change these prices.
const ITEMS = {
  mist25:  { name: '25 MistCoins Voucher', cost: 500 },
  witch:   { name: "Witch's Favorite Role", cost: 500 },
  sweet:   { name: 'Sweet Treat Role', cost: 500 },
  ghost:   { name: 'Ghostly Guest Role', cost: 500 },
  haunted: { name: 'Haunted Soul Role', cost: 500 },
  reaper:  { name: 'Pumpkin Reaper Role', cost: 500 },
  cursed:  { name: 'Cursed Luck (+1 GW Entry)', cost: 800 },
  phantom: { name: 'Phantom Pass (GW Bypass)', cost: 800 },
  vip:     { name: 'Halloween VIP (+3 GW Entries)', cost: 2000 }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await rateLimit(req, 10))) return res.status(429).json({ error: 'Too many requests. Wait a minute.' });

    const { pid, username, itemId } = req.body || {};
    const key = playerKey(pid);
    if (!key) return res.status(400).json({ error: 'Bad request' });

    const item = ITEMS[itemId];
    if (!item) return res.status(400).json({ error: 'Unknown item' });

    const name = String(username || '').replace(/[`@*_~|>\n\r\\]/g, '').trim().slice(0, 32);
    if (name.length < 2) return res.status(400).json({ error: 'Enter a valid Discord username.' });

    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return res.status(500).json({ error: 'Shop is not configured yet.' });

    // Spend first. If the balance goes negative, undo and refuse.
    const hash = `p:${key}`;
    const left = await redis(['HINCRBY', hash, 'candies', -item.cost]);
    if (left < 0) {
      await redis(['HINCRBY', hash, 'candies', item.cost]);
      return res.status(400).json({ error: 'Not enough candies.' });
    }

    const prefix = name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 5) || 'USER';
    const code = `ER-${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    let logged = false;
    try {
      const r = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'Ethereal Vault Logger',
          allowed_mentions: { parse: [] },
          embeds: [{
            title: '🎃 New Web-Shop Purchase',
            color: 16739072,
            fields: [
              { name: '👤 Buyer', value: name, inline: true },
              { name: '🎁 Item', value: item.name, inline: true },
              { name: '🍬 Cost', value: String(item.cost), inline: true },
              { name: '🔑 Ticket Code', value: '```' + code + '```' },
              { name: '🕒 Time', value: new Date().toUTCString() }
            ],
            footer: { text: 'Only honor codes that appear in this channel. Mark as used after rewarding.' }
          }]
        })
      });
      logged = r.ok;
    } catch { /* handled below */ }

    // If staff never got the log, give the candies back.
    if (!logged) {
      await redis(['HINCRBY', hash, 'candies', item.cost]);
      return res.status(502).json({ error: 'Could not reach staff log. You were not charged.' });
    }

    return res.json({ code, itemName: item.name, candies: left });
  } catch (e) {
    return res.status(500).json({ error: 'Server error. Try again in a moment.' });
  }
}
