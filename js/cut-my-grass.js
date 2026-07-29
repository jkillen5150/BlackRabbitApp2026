/**
 * Cut My Grass — multi-step booking
 * 1) POST /api/lead (email + Admin)
 * 2) POST /api/create-deposit → Stripe Checkout (card deposit)
 * Optional yard photos compressed on-device.
 */
(function () {
  const TOTAL_STEPS = 4;
  const MAX_PHOTOS = 2;

  const state = {
    step: 1,
    service: '',
    serviceLabel: '',
    urgency: '',
    urgencyLabel: '',
    address: '',
    notes: '',
    name: '',
    phone: '',
    /** @type {{ name: string, dataUrl: string }[]} */
    photos: []
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

  function setPhotoStatus(msg) {
    const el = $('cmg-photo-status');
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
      next.textContent = step === TOTAL_STEPS ? 'Pay deposit & book' : 'Continue';
      next.classList.toggle('cmg-busy', false);
    }
    if (step === 4) renderSummary();
    updateProgress();
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function canContinue() {
    if (state.step === 1) return !!state.service;
    if (state.step === 2) return true;
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
        '<strong>Notes:</strong> ' + escapeHtml(state.notes || $('cmg-notes').value),
      state.photos.length
        ? '<strong>Photos:</strong> ' + state.photos.length + ' attached'
        : ''
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
    if (state.photos.length) parts.push('Photos: ' + state.photos.length + ' attached');
    parts.push('Payment: card deposit via Stripe Checkout (applied to final quote)');
    return parts.join(' · ');
  }

  function saveTrackLocal(token, url) {
    try {
      if (token) sessionStorage.setItem('cmg_track_token', token);
      if (url) sessionStorage.setItem('cmg_track_url', url);
    } catch {
      /* ignore */
    }
  }

  function readTrackLocal() {
    try {
      return {
        token: sessionStorage.getItem('cmg_track_token') || '',
        url: sessionStorage.getItem('cmg_track_url') || ''
      };
    } catch {
      return { token: '', url: '' };
    }
  }

  function injectTrackLink(trackUrl) {
    const actions = document.querySelector('.cmg-done-actions');
    if (!actions || !trackUrl) return;
    if (actions.querySelector('.cmg-track-link')) return;
    const a = document.createElement('a');
    a.className = 'cmg-btn cmg-btn-primary cmg-track-link';
    a.href = trackUrl;
    a.textContent = 'Track your cut';
    actions.insertBefore(a, actions.firstChild);
  }

  async function applyReturnState() {
    const params = new URLSearchParams(window.location.search);
    const deposit = params.get('deposit');
    if (!deposit) return;

    const title = $('cmg-done-title');
    const msg = $('cmg-done-msg');
    const icon = document.querySelector('.cmg-success-icon');
    const sessionId = params.get('session_id') || '';
    const local = readTrackLocal();

    showStep('done');

    if (deposit === 'success') {
      if (title) title.textContent = 'Confirming payment…';
      if (msg) msg.textContent = 'One moment — verifying your deposit with Stripe.';
      if (icon) icon.textContent = '…';

      let verified = false;
      let amountLabel = '';
      if (sessionId) {
        try {
          const res = await fetch('/api/confirm-deposit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
            body: JSON.stringify({ sessionId })
          });
          const data = await res.json().catch(() => ({}));
          verified = !!(res.ok && data.paid);
          amountLabel = data.amountLabel || '';
          if (data.trackUrl) saveTrackLocal(data.trackToken || local.token, data.trackUrl);
        } catch {
          verified = false;
        }
      }

      if (title) title.textContent = verified ? 'Deposit received' : 'You’re booked in';
      if (msg) {
        if (verified) {
          const amt =
            amountLabel &&
            (String(amountLabel).startsWith('$') ? amountLabel : '$' + amountLabel);
          msg.textContent =
            'Thanks — your booking deposit' +
            (amt ? ' (' + amt + ')' : '') +
            ' went through. Jerry has been notified and will text or call to confirm timing. Deposit applies to your final quote.';
        } else {
          msg.textContent =
            'Thanks — your request is in. If you completed card pay, Jerry will confirm shortly. Otherwise text (407) 951-1663.';
        }
      }
      if (icon) icon.textContent = '✓';
      injectTrackLink(readTrackLocal().url);
    } else if (deposit === 'cancel') {
      if (title) title.textContent = 'Request saved';
      if (msg) {
        msg.textContent =
          'No charge made. Jerry still got your Cut My Grass request — text or call to finish booking, or start again and complete the deposit.';
      }
      if (icon) icon.textContent = '!';
      injectTrackLink(local.url);
    }

    // Clean URL so refresh doesn’t re-flash / re-confirm spam (server is also idempotent)
    try {
      const path = window.location.pathname.replace(/\/$/, '') || '/';
      window.history.replaceState({}, '', path);
    } catch {
      /* ignore */
    }
  }

  async function startDeposit(leadId) {
    const res = await fetch('/api/create-deposit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: state.name,
        phone: state.phone,
        address: state.address,
        leadId: leadId || '',
        service: state.serviceLabel || state.service,
        urgency: state.urgencyLabel || state.urgency
      })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Could not start deposit');
      err.detail = data.detail || data.note || '';
      err.code = res.status;
      throw err;
    }
    if (!data.url) throw new Error('No checkout URL returned');
    return data;
  }

  /**
   * Web3Forms free tier often blocks server-side sends. Homepage form posts from
   * the browser — do the same as a reliable backup so Jerry still gets email.
   */
  async function notifyJerryClientSide(trackUrl) {
    const accessKey = '6467d992-e261-48c0-ae1e-2bc4b6cc557d';
    const message = [
      '--- Cut My Grass booking (browser notify) ---',
      'Name: ' + state.name,
      'Phone: ' + state.phone,
      'Address: ' + (state.address || '(not provided)'),
      'Service: ' + (state.serviceLabel || state.service || ''),
      'When: ' + (state.urgencyLabel || state.urgency || ''),
      'Notes: ' + (state.notes || '(none)'),
      'Photos: ' + state.photos.length,
      trackUrl ? 'Track: ' + trackUrl : null,
      'Source: cut-my-grass'
    ]
      .filter(Boolean)
      .join('\n');

    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: 'Cut My Grass request — ' + state.name,
          from_name: 'Cut My Grass (Black Rabbit)',
          name: state.name,
          phone: state.phone,
          message: message
        })
      });
      const data = await res.json().catch(() => ({}));
      return !!(res.ok && data.success !== false);
    } catch {
      return false;
    }
  }

  function looksLikeHeic(file) {
    const type = String((file && file.type) || '');
    const name = String((file && file.name) || '');
    return /heic|heif/i.test(type) || /\.heic$/i.test(name) || /\.heif$/i.test(name);
  }

  /** Lightweight JPEG compress for phone uploads (no content-store dep). */
  function compressImageFile(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('Please choose an image file (JPEG or PNG works best).'));
        return;
      }
      if (typeof file.size === 'number' && file.size === 0) {
        reject(new Error('That photo came through empty. Try another shot from your gallery.'));
        return;
      }

      const type = String(file.type || '');
      // Empty MIME is common on mobile galleries — only reject clear non-images
      if (type && !type.startsWith('image/') && type !== 'application/octet-stream') {
        reject(new Error('That file is not an image. Use JPEG or PNG.'));
        return;
      }

      const failOpen = () => {
        if (looksLikeHeic(file)) {
          reject(
            new Error(
              'iPhone HEIC isn’t supported here. Export as JPEG, or Camera → Formats → Most Compatible.'
            )
          );
        } else {
          reject(new Error('Could not open that image. Try JPEG or PNG from your gallery.'));
        }
      };

      const paint = (img, revoke) => {
        try {
          const maxEdge = 960;
          let w = img.naturalWidth || img.width;
          let h = img.naturalHeight || img.height;
          const long = Math.max(w, h) || 1;
          if (long > maxEdge) {
            const scale = maxEdge / long;
            w = Math.max(1, Math.round(w * scale));
            h = Math.max(1, Math.round(h * scale));
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not process photo.'));
            return;
          }
          ctx.fillStyle = '#fff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          let dataUrl = canvas.toDataURL('image/jpeg', 0.62);
          if (dataUrl.length > 280000) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.48);
          }
          if (dataUrl.length > 320000) {
            const canvas2 = document.createElement('canvas');
            canvas2.width = Math.max(1, Math.round(w * 0.75));
            canvas2.height = Math.max(1, Math.round(h * 0.75));
            const ctx2 = canvas2.getContext('2d');
            if (ctx2) {
              ctx2.fillStyle = '#fff';
              ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
              ctx2.drawImage(canvas, 0, 0, canvas2.width, canvas2.height);
              dataUrl = canvas2.toDataURL('image/jpeg', 0.45);
            }
          }
          resolve(dataUrl);
        } catch (e) {
          if (looksLikeHeic(file)) {
            reject(
              new Error(
                'iPhone HEIC isn’t supported here. Export as JPEG, or Camera → Formats → Most Compatible.'
              )
            );
          } else {
            reject(e instanceof Error ? e : new Error('Could not process photo.'));
          }
        } finally {
          if (typeof revoke === 'function') revoke();
        }
      };

      // Prefer createImageBitmap (orientation) when available
      if (typeof createImageBitmap === 'function') {
        createImageBitmap(file, { imageOrientation: 'from-image' })
          .catch(() => createImageBitmap(file))
          .then((bmp) => {
            paint(bmp, () => {
              try {
                bmp.close();
              } catch {
                /* ignore */
              }
            });
          })
          .catch(() => {
            // Fall through to Image + object URL
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => paint(img, () => URL.revokeObjectURL(url));
            img.onerror = () => {
              URL.revokeObjectURL(url);
              // Last resort: FileReader (some WebViews)
              const reader = new FileReader();
              reader.onerror = failOpen;
              reader.onload = () => {
                const img2 = new Image();
                img2.onload = () => paint(img2);
                img2.onerror = failOpen;
                img2.src = reader.result;
              };
              reader.readAsDataURL(file);
            };
            img.src = url;
          });
        return;
      }

      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => paint(img, () => URL.revokeObjectURL(url));
      img.onerror = () => {
        URL.revokeObjectURL(url);
        failOpen();
      };
      img.src = url;
    });
  }

  function renderPhotoPreviews() {
    const wrap = $('cmg-photo-previews');
    if (!wrap) return;
    wrap.innerHTML = state.photos
      .map((p, i) => {
        return (
          '<div class="cmg-photo-thumb">' +
          '<img src="' +
          p.dataUrl +
          '" alt="Yard photo ' +
          (i + 1) +
          '">' +
          '<button type="button" class="cmg-photo-remove" data-i="' +
          i +
          '" aria-label="Remove photo ' +
          (i + 1) +
          '">×</button>' +
          '</div>'
        );
      })
      .join('');

    wrap.querySelectorAll('.cmg-photo-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        const i = Number(btn.getAttribute('data-i'));
        if (!Number.isFinite(i)) return;
        state.photos.splice(i, 1);
        renderPhotoPreviews();
        setPhotoStatus(
          state.photos.length
            ? state.photos.length + ' photo' + (state.photos.length > 1 ? 's' : '') + ' ready'
            : ''
        );
      });
    });
  }

  async function onPhotosSelected(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    const room = MAX_PHOTOS - state.photos.length;
    if (room <= 0) {
      setPhotoStatus('Max ' + MAX_PHOTOS + ' photos. Remove one to add another.');
      return;
    }
    const take = files.slice(0, room);
    setPhotoStatus('Compressing…');
    try {
      for (const file of take) {
        const dataUrl = await compressImageFile(file);
        const base = String(file.name || 'yard').replace(/\.[^.]+$/, '') || 'yard';
        state.photos.push({
          name: base.slice(0, 40) + '.jpg',
          dataUrl
        });
      }
      renderPhotoPreviews();
      setPhotoStatus(
        state.photos.length +
          ' photo' +
          (state.photos.length > 1 ? 's' : '') +
          ' ready (shrunk for a fast send)'
      );
    } catch (e) {
      setPhotoStatus('');
      setError((e && e.message) || 'Could not add that photo.');
    }
    const input = $('cmg-photos');
    if (input) input.value = '';
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
      source: 'cut-my-grass',
      photos: state.photos.map((p) => ({
        filename: p.name,
        dataUrl: p.dataUrl
      }))
    };

    try {
      // 1) Always capture the lead so Jerry is notified even if they bail on card pay
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not send request');
      }

      const leadId = data.lead && data.lead.id;
      const trackToken = data.trackToken || (data.lead && data.lead.trackToken) || '';
      const trackUrl =
        data.trackUrl ||
        (trackToken ? '/track?t=' + encodeURIComponent(trackToken) : '');
      saveTrackLocal(trackToken, trackUrl);

      // Browser-side email backup (Web3Forms free plan allows client, not always server)
      if (!data.emailed) {
        await notifyJerryClientSide(
          trackUrl && trackUrl.indexOf('http') === 0
            ? trackUrl
            : trackUrl
              ? window.location.origin + trackUrl
              : ''
        );
      }

      // 2) Stripe Checkout deposit
      if (next) next.textContent = 'Opening secure pay…';
      try {
        const checkout = await startDeposit(leadId);
        window.location.href = checkout.url;
        return;
      } catch (depErr) {
        // Lead already saved — soft-fail so booking isn’t lost
        showStep('done');
        const title = $('cmg-done-title');
        const msg = $('cmg-done-msg');
        if (title) title.textContent = 'Request received';
        if (msg) {
          const detail = depErr.detail || depErr.message || '';
          const stripeHint =
            /not configured|STRIPE/i.test(detail + (depErr.message || ''))
              ? ' Stripe isn’t configured on this Vercel project yet (add STRIPE_SECRET_KEY + redeploy).'
              : detail
                ? ' (' + detail + ')'
                : '';
          msg.textContent =
            'Jerry should have your request. Card deposit isn’t available right now.' +
            stripeHint +
            ' Call/text (407) 951-1663 anytime.';
        }
        injectTrackLink(trackUrl);
        return;
      }
    } catch (e) {
      setError(
        (e && e.message) ||
          'Could not reach the server. Text Jerry at (407) 951-1663 — we’ll still take care of you.'
      );
      if (next) {
        next.disabled = false;
        next.classList.remove('cmg-busy');
        next.textContent = 'Pay deposit & book';
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

    $('cmg-photos')?.addEventListener('change', (e) => {
      onPhotosSelected(e.target.files);
    });

    $('cmg-next')?.addEventListener('click', goNext);
    $('cmg-back')?.addEventListener('click', goBack);

    $('cmg-phone')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      }
    });

    if (new URLSearchParams(window.location.search).get('deposit')) {
      applyReturnState();
    } else {
      showStep(1);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
