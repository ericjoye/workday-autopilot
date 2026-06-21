# Workday Autopilot — Pricing Strategy

## Tiers

### Free — $0/month
- 5 job application submissions per month
- Full profile (9 fields + work experience)
- All Workday career page support
- Chrome Web Store install, no credit card
- **Goal:** Get job seekers hooked. 5 submissions/month is enough to prove value without giving away the farm.

### Pro — $14.99/month
- Unlimited submissions
- Priority email support (24h response)
- Early access to new features
- **Goal:** Main revenue tier. $14.99 is below the "impulse buy" threshold for job seekers actively applying. Cheaper than a single LinkedIn Premium month ($39.99).

### Team — $29/month
- Everything in Pro
- Up to 5 team members (shared profiles)
- Centralized billing
- Career coach / recruiter dashboard (future)
- **Goal:** Capture the recruiter/career coach market. $29/mo for 5 seats is $5.80/seat — competitive with basic ATS tools.

## Rationale

**Why free tier?** Job seekers are price-sensitive. A free tier with a hard limit (not time-limited) creates a natural upgrade path: active job seekers will hit 5 submissions in a week and convert.

**Why $14.99 not $9.99?** $9.99 signals "cheap tool." $14.99 signals "professional tool" while still being affordable. It's also the price point where Stripe's fee structure (2.9% + $0.30) still leaves healthy margins.

**Why no annual discount yet?** At launch, we need monthly cash flow and commitment flexibility for users. Introduce annual plans (20% off) after we have 100+ active subscribers.

## Payment Integration

- **Provider:** Stripe (license key generation model)
- **Flow:** User clicks "Upgrade" in popup → Stripe Checkout → on success, service worker generates license key (PRO-XXXX-XXXX or TEAM-XXXX-XXXX) → stored in chrome.storage.local
- **License format:** PRO-[A-Z0-9]{4}-[A-Z0-9]{4} (14 chars) / TEAM-[A-Z0-9]{4}-[A-Z0-9]{4} (16 chars)
- **Validation:** Regex-checked client-side (tier-manager.js) and server-side (Stripe webhook)
- **No user accounts needed** — license key IS the account. Users paste key in options page to activate.

## Stripe Setup Needed (human action)

1. Create Stripe account (or use existing)
2. Create two products: "Workday Autopilot Pro" ($14.99/mo) and "Workday Autopilot Team" ($29/mo)
3. Set up Stripe Checkout with success/cancel URLs
4. Configure Stripe webhook for payment confirmation
5. Add Stripe publishable key to extension's options page
6. Test full flow: upgrade → checkout → license key → activation
