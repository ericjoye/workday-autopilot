/**
 * @fileoverview Popup controller for Workday Autopilot.
 * Manages profile form, tier display, license activation, and tab navigation.
 * Communicates with service worker via chrome.runtime.sendMessage.
 * @author Builder Agent
 * @date 2026-06-18
 */

'use strict';

(function () {
  // ── DOM References ────────────────────────────────────────────────────

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const profileForm = $('#profile-form');
  const tierBadge = $('#tier-badge');
  const tierUsage = $('#tier-usage');
  const btnUpgrade = $('#btn-upgrade');
  const btnActivateLicense = $('#btn-activate-license');
  const licenseKeyInput = $('#licenseKey');
  const licenseResult = $('#license-result');
  const linkOptions = $('#link-options');
  const statusText = $('#status-text');
  const workExpList = $('#work-exp-list');
  const btnAddExp = $('#btn-add-exp');

  // ── Initialization ────────────────────────────────────────────────────

  document.addEventListener('DOMContentLoaded', async () => {
    await loadProfile();
    await updateTierDisplay();
    setupTabs();
    setupEventListeners();
  });

  // ── Tab Navigation ────────────────────────────────────────────────────

  function setupTabs() {
    $$('.tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        // Deactivate all tabs
        $$('.tab').forEach((t) => t.classList.remove('active'));
        $$('.tab-content').forEach((c) => c.classList.remove('active'));

        // Activate clicked tab
        tab.classList.add('active');
        const target = tab.getAttribute('data-tab');
        $('#tab-' + target).classList.add('active');
      });
    });
  }

  // ── Event Listeners ───────────────────────────────────────────────────

  function setupEventListeners() {
    // Save Profile
    profileForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveProfile();
    });

    // Upgrade button → switch to license tab
    btnUpgrade.addEventListener('click', () => {
      $$('.tab').forEach((t) => t.classList.remove('active'));
      $$('.tab-content').forEach((c) => c.classList.remove('active'));
      const licenseTab = $$('.tab[data-tab="license"]')[0];
      if (licenseTab) licenseTab.classList.add('active');
      $('#tab-license').classList.add('active');
    });

    // Activate License
    btnActivateLicense.addEventListener('click', async () => {
      await activateLicense();
    });

    // Enter key in license input
    licenseKeyInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await activateLicense();
      }
    });

    // Open Options page
    linkOptions.addEventListener('click', (e) => {
      e.preventDefault();
      if (chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(chrome.runtime.getURL('options/options.html'));
      }
    });

    // Add Work Experience
    btnAddExp.addEventListener('click', () => {
      addWorkExpEntry();
    });
  }

  // ── Profile Management ────────────────────────────────────────────────

  async function loadProfile() {
    try {
      // Try service worker first
      const response = await sendMessage({ action: 'getProfile' });
      const profile = response && response.profile ? response.profile : null;

      if (profile) {
        populateForm(profile);
        setStatus('Profile loaded');
      } else {
        setStatus('No profile saved yet');
      }
    } catch (err) {
      // Fallback: read directly from storage
      console.warn('[Popup] Service worker unavailable, reading storage directly:', err);
      const data = await new Promise((resolve) => {
        chrome.storage.local.get(['wa_profile'], (result) => resolve(result));
      });
      if (data.wa_profile) {
        populateForm(data.wa_profile);
        setStatus('Profile loaded');
      } else {
        setStatus('No profile saved yet');
      }
    }
  }

  function populateForm(profile) {
    const fields = [
      'firstName', 'lastName', 'email', 'phone',
      'address', 'city', 'state', 'zip',
      'linkedinUrl', 'resumeUrl',
    ];

    fields.forEach((field) => {
      const el = $('#' + field);
      if (el && profile[field]) {
        el.value = profile[field];
      }
    });

    // Populate work experience
    if (profile.workExperience && profile.workExperience.length > 0) {
      workExpList.innerHTML = '';
      profile.workExperience.forEach((exp) => addWorkExpEntry(exp));
    }
  }

  async function saveProfile() {
    const profile = {
      firstName: $('#firstName').value.trim(),
      lastName: $('#lastName').value.trim(),
      email: $('#email').value.trim(),
      phone: $('#phone').value.trim(),
      address: $('#address').value.trim(),
      city: $('#city').value.trim(),
      state: $('#state').value.trim().toUpperCase(),
      zip: $('#zip').value.trim(),
      linkedinUrl: $('#linkedinUrl').value.trim(),
      resumeUrl: $('#resumeUrl').value.trim(),
      workExperience: collectWorkExperience(),
    };

    try {
      await sendMessage({ action: 'saveProfile', payload: { profile } });
      setStatus('Profile saved ✓');
    } catch (err) {
      // Fallback: save directly to storage
      console.warn('[Popup] Service worker unavailable, saving to storage directly:', err);
      await new Promise((resolve) => {
        chrome.storage.local.set({ wa_profile: profile }, () => resolve());
      });
      setStatus('Profile saved ✓');
    }

    // Also update tier display (in case profile affects anything)
    await updateTierDisplay();
  }

  // ── Work Experience ───────────────────────────────────────────────────

  function addWorkExpEntry(data) {
    const idx = workExpList.children.length;
    const div = document.createElement('div');
    div.className = 'work-exp-entry';
    div.innerHTML = `
      <div class="work-exp-header">
        <span class="work-exp-number">#${idx + 1}</span>
        <button type="button" class="btn-remove-exp" title="Remove">✕</button>
      </div>
      <div class="form-group">
        <label>Job Title</label>
        <input type="text" class="we-title" placeholder="Software Engineer" value="${escapeHtml(data ? data.title || '' : '')}">
      </div>
      <div class="form-group">
        <label>Company</label>
        <input type="text" class="we-company" placeholder="Acme Corp" value="${escapeHtml(data ? data.company || '' : '')}">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Start</label>
          <input type="text" class="we-start" placeholder="Jan 2020" value="${escapeHtml(data ? data.startDate || '' : '')}">
        </div>
        <div class="form-group">
          <label>End</label>
          <input type="text" class="we-end" placeholder="Present" value="${escapeHtml(data ? data.endDate || '' : '')}">
        </div>
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea class="we-desc" rows="2" placeholder="Brief description...">${escapeHtml(data ? data.description || '' : '')}</textarea>
      </div>
    `;

    div.querySelector('.btn-remove-exp').addEventListener('click', () => {
      div.remove();
      renumberWorkExp();
    });

    workExpList.appendChild(div);
  }

  function renumberWorkExp() {
    $$('.work-exp-entry').forEach((entry, i) => {
      const num = entry.querySelector('.work-exp-number');
      if (num) num.textContent = '#' + (i + 1);
    });
  }

  function collectWorkExperience() {
    const entries = [];
    $$('.work-exp-entry').forEach((entry) => {
      const title = entry.querySelector('.we-title').value.trim();
      const company = entry.querySelector('.we-company').value.trim();
      if (title || company) {
        entries.push({
          title,
          company,
          startDate: entry.querySelector('.we-start').value.trim(),
          endDate: entry.querySelector('.we-end').value.trim(),
          description: entry.querySelector('.we-desc').value.trim(),
        });
      }
    });
    return entries;
  }

  // ── Tier Display ──────────────────────────────────────────────────────

  async function updateTierDisplay() {
    try {
      const tierResponse = await sendMessage({ action: 'getTier' });
      const tier = tierResponse && tierResponse.tier ? tierResponse.tier : 'free';

      const remainingResponse = await sendMessage({ action: 'getRemainingSubmissions' });
      const remaining = remainingResponse ? remainingResponse.remaining : 5;

      const usageResponse = await sendMessage({ action: 'getUsage' });
      const usage = usageResponse || { submissionsThisMonth: 0 };

      // Update badge
      tierBadge.textContent = capitalize(tier);
      tierBadge.className = 'tier-badge tier-' + tier;

      // Update usage text
      if (tier === 'free') {
        tierUsage.textContent = `${usage.submissionsThisMonth}/5 submissions`;
      } else {
        tierUsage.textContent = `${usage.submissionsThisMonth} submissions · ${capitalize(tier)}`;
      }

      // Highlight current tier card
      $$('.tier-card').forEach((card) => {
        card.classList.remove('current');
        if (card.getAttribute('data-tier') === tier) {
          card.classList.add('current');
        }
      });
    } catch (err) {
      console.warn('[Popup] Could not update tier display:', err);
      // Fallback: read directly
      try {
        const data = await new Promise((resolve) => {
          chrome.storage.local.get(['wa_tier', 'wa_usage'], (result) => resolve(result));
        });
        const tier = data.wa_tier || 'free';
        const usage = data.wa_usage || { submissionsThisMonth: 0 };

        tierBadge.textContent = capitalize(tier);
        tierBadge.className = 'tier-badge tier-' + tier;

        if (tier === 'free') {
          tierUsage.textContent = `${usage.submissionsThisMonth}/5 submissions`;
        } else {
          tierUsage.textContent = `${usage.submissionsThisMonth} submissions · ${capitalize(tier)}`;
        }
      } catch (e2) {
        tierBadge.textContent = 'Free';
        tierUsage.textContent = '0/5 submissions';
      }
    }
  }

  // ── License Activation ────────────────────────────────────────────────

  async function activateLicense() {
    const key = licenseKeyInput.value.trim().toUpperCase();

    if (!key) {
      showLicenseResult('Please enter a license key.', 'error');
      return;
    }

    // Show loading state
    btnActivateLicense.disabled = true;
    btnActivateLicense.innerHTML = '<span class="btn-icon">⏳</span> Activating...';
    licenseResult.className = 'license-result';
    licenseResult.textContent = '';

    try {
      const result = await sendMessage({ action: 'setLicense', payload: { key } });

      if (result && result.valid) {
        showLicenseResult(`✓ Activated! You are now on the ${capitalize(result.tier)} plan.`, 'success');
        licenseKeyInput.value = '';
        await updateTierDisplay();
      } else {
        showLicenseResult('✗ Invalid license key. Please check and try again.', 'error');
      }
    } catch (err) {
      console.error('[Popup] License activation error:', err);
      showLicenseResult('✗ Error activating license. Please try again.', 'error');
    } finally {
      btnActivateLicense.disabled = false;
      btnActivateLicense.innerHTML = '<span class="btn-icon">🔑</span> Activate';
    }
  }

  function showLicenseResult(message, type) {
    licenseResult.textContent = message;
    licenseResult.className = 'license-result show ' + type;
  }

  // ── Message Passing ───────────────────────────────────────────────────

  function sendMessage(message) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.error) {
          reject(new Error(response.error));
        } else {
          resolve(response);
        }
      });
    });
  }

  // ── Status Bar ────────────────────────────────────────────────────────

  function setStatus(text) {
    statusText.textContent = text;
    statusText.classList.add('status-flash');
    setTimeout(() => statusText.classList.remove('status-flash'), 1500);
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

  // ── Listen for messages from content script ───────────────────────────

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'submissionComplete') {
      // Update usage display when a submission completes
      updateTierDisplay();
      setStatus('Submission recorded ✓');
      sendResponse({ received: true });
    }
    return true;
  });
})();
