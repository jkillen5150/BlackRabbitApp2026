/**
 * Cut My Grass — multi-step booking (v1)
 * Submits to POST /api/lead (same pipeline as Ask AI).
 * Stripe checkout reserved for a later phase.
 */
(function () {
  const TOTAL_STEPS = 4;
  const state = {
    step: 1,
    service: '',
    serviceLabel: '',
    urgency: '',
    urgencyLabel: '',
    address: '',
    notes: '',
    name: '',
    phone: ''
  };

  const $ = (id) => document.getElementById(id);

  function setError(msg) {
    const el = $('cmg-error');
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = msg;
  }

  function updateProgress() {
    const bar = $('cmg-progress-bar');
    const label = $('cmg-step-label');
    if (state.step === 'done') {
      if (bar) bar.style.width = '100%';
      if (label) label.textContent = 'Request sent';
      return;
    }
    const pct = Math.round(((state.step - 1) / TOTAL_STEPS) * 100);
    if (bar) bar.style.width = Math.max(8, pct) + '%';
    if (label) label.textContent = 'Step ' + state.step + ' of ' + TOTAL_STEPS;
  }

  function showStep(step) {
    state.step = step;
    document.querySelectorAll('.cmg-step').forEach((sec) => {
      const s = sec.getAttribute('data-step');
      sec.hidden = String(s) !== String(step);
    });
    const nav = $('cmg-nav');
    const back = $('cmg-back');
    const next = $('cmg-next');
    if (step === 'done') {
      if (nav) nav.hidden = true;
      updateProgress();
      return;
    }
    if (nav) nav.hidden = false;
    if (back) back.hidden = step <= 1;
    if (next) {
      next.disabled = !canContinue();
      next.textContent = step === TOTAL_STEPS ? 'Send request' : 'Continue';
      next.classList.toggle('cmg-busy', false);
    }
    if (step === 4) renderSummary();
    updateProgress();
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function canContinue() {
    if (state.step === 1) return !!state.service;
    if (state.step === 2) return true; // address optional
    if (state.step === 3) return !!state.urgency;
    if (state.step === 4) {
      return (
        String(state.name || $('cmg-name')?.value || '').trim().length >= 1 &&
        String(state.phone || $('cmg-phone')?.value || '').replace(/\D/g, '').length >= 7
      );
    }
    return false;
  }

  function syncChoiceUI(field) {
    document.querySelectorAll('.cmg-choice[data-field="' + field + '"]').forEach((btn) => {
      const on =
        (field === 'service' && btn.dataset.value === state.service) ||
        (field === 'urgency' && btn.dataset.value === state.urgency);
      btn.classList.toggle('selected', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
  }

  function renderSummary() {
    const el = $('cmg-summary');
    if (!el) return;
    const lines = [
      state.serviceLabel && '<strong>Service:</strong> ' + escapeHtml(state.serviceLabel),
      state.urgencyLabel && '<strong>When:</strong> ' + escapeHtml(state.urgencyLabel),
      (state.address || $('cmg-address')?.value) &&
        '<strong>Where:</strong> ' + escapeHtml(state.address || $('cmg-address').value),
      (state.notes || $('cmg-notes')?.value) &&
        '<strong>Notes:</strong> ' + escapeHtml(state.notes || $('cmg-notes').value)
    ].filter(Boolean);
    el.innerHTML = lines.length
      ? '<p class="cmg-summary-title">Your request</p><ul>' +
        lines.map((l) => '<li>' + l + '</li>').join('') +
        '</ul>'
      : '';
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function readContactFields() {
    state.name = ($('cmg-name')?.value || '').trim();
    state.phone = ($('cmg-phone')?.value || '').trim();
    state.address = ($('cmg-address')?.value || '').trim();
    state.notes = ($('cmg-notes')?.value || '').trim();
  }

  function buildNeed() {
    const parts = [
      'Cut My Grass request',
      'Service: ' + (state.serviceLabel || state.service || 'lawn cut'),
      'When: ' + (state.urgencyLabel || state.urgency || 'unspecified')
    ];
    if (state.notes) parts.push('Notes: ' + state.notes);
    parts.push('Payment: pay-after-work (Stripe in-app later)');
    return parts.join(' · ');
  }

  async function submit() {
    readContactFields();
    if (!canContinue()) {
      setError('Add your name and a valid mobile number.');
      return;
    }

    const next = $('cmg-next');
    if (next) {
      next.disabled = true;
      next.classList.add('cmg-busy');
      next.textContent = 'Sending…';
    }
    setError('');

    const payload = {
      name: state.name,
      phone: state.phone,
      address: state.address,
      urgency: state.urgencyLabel || state.urgency,
      need: buildNeed(),
      source: 'cut-my-grass'
    };

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not send request');
      }
      showStep('done');
      const msg = $('cmg-done-msg');
      if (msg && data.emailed === false) {
        msg.textContent =
          'We saved your request. If you don’t hear back soon, text Jerry at (407) 951-1663.';
      }
    } catch (e) {
      setError(
        (e && e.message) ||
          'Could not reach the server. Text Jerry at (407) 951-1663 — we’ll still take care of you.'
      );
      if (next) {
        next.disabled = false;
        next.classList.remove('cmg-busy');
        next.textContent = 'Send request';
      }
    }
  }

  function goNext() {
    if (state.step === 1 && !state.service) {
      setError('Pick a service to continue.');
      return;
    }
    if (state.step === 2) {
      readContactFields();
    }
    if (state.step === 3 && !state.urgency) {
      setError('Pick a timing option.');
      return;
    }
    if (state.step === TOTAL_STEPS) {
      submit();
      return;
    }
    showStep(state.step + 1);
  }

  function goBack() {
    if (state.step <= 1 || state.step === 'done') return;
    showStep(state.step - 1);
  }

  function wire() {
    document.querySelectorAll('.cmg-choice').forEach((btn) => {
      btn.addEventListener('click', () => {
        const field = btn.dataset.field;
        if (field === 'service') {
          state.service = btn.dataset.value || '';
          state.serviceLabel = btn.dataset.label || state.service;
          syncChoiceUI('service');
        }
        if (field === 'urgency') {
          state.urgency = btn.dataset.value || '';
          state.urgencyLabel = btn.dataset.label || state.urgency;
          syncChoiceUI('urgency');
        }
        setError('');
        const next = $('cmg-next');
        if (next) next.disabled = !canContinue();
        // Auto-advance on service / urgency for snappier UX
        if (field === 'service' || field === 'urgency') {
          setTimeout(() => {
            if (canContinue() && state.step < TOTAL_STEPS) goNext();
          }, 180);
        }
      });
    });

    ['cmg-name', 'cmg-phone', 'cmg-address', 'cmg-notes'].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener('input', () => {
        readContactFields();
        const next = $('cmg-next');
        if (next && state.step === 4) next.disabled = !canContinue();
      });
    });

    $('cmg-next')?.addEventListener('click', goNext);
    $('cmg-back')?.addEventListener('click', goBack);

    // Enter on last fields
    $('cmg-phone')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      }
    });

    showStep(1);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
