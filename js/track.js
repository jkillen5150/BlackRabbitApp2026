/**
 * Customer track page — loads /api/track?t=
 */
(function () {
  const $ = (id) => document.getElementById(id);

  function tokenFromUrl() {
    const p = new URLSearchParams(window.location.search);
    return (p.get('t') || p.get('token') || '').trim();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function load() {
    const loading = $('track-loading');
    const body = $('track-body');
    const err = $('track-error');
    const token = tokenFromUrl();

    if (!token) {
      if (loading) loading.hidden = true;
      if (err) {
        err.hidden = false;
        err.textContent =
          'No track link token found. Open the full link from your booking confirmation, or text Jerry at (407) 951-1663.';
      }
      return;
    }

    try {
      const res = await fetch('/api/track?t=' + encodeURIComponent(token), {
        cache: 'no-store'
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.note || data.error || 'Could not load status');
      }

      if (loading) loading.hidden = true;
      if (body) body.hidden = false;

      const hello = $('track-hello');
      if (hello) {
        hello.textContent = 'Hey ' + (data.firstName || 'there') + ' — here’s your cut.';
      }

      const pill = $('track-status-pill');
      if (pill) {
        pill.textContent = data.statusLabel || data.status || 'Update';
        pill.dataset.status = data.status || '';
      }

      const blurb = $('track-blurb');
      if (blurb) blurb.textContent = data.blurb || '';

      const meta = $('track-meta');
      if (meta) {
        const bits = [];
        if (data.serviceHint) bits.push(data.serviceHint);
        if (data.urgency) bits.push(data.urgency);
        if (data.depositPaid) bits.push('Deposit paid');
        meta.textContent = bits.join(' · ');
      }

      const steps = $('track-steps');
      if (steps && Array.isArray(data.steps)) {
        steps.innerHTML = data.steps
          .map((s) => {
            const cls = s.current ? 'current' : s.done ? 'done' : '';
            return (
              '<li class="' +
              cls +
              '"><span class="track-step-dot" aria-hidden="true"></span>' +
              '<span>' +
              escapeHtml(s.label) +
              '</span></li>'
            );
          })
          .join('');
      }

      // Light auto-refresh while job isn’t done
      if (data.status !== 'done') {
        setTimeout(load, 45000);
      }
    } catch (e) {
      if (loading) loading.hidden = true;
      if (err) {
        err.hidden = false;
        err.textContent =
          (e && e.message) ||
          'Could not load this track link. Text Jerry at (407) 951-1663.';
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', load);
  } else {
    load();
  }
})();
