/**
 * Black Rabbit content store
 * Prefers durable /api/content (GitHub-backed) when available, else data/content.json.
 * Admin publish() writes photos + content.json via API so everyone sees updates.
 * Local drafts remain a fallback for offline / API-down; fingerprint invalidates on redeploy.
 */
(function (global) {
  const STORAGE_KEY = 'br_site_content_v1';
  const DEFAULT_PATH = 'data/content.json';
  const API_PATH = '/api/content';

  const empty = () => ({
    reviews: [],
    portfolio: [],
    pins: [],
    serviceAreas: []
  });

  let cache = null;
  let loadPromise = null;
  /** Fingerprint of the last successfully fetched remote/bundled content */
  let bundledFingerprint = null;
  /** True when active cache is a local admin draft (not pure remote/bundled) */
  let usingLocalDraft = false;
  /** True when last successful load came from /api/content */
  let usingDurable = false;
  /** Last known content.json sha from durable API (for optimistic puts) */
  let durableSha = null;

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

  function clearLocal() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function writeLocal(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    cache = normalize(data);
    usingLocalDraft = true;
    global.dispatchEvent(new CustomEvent('br:content-updated', { detail: cache }));
  }

  function setCache(data, opts) {
    const o = opts || {};
    cache = normalize(data);
    usingLocalDraft = !!o.localDraft;
    if (typeof o.durable === 'boolean') usingDurable = o.durable;
    if (o.sha !== undefined) durableSha = o.sha;
    if (o.fingerprintBase) bundledFingerprint = fingerprint(o.fingerprintBase);
    global.dispatchEvent(new CustomEvent('br:content-updated', { detail: cache }));
    return cache;
  }

  function quotaErrorMessage() {
    return (
      'Browser storage is full (local draft only). ' +
      'Publish to the server instead, remove an older photo, or use a smaller image / image URL.'
    );
  }

  async function fetchBundled() {
    const res = await fetch(DEFAULT_PATH, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load content');
    return normalize(await res.json());
  }

  /**
   * @returns {{ content: object, sha: string|null } | null}
   */
  async function fetchDurable() {
    try {
      const res = await fetch(API_PATH, { cache: 'no-store' });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.durable || !data.content) return null;
      return {
        content: normalize(data.content),
        sha: data.sha || null
      };
    } catch {
      return null;
    }
  }

  async function load() {
    if (cache) return cache;
    if (loadPromise) return loadPromise;

    loadPromise = (async () => {
      // 1) Prefer durable API (published portfolio/reviews) so admin saves are visible now
      const durable = await fetchDurable();
      let remote = null;
      if (durable) {
        remote = durable.content;
        durableSha = durable.sha;
        usingDurable = true;
        bundledFingerprint = fingerprint(remote);
      } else {
        usingDurable = false;
        durableSha = null;
        try {
          remote = await fetchBundled();
          bundledFingerprint = fingerprint(remote);
        } catch {
          remote = empty();
          bundledFingerprint = null;
        }
      }

      const local = readLocal();
      const localBasedOn = local && local.basedOn;
      const localContent = local
        ? normalize(local.reviews || local.portfolio || local.pins ? local : empty())
        : null;

      // Local draft only if it matches the current remote fingerprint (not stale)
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

      if (local) clearLocal();

      cache = remote;
      usingLocalDraft = false;
      return cache;
    })();

    return loadPromise;
  }

  /** Force re-fetch from network (after publish). */
  async function reload() {
    cache = null;
    loadPromise = null;
    return load();
  }

  function getSync() {
    return cache || normalize(readLocal() || empty());
  }

  function isLocalDraft() {
    return usingLocalDraft;
  }

  function isDurable() {
    return usingDurable;
  }

  /**
   * Persist admin draft locally only. Prefer publish() for real saves.
   * Returns { ok: true } or { ok: false, error }.
   */
  function save(data) {
    const normalized = normalize(data);
    try {
      writeLocal({
        basedOn: bundledFingerprint,
        ...normalized
      });
      return { ok: true, localOnly: true };
    } catch (e) {
      const name = e && e.name;
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || (e && e.code === 22)) {
        return { ok: false, error: quotaErrorMessage() };
      }
      return { ok: false, error: (e && e.message) || 'Could not save draft.' };
    }
  }

  /**
   * Upload one compressed data-URL photo to media/portfolio/ on GitHub.
   * @param {string} dataUrl
   * @param {{ token?: string, id?: string }} options
   * @returns {Promise<{ ok: true, path: string } | { ok: false, error: string, status?: number }>}
   */
  async function uploadPhoto(dataUrl, options) {
    const opts = options || {};
    const headers = { 'Content-Type': 'application/json' };
    if (opts.token) headers['X-Lead-Token'] = opts.token;
    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'upload-photo',
          dataUrl,
          id: opts.id || ''
        })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) {
        return {
          ok: false,
          status: 401,
          error:
            'Admin token required. Paste LEAD_ADMIN_TOKEN in Admin (same as leads), Save on this device.'
        };
      }
      if (!res.ok || !data.ok) {
        return {
          ok: false,
          status: res.status,
          error: (data && data.error) || 'Photo upload failed (HTTP ' + res.status + ')'
        };
      }
      return { ok: true, path: data.path, image: data.image || data.path };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Photo upload network error' };
    }
  }

  /**
   * Normalize portfolio image field to media/portfolio/... path for API delete.
   */
  function toMediaPath(imageOrPath) {
    const s = String(imageOrPath || '').trim();
    if (!s) return '';
    if (s.startsWith('media/portfolio/')) return s;
    const m = s.match(/\/(media\/portfolio\/[^?#]+)/);
    if (m) return m[1];
    return '';
  }

  /**
   * Delete a media/portfolio/* file (best effort).
   */
  async function deletePhoto(path, options) {
    const opts = options || {};
    const mediaPath = toMediaPath(path);
    if (!mediaPath) {
      return { ok: true, skipped: true };
    }
    const headers = { 'Content-Type': 'application/json' };
    if (opts.token) headers['X-Lead-Token'] = opts.token;
    try {
      const res = await fetch(API_PATH, {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'delete-photo', path: mediaPath })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        return { ok: false, error: (data && data.error) || 'Delete photo failed' };
      }
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Delete photo network error' };
    }
  }

  /**
   * Publish full content to GitHub via /api/content (everyone sees it).
   * Also updates in-memory cache and clears local draft on success.
   * @param {object} data
   * @param {{ token?: string }} options
   */
  async function publish(data, options) {
    const opts = options || {};
    const normalized = normalize(data);
    const headers = { 'Content-Type': 'application/json' };
    if (opts.token) headers['X-Lead-Token'] = opts.token;

    try {
      const res = await fetch(API_PATH, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ content: normalized, sha: durableSha })
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 401) {
        return {
          ok: false,
          status: 401,
          error:
            'Admin token required to publish. Paste LEAD_ADMIN_TOKEN above, Save on this device, then try again.'
        };
      }
      if (res.status === 503) {
        return {
          ok: false,
          status: 503,
          error:
            (body && body.error) ||
            'Server durable storage not configured (GITHUB_TOKEN). Cannot publish portfolio.'
        };
      }
      if (!res.ok || body.ok === false) {
        return {
          ok: false,
          status: res.status,
          error: (body && body.error) || 'Publish failed (HTTP ' + res.status + ')'
        };
      }

      clearLocal();
      setCache(normalized, {
        localDraft: false,
        durable: true,
        sha: body.sha || null,
        fingerprintBase: normalized
      });
      return { ok: true, durable: true, note: body.note || 'Published.' };
    } catch (e) {
      return {
        ok: false,
        error: (e && e.message) || 'Publish network error — check connection /api/content'
      };
    }
  }

  /**
   * Save for admin: try durable publish first; fall back to local draft only if API unavailable.
   * @param {object} data
   * @param {{ token?: string, localFallback?: boolean }} options
   */
  async function saveAndPublish(data, options) {
    const opts = options || {};
    const published = await publish(data, { token: opts.token });
    if (published.ok) return published;

    // Local fallback when offline / no GitHub (dev static server)
    if (opts.localFallback !== false) {
      const local = save(data);
      if (local.ok) {
        return {
          ok: true,
          localOnly: true,
          publishError: published.error,
          warning:
            published.error ||
            'Saved as local draft only on this device — not visible to the public site.'
        };
      }
      return {
        ok: false,
        error: local.error || published.error,
        publishError: published.error
      };
    }
    return published;
  }

  function resetToBundled() {
    clearLocal();
    cache = null;
    loadPromise = null;
    usingLocalDraft = false;
    usingDurable = false;
    durableSha = null;
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

  const DEFAULT_WRITE_REVIEW_URL =
    'https://www.google.com/search?q=Black+Rabbit+Landscaping+Yelm+WA';

  function reviewStats(list) {
    const reviews = Array.isArray(list) ? list : [];
    const count = reviews.length;
    const fiveStar = reviews.filter((r) => Number(r.rating) >= 5).length;
    const googleCount = reviews.filter(
      (r) => String(r.source || '').toLowerCase() === 'google'
    ).length;
    const ratings = reviews
      .map((r) => Number(r.rating) || 0)
      .filter((n) => n > 0);
    const rating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : 5;
    return { count, fiveStar, googleCount, rating };
  }

  function reviewHeadline(stats) {
    const s = stats || {};
    const n = Number(s.userRatingCount != null ? s.userRatingCount : s.fiveStar || s.count || 0);
    const word = n === 1 ? 'review' : 'reviews';
    if (s.userRatingCount != null && s.rating) {
      return n + ' Google ' + word;
    }
    return n + ' five-star Google ' + word;
  }

  function applyWriteReviewLinks(url) {
    if (!url || typeof document === 'undefined') return;
    document.querySelectorAll('a[data-google-review-link]').forEach((a) => {
      a.href = url;
    });
  }

  function applyReviewStats(stats) {
    const s = stats || {};
    if (typeof document === 'undefined') return s;
    const headline = reviewHeadline(s);
    document.querySelectorAll('[data-review-headline]').forEach((el) => {
      el.textContent = headline;
    });
    document.querySelectorAll('[data-review-count]').forEach((el) => {
      el.textContent = String(
        s.userRatingCount != null ? s.userRatingCount : s.count || 0
      );
    });
    if (s.writeReviewUrl) applyWriteReviewLinks(s.writeReviewUrl);

    document.querySelectorAll('script[type="application/ld+json"]').forEach((script) => {
      try {
        const data = JSON.parse(script.textContent);
        if (!data || typeof data !== 'object' || !data.aggregateRating) return;
        const count = String(
          s.userRatingCount != null ? s.userRatingCount : s.count || data.aggregateRating.reviewCount
        );
        const rating = String(s.rating || data.aggregateRating.ratingValue || '5');
        let changed = false;
        if (String(data.aggregateRating.reviewCount) !== count) {
          data.aggregateRating.reviewCount = count;
          changed = true;
        }
        if (s.rating && String(data.aggregateRating.ratingValue) !== rating) {
          data.aggregateRating.ratingValue = rating;
          changed = true;
        }
        if (changed) script.textContent = JSON.stringify(data);
      } catch {
        /* ignore bad JSON-LD */
      }
    });
    return s;
  }

  async function refreshPublicReviewStats() {
    const data = await load();
    const local = reviewStats(data.reviews);
    applyReviewStats(local);
    try {
      const res = await fetch('/api/reviews', { cache: 'no-store' });
      if (!res.ok) return local;
      const remote = await res.json();
      if (!remote) return local;
      applyReviewStats({
        ...local,
        rating: remote.rating || local.rating,
        userRatingCount:
          remote.userRatingCount != null ? remote.userRatingCount : undefined,
        writeReviewUrl: remote.writeReviewUrl || DEFAULT_WRITE_REVIEW_URL
      });
    } catch {
      /* offline / API not deployed yet */
    }
    return local;
  }

  async function syncGoogleReviews(options) {
    const opts = options || {};
    const headers = { 'Content-Type': 'application/json' };
    if (opts.token) headers['X-Lead-Token'] = opts.token;
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({ action: 'sync' })
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 401) {
        return {
          ok: false,
          status: 401,
          error:
            'Admin token required. Paste LEAD_ADMIN_TOKEN (same as leads), Save on this device, then Sync.'
        };
      }
      if (!res.ok || body.ok === false) {
        return {
          ok: false,
          status: res.status,
          error: (body && body.error) || 'Google sync failed (HTTP ' + res.status + ')'
        };
      }
      await reload();
      return body;
    } catch (e) {
      return { ok: false, error: (e && e.message) || 'Google sync network error' };
    }
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

  /**
   * Resolve portfolio image src. media/portfolio/* lives on GitHub immediately after upload;
   * raw.githubusercontent.com works before Vercel redeploy finishes.
   */
  function resolveImageUrl(image) {
    const s = String(image || '').trim();
    if (!s) return '';
    if (/^(https?:|data:|blob:)/i.test(s)) return s;
    if (s.startsWith('media/portfolio/') || s.startsWith('/media/portfolio/')) {
      const path = s.replace(/^\/+/, '');
      return 'https://raw.githubusercontent.com/jkillen5150/BlackRabbitApp2026/main/' + path;
    }
    return s;
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.readAsDataURL(file);
    });
  }

  function looksLikeHeic(file) {
    const type = String((file && file.type) || '');
    const name = String((file && file.name) || '');
    return /heic|heif/i.test(type) || /\.heic$/i.test(name) || /\.heif$/i.test(name);
  }

  function heicHelpMessage() {
    return (
      'iPhone HEIC photos often fail in the browser. In Photos, share/export as JPEG, ' +
      'or set Settings → Camera → Formats → Most Compatible, then try again.'
    );
  }

  /** Load via <img> + object URL (works for most phone gallery JPEGs). */
  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      let settled = false;
      const finish = (fn, arg) => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        fn(arg);
      };
      img.onload = () => finish(resolve, img);
      img.onerror = () =>
        finish(reject, new Error('Could not open that image. Try JPEG or PNG.'));
      // Some mobile browsers need decode() after src is set
      img.src = url;
      if (typeof img.decode === 'function') {
        img.decode().then(() => finish(resolve, img)).catch(() => {
          /* wait for onload/onerror */
        });
      }
    });
  }

  /** FileReader data-URL fallback when object URL / ImageBitmap fails (older WebViews). */
  function loadImageViaFileReader(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read that file.'));
      reader.onload = () => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () =>
          reject(new Error('Could not open that image. Try JPEG or PNG.'));
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Prefer createImageBitmap (EXIF orientation) → Image + object URL → FileReader.
   * Phone gallery picks often have empty MIME types; we still attempt decode.
   */
  async function loadDrawable(file) {
    if (typeof createImageBitmap === 'function') {
      try {
        return await createImageBitmap(file, { imageOrientation: 'from-image' });
      } catch {
        try {
          return await createImageBitmap(file);
        } catch {
          /* fall through */
        }
      }
    }
    try {
      return await loadImageElement(file);
    } catch {
      return loadImageViaFileReader(file);
    }
  }

  function drawScaledToDataUrl(img, maxEdge, quality) {
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    if (!width || !height) return null;

    let w = width;
    let h = height;
    const longEdge = Math.max(w, h);
    if (longEdge > maxEdge) {
      const scale = maxEdge / longEdge;
      w = Math.max(1, Math.round(w * scale));
      h = Math.max(1, Math.round(h * scale));
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    // White fill so transparent PNGs don’t go black as JPEG
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Resize + compress a photo for localStorage drafts.
   * Phone photos (3–12MB) are reduced to a JPEG data URL that usually fits.
   * Tries to decode first (including some HEIC cases on iOS Safari) before failing.
   */
  async function compressImageFile(file, options) {
    const opts = options || {};
    const maxEdge = opts.maxEdge || 1280;
    const quality = opts.quality == null ? 0.72 : opts.quality;
    const maxDataUrlChars = opts.maxDataUrlChars || 900000;

    if (!file) {
      throw new Error('Please choose an image file (JPEG or PNG works best).');
    }
    // size can be 0 briefly on some mobile pickers — only reject missing File objects
    if (typeof file.size === 'number' && file.size === 0) {
      throw new Error(
        'That photo came through empty. Try again, or pick a different shot from your gallery.'
      );
    }

    const type = String(file.type || '');
    const name = String(file.name || '');
    // Empty MIME is common on Android/iOS gallery — only reject clear non-images
    if (type && !type.startsWith('image/') && type !== 'application/octet-stream') {
      throw new Error('That file is not an image. Use JPEG or PNG.');
    }

    let img;
    try {
      img = await loadDrawable(file);
    } catch (err) {
      if (looksLikeHeic(file)) {
        throw new Error(heicHelpMessage());
      }
      throw err instanceof Error
        ? err
        : new Error('Could not open that image. Try JPEG or PNG from your gallery.');
    }

    try {
      let dataUrl = drawScaledToDataUrl(img, maxEdge, quality);
      if (!dataUrl) {
        throw new Error('Could not process that image. Try JPEG or PNG, or paste an image URL.');
      }

      // Still large → smaller edge / lower quality
      if (dataUrl.length > 900000) {
        dataUrl = drawScaledToDataUrl(img, 1000, 0.6) || dataUrl;
      }
      if (dataUrl.length > 1100000) {
        dataUrl = drawScaledToDataUrl(img, 800, 0.52) || dataUrl;
      }
      if (dataUrl.length > maxDataUrlChars) {
        dataUrl = drawScaledToDataUrl(img, 640, 0.45) || dataUrl;
      }
      if (dataUrl.length > maxDataUrlChars) {
        throw new Error(
          'That photo is still too large after compression. Try a smaller shot or paste an image URL / path.'
        );
      }
      return dataUrl;
    } catch (err) {
      if (looksLikeHeic(file)) {
        throw new Error(heicHelpMessage());
      }
      throw err instanceof Error
        ? err
        : new Error('Could not process that image. Try JPEG or PNG.');
    } finally {
      if (img && typeof img.close === 'function') {
        try {
          img.close();
        } catch {
          /* ignore */
        }
      }
    }
  }

  global.BRContent = {
    load,
    reload,
    getSync,
    save,
    publish,
    saveAndPublish,
    uploadPhoto,
    deletePhoto,
    resetToBundled,
    exportJson,
    isLocalDraft,
    isDurable,
    uid,
    stars,
    initial,
    renderReviewCard,
    reviewStats,
    reviewHeadline,
    applyReviewStats,
    refreshPublicReviewStats,
    syncGoogleReviews,
    DEFAULT_WRITE_REVIEW_URL,
    formatDate,
    escapeHtml,
    escapeAttr,
    resolveImageUrl,
    fileToDataUrl,
    compressImageFile,
    STORAGE_KEY
  };
})(window);
