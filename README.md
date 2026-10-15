# Ethereal Vault v2: setup (about 10 minutes)

## What changed
- Candies, cooldowns, wheel results, promo codes and shop prices now live on the **server** (Vercel functions + Redis). Editing the browser console no longer gives candies.
- The Discord webhook is **never in public code**. It's an environment variable.
- Ticket codes are created by the server, and the staff log is written by the server only. A fake code won't be in the log channel.
- Promo codes are no longer visible in the page source.
- Cleaner design, shared nav/footer, no more `alert()` popups, keyboard and mobile friendly.

## Files
```
index.html  shop.html  events.html
style.css   app.js     bg.jpg   (keep your existing bg.jpg)
package.json
.gitignore
api/_lib.js  api/game.js  api/redeem.js
```
Delete your old `script.js`. It's replaced by `app.js`.

## Steps
1. **Rotate secrets**: make a NEW Discord webhook (the old one is burned).
2. **Add a database** (free): Vercel dashboard → your project → *Storage* → *Create / Connect* → **Upstash Redis**. Connect it to the project. This auto-adds the Redis environment variables.
3. In Vercel → *Settings → Environment Variables*, add:
   - `DISCORD_WEBHOOK_URL` = your new webhook URL
   - `PROMO_CODES` = `HALLOWEEN2026:200,MISTY_PEAK:300,ETHEREAL:150` (change these, since the old ones were public)
4. Upload everything to GitHub (replace old files, keep `bg.jpg`), push, and Vercel redeploys.
5. **Redeploy once more** after adding the env vars so they take effect.

## Staff workflow
- Players get a ticket code like `ER-MIKEY-1A2B3C4D` after buying.
- Only honor codes that appear in your log channel, and mark them used after rewarding.

## Known limits (next steps)
- Players are identified by a random id stored in their browser, so clearing site data creates a "new player". The next upgrade is **Login with Discord**, which makes candies tied to a real account and stops alt-farming.
- Never commit `.env` files or paste webhook URLs into any chat or file.
