// All game logic lives here, on the server. The browser only asks; the server decides.
import crypto from 'crypto';
import { redis, pipeline, playerKey, rateLimit } from './_lib.js';

const COOLDOWNS = { daily: 86400, wheel: 600, memory: 300, ghost: 15 };
const WHEEL = [0, 15, 30, 50, 75, 100, 125, 150];

// Promo codes come from an environment variable, never from public code.
// Example value:  HALLOWEEN2026:200,MISTY_PEAK:300,ETHEREAL:150
function promoTable() {
  const out = {};
  for (const part of String(process.env.PROMO_CODES || '').split(',')) {
    const [code, amt] = part.split(':');
    const n = parseInt(amt, 10);
    if (code && n > 0) out[code.trim().toUpperCase()] = n;
  }
  return out;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (!(await rateLimit(req, 60))) return res.status(429).json({ error: 'Too many requests. Slow down.' });

    const { pid, type, code } = req.body || {};
    const key = playerKey(pid);
    if (!key) return res.status(400).json({ error: 'Bad request' });

    const hash = `p:${key}`;
    const add = n => redis(['HINCRBY', hash, 'candies', n]);
    const start = name => redis(['SET', `cd:${key}:${name}`, '1', 'NX', 'EX', COOLDOWNS[name]]).then(r => r === 'OK');
    const wait = msg => res.status(429).json({ error: msg });

    switch (type) {
      case 'state': {
        const names = Object.keys(COOLDOWNS);
        const out = await pipeline([
          ['HGET', hash, 'candies'],
          ...names.map(n => ['TTL', `cd:${key}:${n}`])
        ]);
        const cooldowns = {};
        names.forEach((n, i) => { cooldowns[n] = Math.max(0, Number(out[i + 1]) || 0); });
        return res.json({ candies: parseInt(out[0], 10) || 0, cooldowns });
      }

      case 'daily': {
        if (!(await start('daily'))) return wait('Your daily harvest is not ready yet.');
        return res.json({ reward: 100, candies: await add(100) });
      }

      case 'wheel': {
        if (!(await start('wheel'))) return wait('The wheel is still recharging.');
        const index = crypto.randomInt(0, WHEEL.length);
        const reward = WHEEL[index];
        const candies = reward > 0 ? await add(reward) : (parseInt(await redis(['HGET', hash, 'candies']), 10) || 0);
        return res.json({ index, reward, candies });
      }

      case 'ghost': {
        if (!(await start('ghost'))) return wait('The ghost slipped away.');
        const loot = crypto.randomInt(5, 13);
        return res.json({ loot, candies: await add(loot) });
      }

      case 'memory_start': {
        if (!(await start('memory'))) return wait('Card Match is still on cooldown.');
        await redis(['SET', `ms:${key}`, String(Date.now()), 'EX', 900]);
        return res.json({ ok: true });
      }

      case 'memory_win': {
        const t = parseInt(await redis(['GETDEL', `ms:${key}`]), 10);
        if (!t || Date.now() - t < 6000) return res.status(400).json({ error: 'No valid game found.' });
        return res.json({ reward: 50, candies: await add(50) });
      }

      case 'promo': {
        const c = String(code || '').trim().toUpperCase().slice(0, 40);
        const amount = promoTable()[c];
        if (!amount) return res.status(400).json({ error: 'Invalid secret code.' });
        const isNew = await redis(['SADD', `promo:${key}`, c]);
        if (isNew === 0) return res.status(400).json({ error: 'Code already redeemed.' });
        return res.json({ reward: amount, candies: await add(amount) });
      }

      default:
        return res.status(400).json({ error: 'Unknown action' });
    }
  } catch (e) {
    return res.status(500).json({ error: 'Server error. Try again in a moment.' });
  }
}
