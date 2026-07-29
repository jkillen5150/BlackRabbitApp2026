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

  function quotaErrorMessage() {
    return (
      'Browser storage is full (portfolio photos live in this device’s local draft). ' +
      'Export content.json, remove an older photo, or use a smaller image / image URL.'
    );
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

  /**
   * Persist admin draft. Returns { ok: true } or { ok: false, error }.
   * Never throws QuotaExceededError to the form handlers.
   */
  function save(data) {
    const normalized = normalize(data);
    try {
      // If we never fetched bundled (offline), still save; basedOn may be null
      writeLocal({
        basedOn: bundledFingerprint,
        ...normalized
      });
      return { ok: true };
    } catch (e) {
      const name = e && e.name;
      if (name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED' || (e && e.code === 22)) {
        return { ok: false, error: quotaErrorMessage() };
      }
      return { ok: false, error: (e && e.message) || 'Could not save draft.' };
    }
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
    compressImageFile,
    STORAGE_KEY
  };
})(window);
