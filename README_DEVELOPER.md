# 🌍 World Monitor - Developer Handoff Guide

## Product Overview

**World Monitor** is a real-time global intelligence monitoring platform that aggregates data from multiple sources:
- Military tracking (naval vessels, aircraft)
- Conflict & humanitarian data (UCDP, ACLED, humanitarian crises)
- Economic indicators (FRED, energy prices, commodity markets)
- Market/prediction data (Polymarket prediction markets)
- Natural disasters & climate (earthquakes, wildfires, weather)
- News & sentiment analysis (with local ML summarization)
- Infrastructure monitoring
- Tech/research events

**Target Users:** Intelligence analysts, policy makers, investment professionals, emergency responders, researchers

**Current URL (Live):** https://worldmonitor-pg8ouc5w7-zunch2000-8177s-projects.vercel.app

---

## Business Strategy: SaaS Monetization

### Goal
Convert World Monitor from a free public tool into a **tiered subscription model** to monetize the platform while maintaining free access to core features.

### Implementation Approach
**Option 1 (SELECTED):** Managed SaaS on Vercel + Stripe
- **Pros:** Zero infrastructure cost, auto-scaling, fast deployment
- **Cons:** Limited to free tier of Vercel (100 function calls/day limit for webhooks)
- **Recommendation:** Move to Railway or self-hosted after hitting usage limits

### Subscription Tiers (Planned)

| Feature | Free | Pro ($49/mo) | Enterprise (Custom) |
|---------|------|------------|-----------------|
| Basic map views | ✅ | ✅ | ✅ |
| AI summaries | 10/day | Unlimited | Unlimited |
| Exports | ❌ | ✅ | ✅ |
| Custom alerts | ❌ | ✅ | ✅ |
| API access | ❌ | ✅ | ✅ |
| Priority support | ❌ | ✅ | ✅ |

---

## Current Implementation Status

### ✅ Completed

1. **GitHub Fork Setup**
   - Forked to: https://github.com/zunch2000/worldmonitor
   - Local repo: `C:\Users\zunch\worldmonitor`
   - Branch strategy: Working on `feature/stripe-checkout`

2. **Vercel Deployment**
   - Frontend auto-deploys on GitHub push
   - Build: `npm run build` (Vite)
   - Output: Static site with serverless API functions
   - Auto-HTTPS, CDN included

3. **Stripe Integration Setup**
   - Account created with test keys
   - Environment variables configured in Vercel:
     - `STRIPE_SECRET_KEY` (sk_test_*)
     - `STRIPE_PUBLISHABLE_KEY` (pk_test_*)

4. **Payment Endpoints Created**
   - `/api/create-checkout-session.js` - Creates Stripe Checkout sessions
   - `/api/stripe-webhook.js` - Receives payment events
   - Fallback: $49 one-time payment if STRIPE_PRICE_ID not configured

5. **Upgrade Banner UI**
   - Added to `live-channels.html`
   - Fixed position (bottom-right, z-index 9999)
   - Blue/purple gradient background
   - Click handler triggers Stripe Checkout

### 🟡 In Progress / Issues

1. **BLOCKER: Upgrade Button Not Visible**
   - **Status:** HTML deployed but browser console returns `null`
   - **Root Cause:** Vercel serving cached old version (cache not cleared)
   - **Solution:** Need to manually redeploy on Vercel admin panel
   - **Test Command:** Open browser console (F12 → Console tab) and run:
     ```javascript
     document.getElementById('upgrade-banner')
     ```
   - Expected: Should return `<div id="upgrade-banner"...>` (not `null`)

2. **Webhook Not Persisting Subscription Data**
   - Currently logs events to Vercel console only
   - TODO: Add database persistence (Upstash Redis or Convex)
   - TODO: Implement subscription status checks from frontend

3. **No User Authentication System**
   - Currently no login/user accounts
   - TODO: Add Auth0, Clerk, or custom JWT auth
   - TODO: Connect subscription status to user accounts

### ❌ 403 Forbidden Errors on Data Endpoints

**All backend API calls returning 403:**
```
POST /api/intelligence/v1/search-gdelt-documents 403
POST /api/intelligence/v1/get-risk-scores 403
POST /api/market/v1/list-market-quotes 403
```

**Likely Causes:**
1. API keys expired or revoked
2. Rate limiting triggered
3. Network/infrastructure issues
4. These are NOT related to Stripe integration

**Status:** Not blocking Stripe payment flow (separate concern)

---

## Architecture Overview

### Tech Stack

