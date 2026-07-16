/**
 * Black Rabbit content store
 * Loads data/content.json, merges with local admin overrides (localStorage).
 */
(function (global) {
  const STORAGE_KEY = 'br_site_content_v1';
  const DEFAULT_PATH = 'data/content.json';

  const empty = () => ({
    reviews: [],
    portfolio: [],
    pins: [],
    serviceAreas: []
  });

  let cache = null;
  let loadPromise = null;

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function readLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function writeLocal(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    cache = data;
    global.dispatchEvent(new CustomEvent('br:content-updated', { detail: data }));
  }

  async function load() {
    if (cache) return cache;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      const local = readLocal();
      if (local && (local.reviews || local.portfolio || local.pins)) {
        cache = {
          reviews: local.reviews || [],
          portfolio: local.portfolio || [],
          pins: local.pins || [],
          serviceAreas: local.serviceAreas || []
        };
        return cache;
      }

      try {
        const res = await fetch(DEFAULT_PATH, { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load content');
        const data = await res.json();
        cache = {
          reviews: data.reviews || [],
          portfolio: data.portfolio || [],
          pins: data.pins || [],
          serviceAreas: data.serviceAreas || []
        };
      } catch {
        cache = empty();
      }
      return cache;
    })();

    return loadPromise;
  }

  function getSync() {
    return cache || readLocal() || empty();
  }

  function save(data) {
    writeLocal({
      reviews: data.reviews || [],
      portfolio: data.portfolio || [],
      pins: data.pins || [],
      serviceAreas: data.serviceAreas || []
    });
  }

  function resetToBundled() {
    localStorage.removeItem(STORAGE_KEY);
    cache = null;
    loadPromise = null;
    return load();
  }

  function exportJson() {
    const data = getSync();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function stars(n) {
    const r = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return '★'.repeat(r) + '☆'.repeat(5 - r);
  }

  function initial(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  function renderReviewCard(r, active) {
    const sourceLabel = r.source === 'Google' ? 'Google review' : (r.source || 'Customer') + ' review';
    const isGoogle = r.source === 'Google';
    return `
      <article class="review-card${active ? ' active' : ''}" data-id="${escapeAttr(r.id)}">
        <div class="review-card-header">
          <div class="review-avatar" aria-hidden="true">${escapeHtml(initial(r.name))}</div>
          <div class="review-meta">
            <strong>${escapeHtml(r.name || 'Customer')}</strong>
            <div class="sub">${escapeHtml(r.location || '')}${r.date ? ' · ' + escapeHtml(formatDate(r.date)) : ''}</div>
          </div>
        </div>
        <div class="review-stars" aria-label="${r.rating || 5} out of 5 stars">${stars(r.rating || 5)}</div>
        <p class="review-text">${escapeHtml(r.text || '')}</p>
        <div class="review-footer">
          <span class="google-badge">
            ${isGoogle ? '<span class="google-g">G</span>' : '⭐'}
            ${escapeHtml(sourceLabel)}
          </span>
          <span>${escapeHtml(r.location || '')}</span>
        </div>
      </article>
    `;
  }

  function formatDate(d) {
    try {
      return new Date(d + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return d;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function escapeAttr(s) {
    return escapeHtml(s).replace(/'/g, '&#39;');
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  global.BRContent = {
    load,
    getSync,
    save,
    resetToBundled,
    exportJson,
    uid,
    stars,
    initial,
    renderReviewCard,
    formatDate,
    escapeHtml,
    escapeAttr,
    fileToDataUrl,
    STORAGE_KEY
  };
})(window);
