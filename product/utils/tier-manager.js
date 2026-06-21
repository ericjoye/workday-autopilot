/**
 * @fileoverview Tier management for Workday Autopilot. Handles license validation,
 * usage tracking, and feature gating. All data stored locally via chrome.storage.
 * Adapted from ScrapeFlow tier-manager for job application submission tracking.
 * @author Builder Agent
 * @date 2026-06-18
 */

(function () {
  'use strict';

  const STORAGE_KEYS = {
    LICENSE: 'wa_license',
    TIER: 'wa_tier',
    USAGE: 'wa_usage',
    PROFILE: 'wa_profile',
  };

  const FREE_SUBMISSION_LIMIT = 5;

  // ── Helpers ──────────────────────────────────────────────────────────

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

  // ── Public API ───────────────────────────────────────────────────────

  /**
   * Get the current tier from storage.
   * @returns {Promise<'free'|'pro'|'team'>}
   */
  async function getTier() {
    const data = await getStorage([STORAGE_KEYS.TIER]);
    return data[STORAGE_KEYS.TIER] || 'free';
  }

  /**
   * Set a license key and update the tier accordingly.
   * @param {string} key  License key (PRO-XXXX-XXXX or TEAM-XXXX-XXXX)
   * @returns {Promise<{ tier: string, valid: boolean }>}
   */
  async function setLicense(key) {
    if (!key || typeof key !== 'string') {
      return { tier: 'free', valid: false };
    }

    const trimmed = key.trim().toUpperCase();
    let tier = null;

    // Validate format: PRO-XXXX-XXXX or TEAM-XXXX-XXXX
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
      [STORAGE_KEYS.LICENSE]: trimmed,
      [STORAGE_KEYS.TIER]: tier,
    });

    return { tier, valid: true };
  }

  /**
   * Get current month's usage.
   * @returns {Promise<{ submissionsThisMonth: number, month: string }>}
   */
  async function getUsage() {
    const data = await getStorage([STORAGE_KEYS.USAGE]);
    const usage = data[STORAGE_KEYS.USAGE];
    if (!usage) {
      return { submissionsThisMonth: 0, month: getCurrentMonth() };
    }
    return usage;
  }

  /**
   * Increment the current month's submission usage.
   * @param {number} count  Number of submissions to add (default 1).
   * @returns {Promise<number>}  New total for the month.
   */
  async function incrementUsage(count) {
    const usage = await getUsage();
    const currentMonth = getCurrentMonth();

    // Reset if month changed
    if (usage.month !== currentMonth) {
      usage.submissionsThisMonth = 0;
      usage.month = currentMonth;
    }

    usage.submissionsThisMonth += (count || 1);
    await setStorage({ [STORAGE_KEYS.USAGE]: usage });
    return usage.submissionsThisMonth;
  }

  /**
   * Check if the user can submit another application.
   * @returns {Promise<{ allowed: boolean, reason?: string }>}
   */
  async function canSubmit() {
    const tier = await getTier();

    // Paid tiers: unlimited
    if (tier === 'pro' || tier === 'team') {
      return { allowed: true };
    }

    // Free tier: check submission limit
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

  /**
   * Get remaining submissions for the current month.
   * @returns {Promise<number>}  Remaining submissions (Infinity for paid tiers).
   */
  async function getRemainingSubmissions() {
    const tier = await getTier();
    if (tier !== 'free') return Infinity;

    const usage = await getUsage();
    const currentMonth = getCurrentMonth();
    const submissionsThisMonth = usage.month === currentMonth ? usage.submissionsThisMonth : 0;
    return Math.max(0, FREE_SUBMISSION_LIMIT - submissionsThisMonth);
  }

  /**
   * Reset monthly usage if the month has changed.
   * Call on extension startup.
   */
  async function resetMonthlyUsage() {
    const usage = await getUsage();
    const currentMonth = getCurrentMonth();
    if (usage.month !== currentMonth) {
      await setStorage({
        [STORAGE_KEYS.USAGE]: { submissionsThisMonth: 0, month: currentMonth },
      });
    }
  }

  /**
   * Get the user's stored profile.
   * @returns {Promise<Object|null>}
   */
  async function getProfile() {
    const data = await getStorage([STORAGE_KEYS.PROFILE]);
    return data[STORAGE_KEYS.PROFILE] || null;
  }

  /**
   * Save the user's profile.
   * @param {Object} profile
   */
  async function saveProfile(profile) {
    await setStorage({ [STORAGE_KEYS.PROFILE]: profile });
  }

  // ── Exports ──────────────────────────────────────────────────────────

  window.WorkdayAutopilot = window.WorkdayAutopilot || {};
  window.WorkdayAutopilot.Tiers = {
    getTier,
    setLicense,
    getUsage,
    incrementUsage,
    canSubmit,
    getRemainingSubmissions,
    resetMonthlyUsage,
    getProfile,
    saveProfile,
    FREE_SUBMISSION_LIMIT,
    STORAGE_KEYS,
  };
})();
