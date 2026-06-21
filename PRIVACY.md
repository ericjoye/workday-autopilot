# Privacy Policy — Workday Autopilot

**Last updated:** June 20, 2026

## Overview

Workday Autopilot ("we", "our", "the extension") is a Chrome extension that auto-fills and submits Workday job applications with one click. We are committed to protecting your privacy.

## Data Collection

**Workday Autopilot does NOT collect, store, or transmit any personal data to our servers.**

All form-filling and profile management happens locally in your browser. When you use Workday Autopilot:

- **No data is sent to external servers.** Your profile data and form inputs are processed entirely within your browser.
- **No tracking or analytics.** We do not use Google Analytics, Mixpanel, or any other tracking service.
- **No cookies.** Workday Autopilot does not set or read any cookies for tracking purposes.
- **No account required.** There is no signup, login, or user account system.

## Local Storage

The only data stored by Workday Autopilot is kept locally in your browser using Chrome's `chrome.storage.local` API:

- **User profile data** — The information you save for auto-filling Workday forms (e.g., name, contact info, work history). This data never leaves your device.
- **License key** — If you purchase a Pro or Team license, your license key is stored locally.
- **Subscription tier** — Your current plan (Free, Pro, or Team) is stored locally.
- **Extension preferences** — Your settings and preferences for the extension.

This data never leaves your device.

## Permissions

Workday Autopilot requests the following Chrome permissions:

- **activeTab** — To access the currently active tab when you trigger the Autopilot.
- **scripting** — To inject content scripts that detect and fill form fields on Workday pages.
- **storage** — To store your profile data, license key, and preferences locally in your browser.

## Host Permissions

Workday Autopilot requests access to Workday domains (`*.workday.com`, `*.myworkdayjobs.com`) because it needs to detect and fill forms on Workday career sites. This permission is used solely for local form-filling — no data is transmitted to our servers.

## Third-Party Services

Workday Autopilot integrates with **Stripe** for Pro and Team tier payments. When you click an upgrade button, you are redirected to Stripe's hosted checkout page. Stripe's own privacy policy applies to that transaction. Workday Autopilot does not process or store payment information.

## License Keys

If you purchase a Pro or Team license, your license key is stored locally in your browser via `chrome.storage.local`. The extension validates the key format locally. No license key data is sent to any server.

## Changes to This Policy

We may update this privacy policy from time to time. Any changes will be reflected in the extension's listing on the Chrome Web Store and in the extension's source code.

## Contact

If you have questions about this privacy policy, contact us at: [YOUR EMAIL ADDRESS]
