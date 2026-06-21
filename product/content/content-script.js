/**
 * @fileoverview Content script for Workday Autopilot.
 * Detects Workday form fields, auto-fills them from stored profile,
 * and auto-submits the application. Shows toast notifications and
 * respects tier limits.
 * @author Builder Agent
 * @date 2026-06-18
 */

'use strict';

(function () {
  // ── Constants ────────────────────────────────────────────────────────

  const TOAST_DURATION = 4000;
  const SUBMIT_DELAY = 1500; // Delay before auto-submit to let user review
  const FILLED_FIELD_CLASS = 'wa-filled';
  const WORKDAY_SUBMIT_PATTERNS = /submit|next|apply|continue/i;

  // ── State ────────────────────────────────────────────────────────────

  let toastEl = null;
  let upgradeBannerEl = null;

  // ── Initialization ───────────────────────────────────────────────────

  init();

  function init() {
    // Only run on Workday pages with forms
    if (!document.querySelector('form, input, select, textarea')) {
      return;
    }

    console.log('[Workday Autopilot] Content script loaded on Workday page.');
    injectAutopilotButton();
  }

  // ── Autopilot Button ─────────────────────────────────────────────────

  function injectAutopilotButton() {
    if (document.getElementById('wa-autopilot-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'wa-autopilot-btn';
    btn.textContent = '🚀 Autopilot';
    btn.style.cssText = [
      'position: fixed',
      'bottom: 24px',
      'right: 24px',
      'z-index: 999999',
      'background: linear-gradient(135deg, #3b82f6, #2563eb)',
      'color: #ffffff',
      'border: none',
      'border-radius: 12px',
      'padding: 12px 20px',
      'font-size: 14px',
      'font-weight: 600',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'cursor: pointer',
      'box-shadow: 0 4px 16px rgba(59, 130, 246, 0.4)',
      'transition: all 0.2s ease',
      'display: flex',
      'align-items: center',
      'gap: 8px',
    ].join(';');

    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'translateY(-2px)';
      btn.style.boxShadow = '0 6px 20px rgba(59, 130, 246, 0.6)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translateY(0)';
      btn.style.boxShadow = '0 4px 16px rgba(59, 130, 246, 0.4)';
    });
    btn.addEventListener('click', handleAutopilotClick);

    document.body.appendChild(btn);
  }

  async function handleAutopilotClick() {
    try {
      // Check tier limit first
      const canResult = await sendMessage({ action: 'canSubmit' });
      if (!canResult.allowed) {
        showUpgradeBanner(canResult.reason);
        return;
      }

      // Get profile
      const profileResult = await sendMessage({ action: 'getProfile' });
      const profile = profileResult.profile;

      if (!profile || (!profile.firstName && !profile.lastName && !profile.email)) {
        showToast('⚠️ No profile found. Please set up your profile in the extension popup.', 'error');
        return;
      }

      // Fill the form
      const filledCount = fillWorkdayForm(profile);

      if (filledCount === 0) {
        showToast('ℹ️ No matching fields found on this page.', 'info');
        return;
      }

      showToast(`✅ Autofilled ${filledCount} field${filledCount > 1 ? 's' : ''}. Clicking Submit in ${SUBMIT_DELAY / 1000}s...`, 'success');

      // Increment usage
      await sendMessage({ action: 'incrementUsage', payload: { count: 1 } });

      // Auto-submit after delay
      setTimeout(() => {
        clickSubmitButton();
      }, SUBMIT_DELAY);
    } catch (err) {
      console.error('[Workday Autopilot] Autopilot error:', err);
      showToast('❌ Autopilot failed. Please try again or reload the page.', 'error');
    }
  }

  // ── Form Detection & Filling ─────────────────────────────────────────

  function fillWorkdayForm(profile) {
    let filledCount = 0;

    // Get all form elements
    const inputs = document.querySelectorAll('input:not([type="hidden"]):not([type="button"]):not([type="submit"]):not([type="reset"])');
    const selects = document.querySelectorAll('select');
    const textareas = document.querySelectorAll('textarea');

    // Fill text/email/tel inputs
    inputs.forEach((input) => {
      const fieldKey = identifyField(input);
      if (fieldKey && profile[fieldKey]) {
        fillInput(input, profile[fieldKey]);
        filledCount++;
      }
    });

    // Fill selects (state dropdown, etc.)
    selects.forEach((select) => {
      const fieldKey = identifySelectField(select);
      if (fieldKey && profile[fieldKey]) {
        if (fillSelect(select, profile[fieldKey])) {
          filledCount++;
        }
      }
    });

    // Fill textareas (cover letter, description, etc.)
    textareas.forEach((textarea) => {
      const fieldKey = identifyTextareaField(textarea);
      if (fieldKey && profile[fieldKey]) {
        fillInput(textarea, profile[fieldKey]);
        filledCount++;
      }
    });

    // Fill work experience sections
    if (profile.workExperience && profile.workExperience.length > 0) {
      filledCount += fillWorkExperience(profile.workExperience);
    }

    return filledCount;
  }

  /**
   * Identify which profile field an input corresponds to.
   * Uses label text, placeholder, name attribute, aria-label, and id.
   */
  function identifyField(input) {
    const labelText = getLabelText(input).toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const ariaLabel = (input.getAttribute('aria-label') || '').toLowerCase();
    const id = (input.id || '').toLowerCase();
    const type = (input.type || '').toLowerCase();
    const autocomplete = (input.getAttribute('autocomplete') || '').toLowerCase();

    const allText = `${labelText} ${placeholder} ${name} ${ariaLabel} ${id} ${autocomplete}`;

    // Email
    if (type === 'email' || /email|e-mail/.test(allText)) {
      return 'email';
    }

    // Phone
    if (type === 'tel' || /phone|tel|mobile|cell/.test(allText)) {
      return 'phone';
    }

    // First name
    if (/first.?name|fname|given.?name/.test(allText)) {
      return 'firstName';
    }

    // Last name
    if (/last.?name|lname|surname|family.?name/.test(allText)) {
      return 'lastName';
    }

    // Full name (use as first name if no separate fields)
    if (/^name$|full.?name|your.?name/.test(allText)) {
      return 'firstName';
    }

    // Address / Street
    if (/address|street|address.?line.?1|address1/.test(allText)) {
      return 'address';
    }

    // City
    if (/city|town|locality/.test(allText)) {
      return 'city';
    }

    // State
    if (/state|province|region/.test(allText)) {
      return 'state';
    }

    // Zip / Postal
    if (/zip|postal|post.?code|zipcode/.test(allText)) {
      return 'zip';
    }

    // LinkedIn
    if (/linkedin|linked.?in/.test(allText)) {
      return 'linkedinUrl';
    }

    // Resume URL
    if (/resume|cv|url/.test(allText)) {
      return 'resumeUrl';
    }

    return null;
  }

  function identifySelectField(select) {
    const labelText = getLabelText(select).toLowerCase();
    const name = (select.name || '').toLowerCase();
    const ariaLabel = (select.getAttribute('aria-label') || '').toLowerCase();
    const id = (select.id || '').toLowerCase();

    const allText = `${labelText} ${name} ${ariaLabel} ${id}`;

    if (/state|province|region/.test(allText)) {
      return 'state';
    }

    return null;
  }

  function identifyTextareaField(textarea) {
    const labelText = getLabelText(textarea).toLowerCase();
    const placeholder = (textarea.placeholder || '').toLowerCase();
    const name = (textarea.name || '').toLowerCase();
    const ariaLabel = (textarea.getAttribute('aria-label') || '').toLowerCase();

    const allText = `${labelText} ${placeholder} ${name} ${ariaLabel}`;

    if (/cover.?letter|why|interest|additional|comment|note/.test(allText)) {
      return null; // We don't auto-fill free text areas yet
    }

    return null;
  }

  /**
   * Get the label text associated with a form element.
   */
  function getLabelText(element) {
    // Check for associated label by id
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Check for parent label
    const parentLabel = element.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();

    // Check for aria-label
    if (element.getAttribute('aria-label')) {
      return element.getAttribute('aria-label');
    }

    // Check for preceding label in same container
    const container = element.closest('[class]') || element.parentElement;
    if (container) {
      const labels = container.querySelectorAll('label');
      for (const label of labels) {
        if (label.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_PRECEDING) {
          return label.textContent.trim();
        }
      }
    }

    // Check for Workday-specific data attributes
    const dataAutocomplete = element.getAttribute('data-autocomplete');
    if (dataAutocomplete) return dataAutocomplete;

    return '';
  }

  function fillInput(input, value) {
    if (!value) return;

    // Set the value
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype, 'value'
    )?.set || Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype, 'value'
    )?.set;

    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(input, value);
    } else {
      input.value = value;
    }

    // Dispatch events to trigger React/Vue/Angular change detection
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new Event('blur', { bubbles: true }));

    // Mark as filled
    input.classList.add(FILLED_FIELD_CLASS);
  }

  function fillSelect(select, value) {
    if (!value) return;

    // Try to find matching option
    const options = Array.from(select.options);
    const match = options.find((opt) => {
      const optText = opt.textContent.trim().toLowerCase();
      const optValue = (opt.value || '').toLowerCase();
      const searchVal = value.toLowerCase();
      return optText === searchVal || optValue === searchVal ||
             optText.includes(searchVal) || optValue.includes(searchVal);
    });

    if (match) {
      select.value = match.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      select.classList.add(FILLED_FIELD_CLASS);
      return true;
    }

    return false;
  }

  function fillWorkExperience(experiences) {
    let count = 0;

    // Look for work experience sections
    // Workday often uses repeated field groups
    const workSections = document.querySelectorAll('[data-autocomplete="workExperience"], [class*="work-experience"], [class*="employment"]');

    if (workSections.length === 0) {
      // Try to find work experience fields by label patterns
      const allInputs = document.querySelectorAll('input:not([type="hidden"])');
      const expFields = {
        company: /company|employer|organization/,
        title: /job.?title|position|role/,
        startDate: /start.?date|from|begin/,
        endDate: /end.?date|to|until/,
      };

      allInputs.forEach((input) => {
        const labelText = getLabelText(input).toLowerCase();
        const name = (input.name || '').toLowerCase();
        const allText = `${labelText} ${name}`;

        for (const [field, pattern] of Object.entries(expFields)) {
          if (pattern.test(allText) && experiences[0] && experiences[0][field]) {
            fillInput(input, experiences[0][field]);
            count++;
          }
        }
      });
    }

    return count;
  }

  // ── Submit Button ────────────────────────────────────────────────────

  function clickSubmitButton() {
    // Look for submit buttons
    const buttons = document.querySelectorAll('button, input[type="submit"]');

    for (const btn of buttons) {
      const text = btn.textContent.trim();
      const type = btn.type || '';
      const ariaLabel = (btn.getAttribute('aria-label') || '').toLowerCase();

      // Check if it's a submit/next/apply button
      if (
        type === 'submit' ||
        WORKDAY_SUBMIT_PATTERNS.test(text) ||
        WORKDAY_SUBMIT_PATTERNS.test(ariaLabel)
      ) {
        // Don't click "Save" or "Cancel" buttons
        if (/save|cancel|back|previous/i.test(text)) {
          continue;
        }

        console.log(`[Workday Autopilot] Clicking submit button: "${text}"`);
        btn.click();
        showToast('🚀 Application submitted!', 'success');
        return true;
      }
    }

    showToast('⚠️ Could not find submit button. Please submit manually.', 'warning');
    return false;
  }

  // ── Toast Notifications ──────────────────────────────────────────────

  function showToast(message, type) {
    // Remove existing toast
    if (toastEl) {
      toastEl.remove();
    }

    toastEl = document.createElement('div');
    toastEl.id = 'wa-toast';
    toastEl.textContent = message;

    const colors = {
      success: { bg: '#059669', border: '#22c55e' },
      error: { bg: '#dc2626', border: '#ef4444' },
      warning: { bg: '#d97706', border: '#f59e0b' },
      info: { bg: '#2563eb', border: '#3b82f6' },
    };

    const color = colors[type] || colors.info;

    toastEl.style.cssText = [
      'position: fixed',
      'top: 24px',
      'right: 24px',
      'z-index: 9999999',
      `background: ${color.bg}`,
      'color: #ffffff',
      'padding: 14px 20px',
      'border-radius: 10px',
      `border-left: 4px solid ${color.border}`,
      'font-size: 14px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-weight: 500',
      'box-shadow: 0 8px 32px rgba(0,0,0,0.3)',
      'max-width: 400px',
      'line-height: 1.5',
      'animation: wa-toast-in 0.3s ease-out',
      'pointer-events: auto',
    ].join(';');

    document.body.appendChild(toastEl);

    // Auto-remove
    setTimeout(() => {
      if (toastEl) {
        toastEl.style.animation = 'wa-toast-out 0.3s ease-in forwards';
        setTimeout(() => {
          if (toastEl) {
            toastEl.remove();
            toastEl = null;
          }
        }, 300);
      }
    }, TOAST_DURATION);
  }

  // ── Upgrade Banner ───────────────────────────────────────────────────

  function showUpgradeBanner(reason) {
    if (upgradeBannerEl) {
      upgradeBannerEl.remove();
    }

    upgradeBannerEl = document.createElement('div');
    upgradeBannerEl.id = 'wa-upgrade-banner';

    upgradeBannerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
        <span style="flex:1;min-width:200px;">🔒 ${reason}</span>
        <button id="wa-upgrade-btn" style="
          background: linear-gradient(135deg, #f59e0b, #d97706);
          color: #000;
          border: none;
          border-radius: 8px;
          padding: 8px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        ">Upgrade to Pro — $14.99/mo</button>
        <button id="wa-dismiss-btn" style="
          background: transparent;
          color: #94a3b8;
          border: 1px solid #475569;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 13px;
          cursor: pointer;
        ">Dismiss</button>
      </div>
    `;

    upgradeBannerEl.style.cssText = [
      'position: fixed',
      'bottom: 0',
      'left: 0',
      'right: 0',
      'z-index: 9999998',
      'background: linear-gradient(135deg, #1e1b4b, #312e81)',
      'color: #e2e8f0',
      'padding: 16px 24px',
      'font-size: 14px',
      'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      'font-weight: 500',
      'border-top: 2px solid #f59e0b',
      'box-shadow: 0 -4px 24px rgba(0,0,0,0.3)',
      'animation: wa-banner-in 0.3s ease-out',
    ].join(';');

    document.body.appendChild(upgradeBannerEl);

    document.getElementById('wa-upgrade-btn').addEventListener('click', () => {
      chrome.runtime.sendMessage({ action: 'openOptions' }).catch(() => {});
      // Fallback: open options page
      chrome.runtime.openOptionsPage();
    });

    document.getElementById('wa-dismiss-btn').addEventListener('click', () => {
      if (upgradeBannerEl) {
        upgradeBannerEl.remove();
        upgradeBannerEl = null;
      }
    });

    // Auto-dismiss after 15 seconds
    setTimeout(() => {
      if (upgradeBannerEl) {
        upgradeBannerEl.remove();
        upgradeBannerEl = null;
      }
    }, 15000);
  }

  // ── Message Helper ───────────────────────────────────────────────────

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

  // ── Keyboard Shortcut ────────────────────────────────────────────────

  document.addEventListener('keydown', (e) => {
    // Ctrl+Shift+A to trigger autopilot
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      e.preventDefault();
      handleAutopilotClick();
    }
  });
})();
