# Domain Negotiator

A step-by-step AI-powered workflow for acquiring domains you don't own yet.
Covers valuation, opening offer scripts, counter-offer strategy, and closing guidance.
Stages 1-3 are free. Stages 4-5 unlock for $9 per negotiation via Lemon Squeezy.

---

## How the payment flow works

```
User pays $9 on Lemon Squeezy
        ↓
Lemon Squeezy sends webhook → /.netlify/functions/webhook
        ↓
Webhook verifies signature, stores a token in Netlify Blobs
        ↓
Lemon Squeezy redirects user to https://yoursite.com/?order={order_id}
        ↓
Frontend calls /.netlify/functions/verify-token with the order ID
        ↓
Function looks up the token, confirms it's valid and unexpired
        ↓
Frontend stores token in sessionStorage, unlocks stages 4-5
        ↓
PDF guide downloads automatically
```

The API key and webhook secret never appear in frontend code.
Tokens expire after 24 hours. Each token is tied to a single order ID.

---

## Deploy in 6 steps

### 1. Install dependencies
```bash
npm install
```

### 2. Build and verify locally
```bash
npm run build
```
Should complete with no errors.

### 3. Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/domain-negotiator.git
git push -u origin main
```

### 4. Connect to Netlify
1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect GitHub, select this repo
4. Build settings are auto-detected from netlify.toml
5. Click "Deploy site"
6. Note your site URL (e.g. https://amazing-name-123.netlify.app)

### 5. Set up Lemon Squeezy
1. Create an account at https://lemonsqueezy.com
2. Create a store and a new product:
   - Type: Single payment
   - Price: $9
   - Name: "Domain Negotiator — Full Workflow"
3. Under the product's Confirmation modal settings, set the redirect URL to:
   https://YOUR_NETLIFY_SITE.netlify.app/?order={order_number}
   (Lemon Squeezy substitutes {order_number} automatically)
4. Go to Settings → Webhooks → Add webhook:
   - URL: https://YOUR_NETLIFY_SITE.netlify.app/.netlify/functions/webhook
   - Events: check order_created
   - Copy the signing secret shown
5. Note your Product ID from the product URL

### 6. Set environment variables in Netlify
Go to Site configuration → Environment variables and add:

  ANTHROPIC_API_KEY          → Your key from console.anthropic.com
  LEMONSQUEEZY_WEBHOOK_SECRET → The signing secret from step 5
  LEMONSQUEEZY_PRODUCT_ID    → Your product ID from step 5

Then update the checkout link in src/App.jsx:
Find https://YOUR_STORE.lemonsqueezy.com/checkout/buy/YOUR_PRODUCT_ID
and replace with your actual Lemon Squeezy checkout URL.

Trigger a redeploy: Deploys → Trigger deploy → Deploy site.

---

## Add the PDF to your site

Place the PDF in the public/ folder:

  public/
    favicon.svg
    domain-negotiator-guide.pdf   ← add this

Vite copies everything in public/ to dist/ at build time.
The frontend triggers the download automatically when payment is verified.

---

## Testing the payment flow

To test without a real payment, temporarily add this at the top of the
mount effect in App.jsx (remove before going live):

  setUnlocked(true); return;

---

## Project structure

  domain-negotiator/
  ├── index.html
  ├── vite.config.js
  ├── netlify.toml
  ├── package.json
  ├── public/
  │   ├── favicon.svg
  │   └── domain-negotiator-guide.pdf   ← add your PDF here
  ├── src/
  │   ├── main.jsx
  │   └── App.jsx
  └── netlify/
      └── functions/
          ├── claude.mjs           ← proxies Anthropic API
          ├── webhook.mjs          ← receives Lemon Squeezy webhook
          └── verify-token.mjs    ← validates tokens before unlocking

---

## Environment variables

  ANTHROPIC_API_KEY            console.anthropic.com         Required
  LEMONSQUEEZY_WEBHOOK_SECRET  LS dashboard → Webhooks       Required
  LEMONSQUEEZY_PRODUCT_ID      LS product URL                Recommended

---

## Running costs per $9 sale

  Netlify hosting              Free (100GB bandwidth/mo)
  Netlify Blobs                Free tier covers normal volume
  Anthropic API (~5 calls)     ~$0.03
  Lemon Squeezy fee            5% + $0.50
  Net per sale                 ~$8.02

---

## Security notes

- Anthropic API key is server-side only, never in frontend code
- Webhook signature verified with HMAC-SHA256 and timing-safe comparison
- Tokens are double UUIDs — not guessable
- Tokens expire after 24 hours
- sessionStorage used — tokens don't persist across browser sessions