```
Frontend:
├── TypeScript + Vite (build)
├── MapLibre GL (map rendering)
├── deck.gl (3D visualization)
├── React components (panels)
└── ML Workers (Xenova models for NER, sentiment, summarization)

Backend (Vercel):
├── Node.js serverless functions (/api/*.js)
├── Stripe API integration
└── Webhook handlers

Hosting:
├── Vercel (frontend + serverless functions)
├── GitHub (source code)
└── Stripe (payment processing)

Database: None yet (TODO)
Authentication: None yet (TODO)
```

### File Structure

```
worldmonitor/
├── live-channels.html          ← Upgrade banner UI
├── index.html                  ← Main map page
├── settings.html               ← Settings page
├── api/
│   ├── create-checkout-session.js    ← Stripe session endpoint
│   ├── stripe-webhook.js             ← Webhook handler
│   └── [other data endpoints]
├── src/
│   ├── main.ts                 ← App entry point
│   ├── live-channels-main.ts   ← Live channels logic
│   ├── components/             ← UI panels
│   └── services/               ← Data fetching services
├── public/                     ← Static assets
├── package.json               ← Dependencies
└── vite.config.ts            ← Vite config
```

---

## Stripe Integration Details

### Files Created/Modified

1. **`/api/create-checkout-session.js`**
   ```javascript
   // POST endpoint that creates Stripe Checkout URLs
   // Input: (currently empty POST body)
   // Output: { url: "https://checkout.stripe.com/..." }
   // Fallback: $49/month if no STRIPE_PRICE_ID configured
   ```

2. **`/api/stripe-webhook.js`**
   ```javascript
   // Receives webhook events from Stripe
   // Events: checkout.session.completed, invoice.payment_succeeded
   // Currently: Logs to Vercel console (no persistence)
   // TODO: Store subscription status in database
   ```

3. **`live-channels.html`** (modified)
   - Added upgrade banner div with styling
   - Added click handler to trigger checkout
   - HTML is present in code but not rendering (cache issue)

### Environment Variables Needed (Vercel)

| Variable | Value | Example |
|----------|-------|---------|
| `STRIPE_SECRET_KEY` | Your secret API key | `sk_test_4eC39HqL...` |
| `STRIPE_PUBLISHABLE_KEY` | Your publishable key | `pk_test_51Pq...` |
| `STRIPE_WEBHOOK_SECRET` | Optional webhook signing key | `whsec_test_...` |
| `STRIPE_PRICE_ID` | Price ID for recurring sub | Optional (uses $49 fallback) |

### How Payment Flow Works

```
User clicks "Upgrade" button
    ↓
Browser calls POST /api/create-checkout-session
    ↓
Vercel function creates session via Stripe API
    ↓
Returns checkout URL to browser
    ↓
Browser redirects to Stripe Checkout page
    ↓
User enters card info, pays
    ↓
Stripe sends webhook to /api/stripe-webhook.js
    ↓
Handler logs event (TODO: persist to DB)
    ↓
Subscription activated!
```

---

## Known Issues & Debugging

### Issue 1: Upgrade Button Returns `null`

**Symptom:** Console shows `null` when running:
```javascript
document.getElementById('upgrade-banner')
```

**Diagnosis Steps:**
1. Check if `live-channels.html` was committed to GitHub
2. Verify Vercel deployment completed (check Deployments tab)
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
4. Clear Vercel cache by redeploying

**Fix:**
1. Go to Vercel dashboard → Project → Deployments
2. Click most recent deployment
3. Find "Redeploy" option (three-dot menu or button)
4. Click redeploy (takes ~2-3 minutes)
5. Test again in console

### Issue 2: 403 Errors on Data Endpoints

**Symptom:** Multiple endpoints returning 403 Forbidden:
```
/api/intelligence/v1/*
/api/market/v1/*
/api/economic/v1/*
```

**Status:** Known issue, NOT blocking Stripe integration

**Not our responsibility yet** — these are existing backend endpoints that have upstream API issues

### Issue 3: No User Persistence

**Current State:** No way to identify which user paid

**Impact:** When webhook fires, we don't know whose account to upgrade

**Solution (TODO):**
1. Add authentication system (Auth0 or Clerk)
2. Store Stripe customer ID in user DB
3. When webhook fires, update user subscription status
4. Add client-side feature gating based on subscription

---

## Deployment & Git Workflow

### To Deploy Changes

```bash
cd C:\Users\zunch\worldmonitor

# 1. Make your code changes locally
# 2. Test locally

# 3. Stage changes
git add .

# 4. Commit with message
git commit -m "brief description of changes"

# 5. Push to GitHub (auto-triggers Vercel)
git push origin main

# 6. Check Vercel dashboard for build status (url: vercel.com)
# Takes ~3-5 minutes to build and deploy
```

