/**
 * @fileoverview Options page controller for Workday Autopilot.
 * Handles license activation, tier display, and usage stats.
 * Uses tier-manager.js (loaded via script tag) for data access.
 * @author Builder Agent
 * @date 2026-06-18
 */

'use strict';

(function () {
  // ── DOM References ────────────────────────────────────────────────────

  const licenseInput = document.getElementById('licenseInput');
  const btnActivate = document.getElementById('btnActivate');
  const licenseMessage = document.getElementById('licenseMessage');
  const currentLicenseDisplay = document.getElementById('currentLicenseDisplay');
  const currentTierValue = document.getElementById('currentTierValue');
  const currentUsageValue = document.getElementById('currentUsageValue');
  const usageBarFill = document.getElementById('usageBarFill');
  const usageBarText = document.getElementById('usageBarText');
  const tierTable = document.getElementById('tierTable');

  // ── Initialization ────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    await updateDisplay();
    setupEventListeners();
  });

  // ── Event Listeners ───────────────────────────────────────────────────

  function setupEventListeners() {
    // Activate button click
    btnActivate.addEventListener('click', async () => {
      await handleActivate();
    });

    // Enter key in license input
    licenseInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await handleActivate();
      }
    });

    // Auto-format license input (add dash after PRO/TEAM)
    licenseInput.addEventListener('input', (e) => {
      let val = e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');

      // Auto-insert dashes
      if (val.length > 4 && val[4] !== '-' && val.startsWith('PRO')) {
        val = val.slice(0, 4) + '-' + val.slice(4);
      } else if (val.length > 5 && val[5] !== '-' && val.startsWith('TEAM')) {
        val = val.slice(0, 5) + '-' + val.slice(5);
      }
      if (val.length > 9 && val[9] !== '-') {
        val = val.slice(0, 9) + '-' + val.slice(9);
      }

      // Max length: PRO-XX-XX (14) or TEAM-XX-XX (16)
      if (val.startsWith('TEAM')) {
        val = val.slice(0, 16);
      } else {
        val = val.slice(0, 14);
      }

      e.target.value = val;
    });
  }

  // ── License Activation ────────────────────────────────────────────────

  async function handleActivate() {
    const key = licenseInput.value.trim().toUpperCase();

    if (!key) {
      showMessage('Please enter a license key.', 'error');
      return;
    }

    // Validate format before sending
    const proPattern = /^PRO-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    const teamPattern = /^TEAM-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

    if (!proPattern.test(key) && !teamPattern.test(key)) {
      showMessage('Invalid format. Use PRO-XXXX-XXXX or TEAM-XXXX-XXXX.', 'error');
      return;
    }

    // Show loading state
    btnActivate.disabled = true;
    btnActivate.textContent = 'Activating...';
    licenseMessage.className = 'license-message';
    licenseMessage.textContent = '';

    try {
      // Use tier-manager.js API directly (loaded via script tag)
      const Tiers = window.WorkdayAutopilot && window.WorkdayAutopilot.Tiers;
      if (!Tiers) {
        throw new Error('Tier manager not loaded. Please refresh the page.');
      }

      const result = await Tiers.setLicense(key);

      if (result && result.valid) {
        showMessage(
          `✓ Activated! You are now on the ${capitalize(result.tier)} plan.`,
          'success'
        );
        licenseInput.value = '';
        await updateDisplay();
      } else {
        showMessage('✗ Invalid license key. Please check and try again.', 'error');
      }
    } catch (err) {
      console.error('[Options] License activation error:', err);
      showMessage('✗ Error activating license. Please try again.', 'error');
    } finally {
      btnActivate.disabled = false;
      btnActivate.textContent = 'Activate';
    }
  }

  function showMessage(text, type) {
    licenseMessage.textContent = text;
    licenseMessage.className = 'license-message ' + type;

    // Auto-clear success messages after 5 seconds
    if (type === 'success') {
      setTimeout(() => {
        if (licenseMessage.textContent === text) {
          licenseMessage.textContent = '';
          licenseMessage.className = 'license-message';
        }
      }, 5000);
    }
  }

  // ── Display Update ────────────────────────────────────────────────────

  async function updateDisplay() {
    const Tiers = window.WorkdayAutopilot && window.WorkdayAutopilot.Tiers;
    if (!Tiers) {
      console.warn('[Options] Tier manager not loaded yet');
      return;
    }

    try {
      // Get tier
      const tier = await Tiers.getTier();
      currentTierValue.textContent = capitalize(tier);
      currentTierValue.className = 'tier-status-value tier-' + tier;

      // Get usage
      const usage = await Tiers.getUsage();
      const submissions = usage.submissionsThisMonth || 0;

      // Get remaining
      const remaining = await Tiers.getRemainingSubmissions();

      // Update usage display
      if (tier === 'free') {
        currentUsageValue.textContent = `${submissions} / ${Tiers.FREE_SUBMISSION_LIMIT}`;
        const pct = Math.min(100, (submissions / Tiers.FREE_SUBMISSION_LIMIT) * 100);
        usageBarFill.style.width = pct + '%';
        usageBarFill.className = 'usage-bar-fill' + (pct >= 100 ? ' full' : '');
        usageBarText.textContent = `${submissions} of ${Tiers.FREE_SUBMISSION_LIMIT} used · ${remaining} remaining`;
      } else {
        currentUsageValue.textContent = `${submissions} (Unlimited)`;
        usageBarFill.style.width = '0%';
        usageBarFill.className = 'usage-bar-fill';
        usageBarText.textContent = `${submissions} submissions this month · Unlimited plan`;
      }

      // Highlight current tier in table
      if (tierTable) {
        const rows = tierTable.querySelectorAll('tbody tr');
        rows.forEach((row) => {
          row.classList.remove('current-tier');
        });
        // Map tier to row highlight (just highlight the tier name column)
        const tierIndex = { free: 0, pro: 1, team: 2 };
        // We highlight the whole row set for the current tier column
        // Actually, let's add a class to the table to style the column
        tierTable.setAttribute('data-current-tier', tier);
      }

      // Show current license if any
      const licenseData = await new Promise((resolve) => {
        chrome.storage.local.get(['wa_license'], (result) => resolve(result));
      });
      if (licenseData.wa_license) {
        currentLicenseDisplay.innerHTML =
          'Active license: <code>' + escapeHtml(licenseData.wa_license) + '</code>';
      } else {
        currentLicenseDisplay.textContent = '';
      }
    } catch (err) {
      console.error('[Options] Error updating display:', err);
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────

  function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
})();
