// Shared helpers. Files starting with "_" are NOT exposed as public routes by Vercel.
import crypto from 'crypto';

// Find the Redis REST URL/token no matter what prefix Vercel used when connecting the database.
function findEnv(suffixes) {
  for (const k of Object.keys(process.env)) {
    if (/READ_ONLY/i.test(k)) continue;
    if (suffixes.some(s => k.endsWith(s)) && process.env[k]) return process.env[k];
  }
  return undefined;
}

const REDIS_URL = String(
  process.env.UPSTASH_REDIS_REST_URL ||
  process.env.KV_REST_API_URL ||
  findEnv(['REST_API_URL', 'REST_URL']) ||
  ''
).replace(/\/$/, '');

const REDIS_TOKEN =
  process.env.UPSTASH_REDIS_REST_TOKEN ||
  process.env.KV_REST_API_TOKEN ||
  findEnv(['REST_API_TOKEN', 'REST_TOKEN']);

async function post(url, body) {
  if (!REDIS_URL || !REDIS_TOKEN) {
    // Only variable NAMES are logged, never values.
    console.error('Redis env vars not found. Related names present:',
      Object.keys(process.env).filter(k => /KV|REDIS|UPSTASH|STORAGE/i.test(k)).join(', ') || '(none)');
    throw new Error('Database not configured');
  }
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) console.error('Redis HTTP error', r.status, JSON.stringify(j).slice(0, 200));
  return j;
}

// Run one Redis command, e.g. redis(['HGET', 'key', 'field'])
export async function redis(cmd) {
  const j = await post(REDIS_URL, cmd);
  if (j.error) { console.error('Redis error:', j.error); throw new Error(j.error); }
  return j.result;
}

// Run several commands in one round trip
export async function pipeline(cmds) {
  const j = await post(`${REDIS_URL}/pipeline`, cmds);
  if (!Array.isArray(j)) { console.error('Redis pipeline error:', JSON.stringify(j).slice(0, 200)); throw new Error(j.error || 'Bad pipeline response'); }
  return j.map(x => {
    if (x.error) { console.error('Redis error:', x.error); throw new Error(x.error); }
    return x.result;
  });
}

// The browser keeps a random secret id. We only ever store a hash of it.
export function playerKey(pid) {
  if (typeof pid !== 'string' || !/^[a-f0-9]{32}$/.test(pid)) return null;
  return crypto.createHash('sha256').update(pid).digest('hex').slice(0, 40);
}

// Simple per-IP limiter: `limit` requests per minute
export async function rateLimit(req, limit = 60) {
  const ip = String(req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const [n] = await pipeline([['INCR', key], ['EXPIRE', key, 90]]);
  return n <= limit;
    }
    
