# BUILD-REPORT.md — Workday Autopilot Bug Fixes

**Date:** 2026-06-20
**Builder:** BUILDER
**Task:** FIX — 3 bugs found in QA (t_d27d22b0)

---

## Fixes Applied

### BUG-1 [CRITICAL] — Fixed
- **File:** `product/options/options.html` line 321
- **Change:** `maxlength="14"` → `maxlength="16"`
- **Why:** TEAM-XXXX-XXXX keys are 16 characters; the old limit of 14 prevented entry

### BUG-2 [MEDIUM] — Fixed
- **File:** `product/content/content-script.js` function `handleAutopilotClick()`
- **Change:** Wrapped entire function body in try/catch; on error, logs to console and shows error toast: "Autopilot failed. Please try again or reload the page."
- **Why:** Previously, if the service worker was unavailable, the autopilot button silently did nothing

### BUG-3 [MEDIUM] — Fixed
- **File:** `product/content/content-script.js` `fillWorkdayForm()` selects loop
- **Change:** `fillSelect()` return value now checked before incrementing `filledCount`
- **Why:** Previously, `filledCount++` was unconditional, inflating the count when no match was found

### BUG-4 [LOW] — Fixed
- **File:** `product/content/content-script.js` upgrade banner click handler
- **Change:** Added `.catch(() => {})` to `chrome.runtime.sendMessage({ action: 'openOptions' })`
- **Why:** Service worker has no 'openOptions' handler, causing uncaught promise rejection

### CQ-2 [LOW] — Fixed (recommended)
- **File:** `product/manifest.json`
- **Change:** Removed `utils/tier-manager.js` from `content_scripts.js` array
- **Why:** Content script never uses tier-manager.js; it communicates with the service worker via sendMessage. Saves ~207 lines of JS loaded on every Workday page.

---

## Files Changed

1. `product/options/options.html` — maxlength fix
2. `product/content/content-script.js` — 3 fixes (try/catch, fillSelect check, .catch())
3. `product/manifest.json` — removed unused tier-manager.js from content_scripts

## Verification

- `node --check content/content-script.js` — PASS (syntax valid)
- All changes are minimal and targeted; no refactoring or scope creep

## Known / Remaining

- CQ-1 (tier logic duplication between service-worker.js and tier-manager.js) — not addressed; requires architectural consolidation, out of scope for a bug-fix task
- UX-1 (SUBMIT_DELAY = 1500ms may be too short) — not changed; UX concern, not a bug
- CQ-3 (innerHTML with dynamic content in upgrade banner) — low risk; string is currently hardcoded