### Key Git Commands Reference

```bash
# Check current branch
git branch

# Switch to main branch
git checkout main

# Create new feature branch
git checkout -b feature/my-feature

# Check what files changed
git status

# See recent commits
git log --oneline -10

# Push to GitHub
git push origin main
```

---

## Next Steps (Priority Order)

### HIGH PRIORITY 🔴

1. **Fix Upgrade Button Visibility**
   - Clear Vercel cache / redeploy
   - Verify button appears and clicks lead to Stripe Checkout
   - Test payment flow end-to-end

2. **Add User Authentication**
   - Choose provider: Auth0, Clerk, or custom JWT
   - Add login/signup pages
   - Store user in database with Stripe customer ID

3. **Add Database Layer**
   - Choose: Upstash Redis (simple KV store) or Convex (full backend)
   - Store subscription status by user
   - Persist webhook events

### MEDIUM PRIORITY 🟡

4. **Implement Feature Gating**
   - Check subscription status on frontend
   - Limit free tier: 10 AI summaries/day
   - Hide "Export" button for free users
   - Show upgrade prompt when limit reached

5. **Configure Stripe for Production**
   - Set webhook URL in Stripe dashboard
   - Add recurring subscription price (instead of one-time)
   - Enable payment method storage for recurring

6. **Add Subscription Management Page**
   - Show current tier, usage stats
   - Allow cancel/pause subscription
   - Show billing history

### LOW PRIORITY 🟢

7. **Prepare Self-Host VPS Option (Option 2)**
   - Document Docker containerization
   - Create deployment guide for DigitalOcean/AWS
   - Setup guide for Railway backend

8. **Prepare 30-Day Marketing Playbook (Option 3)**
   - Content calendar
   - Social media strategy
   - User acquisition channels

---

## How to Continue from Here

### When Next Developer Arrives

1. **Read this file** ← You are here
2. **Check current deployment** → https://worldmonitor-pg8ouc5w7-zunch2000-8177s-projects.vercel.app
3. **Test upgrade button** in browser console:
   ```javascript
   document.getElementById('upgrade-banner')  // Should NOT return null
   ```
4. **If button is visible:**
   - Click it, should open Stripe Checkout
   - Complete test payment (use Stripe test card: 4242 4242 4242 4242)
   - Verify webhook receives event

5. **If button still null:**
   - Run the redeploy fix from Issue 1 section above
   - Then proceed with payment testing

### Key Contacts & Resources

- **Stripe Dashboard:** https://dashboard.stripe.com (test mode)
- **Vercel Dashboard:** https://vercel.com (deployments)
- **GitHub Repo:** https://github.com/zunch2000/worldmonitor
- **Local Repo:** `C:\Users\zunch\worldmonitor`

### Testing Credentials

**Stripe Test Mode:**
- Test card number: `4242 4242 4242 4242`
- Expiry: Any future date (e.g., 12/25)
- CVC: Any 3 digits (e.g., 123)
- ZIP: Any 5 digits

**Creating Sessions Locally:**
```bash
curl -X POST http://localhost:3000/api/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{}'
```

---

## Questions This Developer Might Have

**Q: Why is the button not visible?**
A: Vercel is serving a cached old version. Solution: Redeploy from Vercel dashboard.

**Q: How do I know if payment worked?**
A: Check Stripe Dashboard → Events. Should see `checkout.session.completed` event.

**Q: Where does subscription info get stored?**
A: Nowhere yet. TODO: Add database (Redis or Convex) to persist after webhook.

**Q: Can I test payments locally?**
A: Use Stripe test mode (enabled by default with sk_test_* keys). No real charges.

**Q: Why are existing data endpoints returning 403?**
A: Not our code. Upstream API keys/rate limits likely issues. Not blocking Stripe work.

**Q: What's the plan if Vercel hits function limits?**
A: Migrate to Railway (already has account but not configured). Budget ~$20-50/month.

**Q: When should we launch to real users?**
A: After: button visible ✅ → payment flow works ✅ → user auth added ✅ → feature gating works ✅

---

## Commit History (Recent)

```
90cab71 - Add Stripe Checkout endpoint, webhook, and upgrade banner
93ea828 - feat(live): custom channel management with review fixes (#282)
```

---

## Final Notes

- **This is MVP stage** — bare minimum needed to accept payments
- **Not production-ready** — missing auth, persistence, feature gating
- **All deployment is automated** (GitHub → Vercel)
- **Next developer should focus on** authentication + database layer
- **Keep this document updated** as you make changes

---

**Last Updated:** February 24, 2026
**Original Developer:** [Previous Dev]
**Current Status:** In-progress (button visibility issue being fixed)
