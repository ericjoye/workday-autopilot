# Workday Autopilot — Launch Plan

**Product:** Workday Autopilot v0.1.0
**Date:** 2026-06-20
**Status:** QA PASS — ready for Chrome Web Store submission

---

## Launch Channels (priority order)

### 1. Chrome Web Store (PRIMARY — Day 1)
This is the ONLY distribution channel at launch. The extension lives or dies by its CWS listing.

**Actions needed:**
- Submit extension as unlisted (test with 5-10 beta users first)
- Create 5 screenshots + 3 promo images (see store-listing.md)
- Fill in CWS listing form (name, short description, long description, keywords)
- Set pricing: Free (with in-app purchase for Pro/Team via Stripe)
- Publish to "Unlisted" first, then "Public" after 48h beta test

### 2. Product Hunt (Day 3-5)
Best launch day for developer/productivity tools. Target: 500+ upvotes.

**Actions needed:**
- Create Product Hunt account
- Prepare tagline: "Auto-fill Workday job applications with one click"
- Submit as "Product of the Day" (schedule 3-5 days post-CWS-launch)
- Prepare maker comment explaining the problem/solution
- Line up 20+ friends/colleagues for Day 1 upvotes

### 3. Reddit (Day 1-7, organic)
Target subreddits: r/jobsearch, r/cscareerquestions, r/chrome, r/productivity, r/Workday

**Actions needed:**
- Create genuine value posts (not spam) — "I built a Chrome extension that auto-fills Workday applications, here's what I learned"
- Engage in comments, answer questions
- Share the CWS link naturally in relevant threads

### 4. Twitter/X (Day 1-7)
Target audience: job seekers, career coaches, HR tech community

**Actions needed:**
- Tweet thread: "Job applications suck. I built a Chrome extension that fills them for you."
- Tag relevant accounts: @Workday, career coaches, job search influencers
- Post demo video (screen recording of Autopilot filling a form)

### 5. LinkedIn (Day 3-7)
Target: career coaches, recruiters, HR professionals

**Actions needed:**
- Publish article: "How I automated 50 job applications with a Chrome extension"
- Share in relevant LinkedIn groups
- Tag HR tech influencers

### 6. YouTube (Day 7-14)
- 2-minute demo video: "Workday Autopilot — Apply to Jobs in 3 Seconds"
- Tutorial: "How to set up Workday Autopilot"
- SEO-optimized title and description

---

## First-Week Plan

### Day 1 (Launch Day)
- [ ] Submit to Chrome Web Store as UNLISTED
- [ ] Share unlisted link with 5-10 beta testers (friends, colleagues)
- [ ] Post on Reddit r/jobsearch and r/cscareerquestions
- [ ] Tweet launch announcement
- [ ] Monitor for bugs and feedback

### Day 2
- [ ] Collect beta tester feedback
- [ ] Fix any critical issues
- [ ] Post on r/chrome and r/productivity
- [ ] Engage with all comments/tweets
- [ ] Prepare Product Hunt submission

### Day 3
- [ ] Switch CWS listing from Unlisted to Public
- [ ] Submit to Product Hunt (schedule for Day 5)
- [ ] Publish LinkedIn article
- [ ] Post demo video on Twitter

### Day 4
- [ ] Monitor CWS reviews and ratings
- [ ] Respond to all feedback
- [ ] Post on additional subreddits
- [ ] Reach out to 5 career coaches for feedback

### Day 5 (Product Hunt Launch)
- [ ] Go live on Product Hunt at midnight PT
- [ ] Email list of supporters for upvote support
- [ ] Post across all social channels
- [ ] Engage with every comment on PH

### Day 6-7
- [ ] Analyze metrics: installs, activations, submissions, upgrades
- [ ] Write Week 1 retrospective
- [ ] Plan Week 2 content based on what's working
- [ ] Begin YouTube video production

---

## Key Metrics to Track

| Metric | Target (Week 1) |
|---|---|
| Chrome Web Store installs | 500 |
| Active users (opened popup) | 300 |
| Submissions made | 1,000 |
| Pro upgrades | 10 |
| Team upgrades | 2 |
| Product Hunt upvotes | 300 |
| Reddit upvotes (combined) | 200 |
| Twitter impressions | 10,000 |

---

## Human Actions Required (EXACT list)

See ~/hermes_ops/escalations/workday-autopilot.md for the complete list of actions a human must take to actually go live. These are NOT automated — they require real-world accounts, payments, and publishing authority.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Workday updates break field detection | Monitor user reports, push update within 48h |
| Chrome Web Store review rejection | Follow all MV3 guidelines, no external scripts, all permissions justified |
| Low conversion from free to pro | A/B test pricing, consider $9.99 entry tier |
| Negative reviews ("this is cheating") | Frame as "efficiency tool," not "cheat" — user still controls what gets submitted |
| Stripe webhook failures | Fallback: manual license key generation via admin panel |
