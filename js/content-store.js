/**
 * Black Rabbit content store
 * Loads data/content.json; optional local admin draft in localStorage.
 * Local drafts are only used when they were saved against the *current*
 * bundled content fingerprint — so a redeploy invalidates stale local data.
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
  /** Fingerprint of the last successfully fetched bundled content.json */
  let bundledFingerprint = null;
  /** True when active cache is a local admin draft (not pure bundled) */
  let usingLocalDraft = false;

  function uid(prefix) {
    return prefix + '-' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
  }

  function normalize(data) {
    return {
      reviews: (data && data.reviews) || [],
      portfolio: (data && data.portfolio) || [],
      pins: (data && data.pins) || [],
      serviceAreas: (data && data.serviceAreas) || []
    };
  }

  /** Stable short fingerprint so redeploys invalidate old local drafts. */
  function fingerprint(data) {
    const n = normalize(data);
    const raw = JSON.stringify({
      reviews: n.reviews,
      portfolio: n.portfolio,
      pins: n.pins,
      serviceAreas: n.serviceAreas
    });
    let h = 5381;
    for (let i = 0; i < raw.length; i++) {
      h = ((h << 5) + h) ^ raw.charCodeAt(i);
    }
    return (h >>> 0).toString(16) + '-' + raw.length.toString(16);
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
    cache = normalize(data);
    usingLocalDraft = true;
    global.dispatchEvent(new CustomEvent('br:content-updated', { detail: cache }));
  }

  async function fetchBundled() {
    const res = await fetch(DEFAULT_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load content');
    return normalize(await res.json());
  }

  async function load() {
    if (cache) return cache;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      let bundled = empty();
      try {
        bundled = await fetchBundled();
        bundledFingerprint = fingerprint(bundled);
      } catch {
        bundledFingerprint = null;
      }

      const local = readLocal();
      // New format: { basedOn, reviews, ... }. Legacy: bare content without basedOn.
      const localBasedOn = local && local.basedOn;
      const localContent = local
        ? normalize(local.reviews || local.portfolio || local.pins ? local : empty())
        : null;

      if (
        localContent &&
        bundledFingerprint &&
        localBasedOn &&
        localBasedOn === bundledFingerprint &&
        (localContent.reviews.length ||
          localContent.portfolio.length ||
          localContent.pins.length)
      ) {
        cache = localContent;
        usingLocalDraft = true;
        return cache;
      }

      // Stale or legacy localStorage — drop so redeployed content.json wins
      if (local) {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch {
          /* ignore */
        }
      }

      cache = bundled;
      usingLocalDraft = false;
      return cache;
    })();

    return loadPromise;
  }

  function getSync() {
    return cache || normalize(readLocal() || empty());
  }

  function isLocalDraft() {
    return usingLocalDraft;
  }

  function save(data) {
    const normalized = normalize(data);
    // If we never fetched bundled (offline), still save; basedOn may be null
    writeLocal({
      basedOn: bundledFingerprint,
      ...normalized
    });
  }

  function resetToBundled() {
    localStorage.removeItem(STORAGE_KEY);
    cache = null;
    loadPromise = null;
    usingLocalDraft = false;
    bundledFingerprint = null;
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
    const location = (r.location || '').trim();
    const dateLabel = r.date ? formatDate(r.date) : '';
    const subParts = [location, dateLabel].filter(Boolean);
    const subHtml = subParts.length
      ? `<div class="sub">${escapeHtml(subParts.join(' · '))}</div>`
      : '';
    const footerLoc = location
      ? `<span>${escapeHtml(location)}</span>`
      : '<span></span>';

    return `
      <article class="review-card${active ? ' active' : ''}" data-id="${escapeAttr(r.id)}">
        <div class="review-card-header">
          <div class="review-avatar" aria-hidden="true">${escapeHtml(initial(r.name))}</div>
          <div class="review-meta">
            <strong>${escapeHtml(r.name || 'Customer')}</strong>
            ${subHtml}
          </div>
        </div>
        <div class="review-stars" aria-label="${r.rating || 5} out of 5 stars">${stars(r.rating || 5)}</div>
        <p class="review-text">${escapeHtml(r.text || '')}</p>
        <div class="review-footer">
          <span class="google-badge">
            ${isGoogle ? '<span class="google-g">G</span>' : '⭐'}
            ${escapeHtml(sourceLabel)}
          </span>
          ${footerLoc}
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
    isLocalDraft,
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
