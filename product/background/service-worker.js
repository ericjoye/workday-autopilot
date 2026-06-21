/**
 * @fileoverview Background service worker for Workday Autopilot.
 * Handles tier management, license validation, profile storage,
 * and usage tracking via message passing.
 * @author Builder Agent
 * @date 2026-06-18
 */

'use strict';

// ── Install Handler ────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Initialize default tier and empty profile on first install
    const data = await new Promise((resolve) => {
      chrome.storage.local.get(null, (result) => resolve(result));
    });

    const updates = {};
    if (!data.wa_tier) {
      updates.wa_tier = 'free';
    }
    if (!data.wa_usage) {
      updates.wa_usage = { submissionsThisMonth: 0, month: getCurrentMonth() };
    }
    if (!data.wa_profile) {
      updates.wa_profile = {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        resumeUrl: '',
        linkedinUrl: '',
        workExperience: [],
      };
    }

    if (Object.keys(updates).length > 0) {
      await new Promise((resolve) => {
        chrome.storage.local.set(updates, () => resolve());
      });
    }

    console.log('[Workday Autopilot] Initialized with free tier.');
  }

  // Reset monthly usage on every update/start
  await resetMonthlyUsage();
});

// ── Message Handler ────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => {
      console.error('[Workday Autopilot] Message error:', err);
      sendResponse({ error: err.message });
    });
  return true; // Keep channel open for async response
});

async function handleMessage(message) {
  const { action, payload } = message;

  switch (action) {
    case 'getTier':
      return { tier: await getTier() };

    case 'setLicense': {
      const result = await setLicense(payload.key);
      return result;
    }

    case 'getProfile':
      return { profile: await getProfile() };

    case 'saveProfile':
      await saveProfile(payload.profile);
      return { success: true };

    case 'getUsage':
      return await getUsage();

    case 'incrementUsage': {
      const newTotal = await incrementUsage(payload.count || 1);
      return { submissionsThisMonth: newTotal };
    }

    case 'canSubmit':
      return await canSubmit();

    case 'getRemainingSubmissions':
      return { remaining: await getRemainingSubmissions() };

    case 'resetMonthlyUsage':
      await resetMonthlyUsage();
      return { success: true };

    default:
      throw new Error(`Unknown action: ${action}`);
  }
}

// ── Storage Helpers ───────────────────────────────────────────────────

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function getStorage(keys) {
  return new Promise((resolve) => {
    chrome.storage.local.get(keys, (result) => resolve(result));
  });
}

function setStorage(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set(data, () => resolve());
  });
}

// ── Tier / License ────────────────────────────────────────────────────

const FREE_SUBMISSION_LIMIT = 5;

async function getTier() {
  const data = await getStorage(['wa_tier']);
  return data.wa_tier || 'free';
}

async function setLicense(key) {
  if (!key || typeof key !== 'string') {
    return { tier: 'free', valid: false };
  }

  const trimmed = key.trim().toUpperCase();
  let tier = null;

  const proPattern = /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
  const teamPattern = /^TEAM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

  if (proPattern.test(trimmed)) {
    tier = 'pro';
  } else if (teamPattern.test(trimmed)) {
    tier = 'team';
  }

  if (!tier) {
    return { tier: 'free', valid: false };
  }

  await setStorage({
    wa_license: trimmed,
    wa_tier: tier,
  });

  return { tier, valid: true };
}

// ── Usage ──────────────────────────────────────────────────────────────

async function getUsage() {
  const data = await getStorage(['wa_usage']);
  const usage = data.wa_usage;
  if (!usage) {
    return { submissionsThisMonth: 0, month: getCurrentMonth() };
  }
  return usage;
}

async function incrementUsage(count) {
  const usage = await getUsage();
  const currentMonth = getCurrentMonth();

  if (usage.month !== currentMonth) {
    usage.submissionsThisMonth = 0;
    usage.month = currentMonth;
  }

  usage.submissionsThisMonth += (count || 1);
  await setStorage({ wa_usage: usage });
  return usage.submissionsThisMonth;
}

async function canSubmit() {
  const tier = await getTier();

  if (tier === 'pro' || tier === 'team') {
    return { allowed: true };
  }

  const usage = await getUsage();
  const currentMonth = getCurrentMonth();
  const submissionsThisMonth = usage.month === currentMonth ? usage.submissionsThisMonth : 0;

  if (submissionsThisMonth >= FREE_SUBMISSION_LIMIT) {
    return {
      allowed: false,
      reason: `Free tier limit reached (${submissionsThisMonth}/${FREE_SUBMISSION_LIMIT} submissions). Upgrade to Pro for unlimited.`,
    };
  }

  return { allowed: true };
}

async function getRemainingSubmissions() {
  const tier = await getTier();
  if (tier !== 'free') return Infinity;

  const usage = await getUsage();
  const currentMonth = getCurrentMonth();
  const submissionsThisMonth = usage.month === currentMonth ? usage.submissionsThisMonth : 0;
  return Math.max(0, FREE_SUBMISSION_LIMIT - submissionsThisMonth);
}

async function resetMonthlyUsage() {
  const usage = await getUsage();
  const currentMonth = getCurrentMonth();
  if (usage.month !== currentMonth) {
    await setStorage({
      wa_usage: { submissionsThisMonth: 0, month: currentMonth },
    });
  }
}

// ── Profile ───────────────────────────────────────────────────────────

async function getProfile() {
  const data = await getStorage(['wa_profile']);
  return data.wa_profile || null;
}

async function saveProfile(profile) {
  await setStorage({ wa_profile: profile });
}

// ── Tab Update Handler ────────────────────────────────────────────────

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const isWorkday =
      tab.url.includes('.workday.com') ||
      tab.url.includes('.myworkdayjobs.com');

    if (isWorkday) {
      chrome.action.setBadgeText({ text: 'ON', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});
