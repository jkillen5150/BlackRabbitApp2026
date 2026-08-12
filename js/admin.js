document.addEventListener('DOMContentLoaded', async () => {
  if (!BRAuth.requireAdmin()) return;

  const session = BRAuth.getSession();
  document.getElementById('admin-who').textContent = session?.name || session?.username || 'Admin';

  document.getElementById('btn-logout').addEventListener('click', () => {
    BRAuth.logout();
    window.location.href = 'login.html?role=admin';
  });

  document.getElementById('btn-export').addEventListener('click', () => BRContent.exportJson());
  document.getElementById('btn-reset').addEventListener('click', async () => {
    if (!confirm('Reset to the bundled content.json and clear local admin edits?')) return;
    await BRContent.resetToBundled();
    await refreshAll();
  });

  document.getElementById('btn-refresh-leads')?.addEventListener('click', () => loadLeads());
  document.getElementById('btn-save-lead-token')?.addEventListener('click', () => {
    const input = document.getElementById('lead-admin-token');
    const val = (input && input.value ? input.value : '').trim();
    setLeadToken(val);
    const meta = document.getElementById('leads-meta');
    if (meta) {
      meta.textContent = val
        ? 'Lead token saved on this device. Loading leads…'
        : 'Lead token cleared on this device.';
      meta.style.color = val ? '#2e5a2e' : '#666';
    }
    if (input) {
      input.classList.remove('lead-token-needed');
      if (val) input.placeholder = 'Token saved on this device (edit to change)';
    }
    loadLeads();
  });

  // Enter in token field = save + load (no extra clicks)
  document.getElementById('lead-admin-token')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-save-lead-token')?.click();
    }
  });

  // Prefill from localStorage so you are not re-prompted every visit
  const tokenInput = document.getElementById('lead-admin-token');
  const existing = getLeadToken();
  if (tokenInput && existing) {
    tokenInput.value = existing;
    tokenInput.placeholder = 'Token saved on this device (edit to change)';
  }

  await BRContent.load();
  await refreshAll();
  wireForms();
  loadLeads();
  loadGoogleReviewStatus();
});

function updateDraftStatus() {
  const el = document.getElementById('admin-draft-status');
  if (!el || !window.BRContent) return;
  if (BRContent.isLocalDraft && BRContent.isLocalDraft()) {
    el.textContent =
      'Status: local draft only on this device — publish failed or API offline. Fix LEAD_ADMIN_TOKEN + GITHUB_TOKEN, then save again so the public site updates.';
    el.style.color = '#8a5a00';
  } else if (BRContent.isDurable && BRContent.isDurable()) {
    el.textContent =
      'Status: live content (GitHub-backed). Add/delete portfolio, reviews, and pins save for everyone.';
    el.style.color = '#2e5a2e';
  } else {
    el.textContent =
      'Status: showing static content.json (API not durable yet). Saves need GITHUB_TOKEN on Vercel.';
    el.style.color = '#8a5a00';
  }
}

/**
 * Persist content for everyone via /api/content. Falls back to local draft if API is down.
 * @returns {Promise<{ ok: boolean, error?: string, localOnly?: boolean, warning?: string }>}
 */
async function persistContent(data) {
  resolveLeadToken();
  const token = getLeadToken();
  if (BRContent.saveAndPublish) {
    return BRContent.saveAndPublish(data, { token, localFallback: true });
  }
  // Older content-store without publish
  return BRContent.save(data);
}

function alertPersistResult(result, okMessage) {
  if (!result || result.ok === false) {
    alert((result && result.error) || 'Could not save.');
    return false;
  }
  if (result.localOnly) {
    alert(
      (result.warning || 'Saved only as a local draft on this device.') +
        '\n\nPublic visitors will still see the old portfolio until publish works. ' +
        'Paste LEAD_ADMIN_TOKEN (same as leads), confirm GITHUB_TOKEN is on Vercel, then save again.'
    );
    return true;
  }
  if (okMessage) {
    // Soft success — status line already updates; avoid noisy alerts for every delete
  }
  return true;
}

async function refreshAll() {
  const data = await BRContent.load();
  renderReviews(data.reviews);
  renderPortfolio(data.portfolio);
  renderPins(data.pins);
  updateDraftStatus();
}

const LEAD_TOKEN_KEY = 'br_lead_token';

/** Prefer localStorage so token survives reloads/tabs; migrate old sessionStorage once. */
function getLeadToken() {
  try {
    let t = localStorage.getItem(LEAD_TOKEN_KEY) || '';
    if (!t) {
      t = sessionStorage.getItem(LEAD_TOKEN_KEY) || '';
      if (t) {
        localStorage.setItem(LEAD_TOKEN_KEY, t);
        sessionStorage.removeItem(LEAD_TOKEN_KEY);
      }
    }
    return (t || '').trim();
  } catch {
    return '';
  }
}

function setLeadToken(token) {
  const t = String(token || '').trim();
  try {
    if (t) {
      localStorage.setItem(LEAD_TOKEN_KEY, t);
      sessionStorage.removeItem(LEAD_TOKEN_KEY);
    } else {
      localStorage.removeItem(LEAD_TOKEN_KEY);
      sessionStorage.removeItem(LEAD_TOKEN_KEY);
    }
  } catch {
    /* ignore private mode quirks */
  }
}

/** Use saved token, or whatever is currently in the input (auto-save on request). */
function resolveLeadToken() {
  const input = document.getElementById('lead-admin-token');
  const typed = input && input.value ? String(input.value).trim() : '';
  const saved = getLeadToken();
  if (typed && typed !== saved) {
    setLeadToken(typed);
    return typed;
  }
  return saved || typed;
}

function leadAuthHeaders(extra) {
  const headers = Object.assign({}, extra || {});
  const token = resolveLeadToken();
  if (token) headers['X-Lead-Token'] = token;
  return headers;
}

function showLeadLockedUi(reason) {
  const list = document.getElementById('leads-list');
  const meta = document.getElementById('leads-meta');
  const input = document.getElementById('lead-admin-token');
  if (input) {
    input.classList.add('lead-token-needed');
    input.focus();
  }
  if (meta) {
    meta.textContent =
      reason ||
      'Locked — paste LEAD_ADMIN_TOKEN above, click “Save on this device”, then Refresh.';
    meta.style.color = '#8a5a00';
  }
  if (list) {
    list.innerHTML =
      '<div class="empty-state">' +
      '<strong>Lead list is locked.</strong> Paste the same <code>LEAD_ADMIN_TOKEN</code> you set on Vercel into the field above, ' +
      'click <strong>Save on this device</strong> once. No more pop-ups — it stays on this browser until you clear it. ' +
      'Public booking still works without this token.' +
      '</div>';
  }
}

async function loadLeads() {
  const list = document.getElementById('leads-list');
  const meta = document.getElementById('leads-meta');
  if (!list) return;
  list.innerHTML = '<p style="color:#666">Loading…</p>';
  try {
    // Sync input → localStorage before fetch so one paste is enough
    resolveLeadToken();

    const res = await fetch('/api/lead', { cache: 'no-store', headers: leadAuthHeaders() });
    if (res.status === 401) {
      const hadToken = !!getLeadToken();
      showLeadLockedUi(
        hadToken
          ? 'Token rejected — does not match LEAD_ADMIN_TOKEN on Vercel (or Vercel needs a redeploy after you rotated). Paste the new value, Save on this device, Refresh.'
          : 'Locked — paste LEAD_ADMIN_TOKEN above, Save on this device, then Refresh.'
      );
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const leads = data.leads || [];
    const input = document.getElementById('lead-admin-token');
    if (input) input.classList.remove('lead-token-needed');

    if (meta) {
      const lock = getLeadToken() ? ' · token OK' : '';
      if (data.durable) {
        meta.textContent = `${leads.length} lead(s) · durable storage on${lock}`;
        meta.style.color = '#666';
      } else {
        meta.textContent =
          `${leads.length} lead(s) · WARNING: GITHUB_TOKEN not set or not working — track links break after cold starts. Fix token on Vercel (Contents: Read and write), redeploy.${lock}`;
        meta.style.color = '#8a5a00';
      }
    }
    if (!leads.length) {
      list.innerHTML =
        '<div class="empty-state">No chat leads yet. When someone uses Ask AI → quote / connect me, they’ll show up here (and in your email).</div>';
      return;
    }
    list.innerHTML = leads
      .map((l) => {
        const st = BRContent.escapeHtml(l.status || 'new');
        const previews = Array.isArray(l.photoPreviews) ? l.photoPreviews : [];
        const photoCount = Number(l.photoCount) || previews.length || 0;
        const depositBadge = l.depositPaid
          ? '<span class="lead-status deposit_paid">deposit paid</span>'
          : '';
        let photosHtml = '';
        if (previews.length) {
          photosHtml =
            '<div class="lead-photos">' +
            previews
              .map(
                (src, i) =>
                  `<a href="${BRContent.escapeAttr(src)}" target="_blank" rel="noopener"><img src="${BRContent.escapeAttr(src)}" alt="Yard photo ${i + 1}"></a>`
              )
              .join('') +
            '</div>';
        } else if (photoCount > 0) {
          photosHtml = `<p class="lead-photo-note">${photoCount} yard photo(s) — check your email attachment</p>`;
        }
        return `
        <div class="lead-card" data-id="${BRContent.escapeAttr(l.id)}">
          <h4>${BRContent.escapeHtml(l.name || 'Customer')}
            <span class="lead-status ${st}">${st}</span>
            ${depositBadge}
          </h4>
          <p><strong>Phone:</strong> <a href="tel:${BRContent.escapeAttr(String(l.phone || '').replace(/\s/g, ''))}">${BRContent.escapeHtml(l.phone || '')}</a>
            · <a href="sms:${BRContent.escapeAttr(String(l.phone || '').replace(/\s/g, ''))}">Text</a></p>
          <p><strong>Address:</strong> ${BRContent.escapeHtml(l.address || '—')}</p>
          <p><strong>Need:</strong> ${BRContent.escapeHtml(l.need || '—')}</p>
          ${photosHtml}
          <p style="color:#888;font-size:0.8rem;">${BRContent.escapeHtml(l.createdAt || '')} · ${BRContent.escapeHtml(l.source || '')}</p>
          <p class="lead-track-line">${
            l.trackToken
              ? `<a href="/track?t=${BRContent.escapeAttr(l.trackToken)}" target="_blank" rel="noopener">Open track page</a>
                 · <button type="button" class="btn-sm btn-copy-track" data-token="${BRContent.escapeAttr(l.trackToken)}">Copy track link</button>`
              : '<span style="color:#999">No track link</span>'
          }</p>
          <div class="lead-actions">
            <button type="button" class="btn-sm" data-status="texted" data-id="${BRContent.escapeAttr(l.id)}">Texted</button>
            <button type="button" class="btn-sm" data-status="booked" data-id="${BRContent.escapeAttr(l.id)}">Booked</button>
            <button type="button" class="btn-sm" data-status="en_route" data-id="${BRContent.escapeAttr(l.id)}">On the way</button>
            <button type="button" class="btn-sm" data-status="done" data-id="${BRContent.escapeAttr(l.id)}">Done</button>
            <button type="button" class="btn-sm" data-status="new" data-id="${BRContent.escapeAttr(l.id)}">Reopen</button>
          </div>
        </div>`;
      })
      .join('');

    list.querySelectorAll('.btn-copy-track').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const token = btn.dataset.token;
        if (!token) return;
        const url = window.location.origin + '/track?t=' + encodeURIComponent(token);
        try {
          await navigator.clipboard.writeText(url);
          btn.textContent = 'Copied!';
          setTimeout(() => {
            btn.textContent = 'Copy track link';
          }, 1500);
        } catch {
          window.prompt('Copy track link:', url);
        }
      });
    });

    list.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          resolveLeadToken();
          const res = await fetch('/api/lead', {
            method: 'PATCH',
            headers: leadAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ id: btn.dataset.id, status: btn.dataset.status })
          });
          if (res.status === 401) {
            showLeadLockedUi(
              'Status update locked — paste the current LEAD_ADMIN_TOKEN, Save on this device, then try again.'
            );
            return;
          }
          if (!res.ok) throw new Error('HTTP ' + res.status);
          loadLeads();
        } catch {
          alert('Could not update status (is /api/lead live on Vercel?)');
        }
      });
    });
  } catch (e) {
    if (meta) meta.textContent = 'API offline or not on Vercel yet';
    list.innerHTML =
      '<div class="empty-state">Could not load leads from <code>/api/lead</code>. Chat still works for Q&amp;A; lead handoff needs the site on Vercel with this API. You still get homepage form emails via Web3Forms.</div>';
  }
}

function wireForms() {
  document.getElementById('form-review').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = await BRContent.load();
    data.reviews.unshift({
      id: BRContent.uid('rev'),
      name: String(fd.get('name') || '').trim(),
      location: String(fd.get('location') || '').trim(),
      rating: Number(fd.get('rating') || 5),
      text: String(fd.get('text') || '').trim(),
      source: String(fd.get('source') || 'Google'),
      date: String(fd.get('date') || new Date().toISOString().slice(0, 10)),
      featured: fd.get('featured') === 'on'
    });
    const result = await persistContent(data);
    if (!alertPersistResult(result)) return;
    e.target.reset();
    const src = e.target.querySelector('[name="source"]');
    if (src) src.value = 'Google';
    const featured = e.target.querySelector('[name="featured"]');
    if (featured) featured.checked = true;
    await refreshAll();
  });

  document.getElementById('btn-sync-google-reviews')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-sync-google-reviews');
    const status = document.getElementById('google-sync-status');
    if (btn) btn.disabled = true;
    if (status) {
      status.textContent = 'Talking to Google…';
      status.style.color = '#666';
    }
    resolveLeadToken();
    const result = await BRContent.syncGoogleReviews({ token: getLeadToken() });
    if (btn) btn.disabled = false;
    if (!result || result.ok === false) {
      if (status) {
        status.textContent = (result && result.error) || 'Sync failed.';
        status.style.color = '#8a2a2a';
      }
      return;
    }
    if (status) {
      status.textContent = result.note || 'Synced.';
      status.style.color = '#2e5a2e';
    }
    await refreshAll();
    loadGoogleReviewStatus();
  });

  /**
   * Portfolio photo upload — multi-select from gallery.
   * Pending compressed data URLs live here so submit does not re-read flaky Files.
   * Picking again appends (up to MAX_PORTFOLIO_BATCH).
   */
  const MAX_PORTFOLIO_BATCH = 12;
  /** @type {{ dataUrl: string, name: string }[]} */
  let portfolioPending = [];
  let portfolioCompressGen = 0;

  const photoInput = document.getElementById('portfolio-photo');
  const photoStatus = document.getElementById('portfolio-photo-status');
  const photoPreviews = document.getElementById('portfolio-photo-previews');
  const photoDropzone = document.getElementById('portfolio-dropzone');
  const photoDropzoneUi = document.getElementById('portfolio-dropzone-ui');
  const btnClearPhoto = document.getElementById('btn-clear-photo');
  const btnAddPortfolio = document.getElementById('btn-add-portfolio');

  function setPhotoStatus(msg, kind) {
    if (!photoStatus) return;
    photoStatus.textContent = msg || '';
    photoStatus.classList.remove('is-error', 'is-ok', 'is-busy');
    if (kind) photoStatus.classList.add(kind);
  }

  function totalPendingKb() {
    return Math.round(
      portfolioPending.reduce((sum, p) => sum + (p.dataUrl.length * 0.75) / 1024, 0)
    );
  }

  function updateDropzoneChrome() {
    const n = portfolioPending.length;
    if (photoDropzone) {
      photoDropzone.classList.toggle('has-preview', n > 0);
    }
    if (photoDropzoneUi) {
      // Keep the add affordance visible so multi-pass picks stay obvious
      if (n > 0) {
        photoDropzoneUi.hidden = false;
        const title = photoDropzoneUi.querySelector('.photo-dropzone-title');
        const hint = photoDropzoneUi.querySelector('.photo-dropzone-hint');
        if (title) title.textContent = 'Tap to add more photos';
        if (hint) {
          hint.textContent =
            n +
            ' ready · up to ' +
            MAX_PORTFOLIO_BATCH +
            ' in one batch · JPEG/PNG best';
        }
      } else {
        photoDropzoneUi.hidden = false;
        const title = photoDropzoneUi.querySelector('.photo-dropzone-title');
        const hint = photoDropzoneUi.querySelector('.photo-dropzone-hint');
        if (title) title.textContent = 'Tap to choose from gallery';
        if (hint) {
          hint.textContent = 'Select multiple · camera roll or desktop files · JPEG/PNG best';
        }
      }
    }
    if (btnClearPhoto) btnClearPhoto.hidden = n === 0;
    if (btnAddPortfolio) {
      btnAddPortfolio.textContent =
        n > 1 ? 'Add ' + n + ' portfolio items' : 'Add portfolio item(s)';
    }
  }

  function renderPortfolioPreviews() {
    if (!photoPreviews) {
      updateDropzoneChrome();
      return;
    }
    if (!portfolioPending.length) {
      photoPreviews.hidden = true;
      photoPreviews.innerHTML = '';
      updateDropzoneChrome();
      return;
    }
    photoPreviews.hidden = false;
    photoPreviews.innerHTML = portfolioPending
      .map((p, i) => {
        const label = BRContent.escapeHtml(p.name || 'Photo ' + (i + 1));
        return (
          '<div class="photo-preview-thumb">' +
          '<img src="' +
          BRContent.escapeAttr(p.dataUrl) +
          '" alt="' +
          label +
          '">' +
          '<button type="button" class="photo-preview-remove" data-i="' +
          i +
          '" aria-label="Remove ' +
          label +
          '">×</button>' +
          '<span class="photo-preview-label">' +
          (i + 1) +
          '</span>' +
          '</div>'
        );
      })
      .join('');

    photoPreviews.querySelectorAll('.photo-preview-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const i = Number(btn.getAttribute('data-i'));
        if (!Number.isFinite(i)) return;
        portfolioPending.splice(i, 1);
        renderPortfolioPreviews();
        if (!portfolioPending.length) {
          setPhotoStatus('No files chosen yet.');
        } else {
          setPhotoStatus(
            portfolioPending.length +
              ' photo' +
              (portfolioPending.length > 1 ? 's' : '') +
              ' ready (~' +
              totalPendingKb() +
              ' KB). Add a title, then save.',
            'is-ok'
          );
        }
      });
    });
    updateDropzoneChrome();
  }

  function clearPortfolioPhotoUi() {
    portfolioPending = [];
    portfolioCompressGen += 1;
    if (photoDropzone) photoDropzone.classList.remove('has-preview', 'is-busy', 'is-error');
    if (photoInput) photoInput.value = '';
    renderPortfolioPreviews();
    setPhotoStatus('No files chosen yet.');
  }

  async function processPortfolioFiles(fileList) {
    const files = Array.from(fileList || []).filter(Boolean);
    if (!files.length) return;

    const room = MAX_PORTFOLIO_BATCH - portfolioPending.length;
    if (room <= 0) {
      setPhotoStatus(
        'Max ' + MAX_PORTFOLIO_BATCH + ' photos per batch. Remove some or save first.',
        'is-error'
      );
      if (photoInput) photoInput.value = '';
      return;
    }

    const take = files.slice(0, room);
    const skippedOverCap = files.length - take.length;
    const gen = ++portfolioCompressGen;

    if (photoDropzone) {
      photoDropzone.classList.add('is-busy');
      photoDropzone.classList.remove('is-error');
    }

    let added = 0;
    const errors = [];

    for (let i = 0; i < take.length; i++) {
      if (gen !== portfolioCompressGen) return;
      const file = take[i];
      const label = file.name || 'photo ' + (i + 1);
      setPhotoStatus(
        'Compressing ' + (i + 1) + ' of ' + take.length + ' — “' + label + '”…',
        'is-busy'
      );

      if (file.size > 20 * 1024 * 1024) {
        errors.push(label + ' (over 20MB)');
        continue;
      }

      try {
        const dataUrl = await BRContent.compressImageFile(file);
        if (gen !== portfolioCompressGen) return;
        portfolioPending.push({
          dataUrl,
          name: label
        });
        added += 1;
        renderPortfolioPreviews();
      } catch (err) {
        console.error(err);
        errors.push(label + (err && err.message ? ': ' + err.message : ''));
      }
    }

    if (photoInput) photoInput.value = '';
    if (gen !== portfolioCompressGen) return;

    if (photoDropzone) {
      photoDropzone.classList.remove('is-busy');
      if (errors.length && !portfolioPending.length) {
        photoDropzone.classList.add('is-error');
      } else {
        photoDropzone.classList.remove('is-error');
      }
    }

    const parts = [];
    if (portfolioPending.length) {
      parts.push(
        portfolioPending.length +
          ' photo' +
          (portfolioPending.length > 1 ? 's' : '') +
          ' ready (~' +
          totalPendingKb() +
          ' KB)'
      );
    }
    if (added && portfolioPending.length > added) {
      parts.push('added ' + added + ' this pick');
    }
    if (skippedOverCap > 0) {
      parts.push(skippedOverCap + ' skipped (batch full)');
    }
    if (errors.length) {
      parts.push(
        errors.length +
          ' failed' +
          (errors.length <= 2 ? ' — ' + errors.join('; ') : '')
      );
    }

    if (!portfolioPending.length) {
      setPhotoStatus(
        errors.length
          ? errors[0]
          : 'Could not load those photos. Try JPEG/PNG from your gallery.',
        'is-error'
      );
      return;
    }

    setPhotoStatus(
      parts.join(' · ') + '. Add a title, then tap save. Tap the box again to add more.',
      errors.length ? 'is-busy' : 'is-ok'
    );
  }

  if (photoInput) {
    photoInput.addEventListener('change', () => {
      const list = photoInput.files;
      if (!list || !list.length) return;
      processPortfolioFiles(list);
    });
  }

  if (btnClearPhoto) {
    btnClearPhoto.addEventListener('click', () => clearPortfolioPhotoUi());
  }

  // Desktop: drag & drop (multi) onto the zone
  if (photoDropzone) {
    ['dragenter', 'dragover'].forEach((evt) => {
      photoDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoDropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((evt) => {
      photoDropzone.addEventListener(evt, (e) => {
        e.preventDefault();
        e.stopPropagation();
        photoDropzone.classList.remove('is-dragover');
      });
    });
    photoDropzone.addEventListener('drop', (e) => {
      const list = e.dataTransfer && e.dataTransfer.files;
      if (list && list.length) processPortfolioFiles(list);
    });
  }

  document.getElementById('form-portfolio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const urlFallback = String(fd.get('imageUrl') || '').trim();

    const setBusy = (busy, label) => {
      if (!submitBtn) return;
      submitBtn.disabled = busy;
      submitBtn.textContent = busy
        ? label || 'Adding photos…'
        : portfolioPending.length > 1
          ? 'Add ' + portfolioPending.length + ' portfolio items'
          : 'Add portfolio item(s)';
    };

    try {
      setBusy(true);
      resolveLeadToken();
      const token = getLeadToken();

      // Fallback: files still on the input if user submitted mid-flow
      if (!portfolioPending.length && photoInput && photoInput.files && photoInput.files.length) {
        await processPortfolioFiles(photoInput.files);
      }

      /** @type {string[]} */
      let images = portfolioPending.map((p) => p.dataUrl);
      if (!images.length && urlFallback) {
        images = [urlFallback];
      }

      if (!images.length) {
        alert(
          'Add one or more photos from your gallery (or an image URL), wait until they say Ready, then submit.'
        );
        return;
      }

      const baseTitle = String(fd.get('title') || '').trim();
      const location = String(fd.get('location') || '').trim();
      const description = String(fd.get('description') || '').trim();
      const date = new Date().toISOString().slice(0, 10);
      const multi = images.length > 1;

      setPhotoStatus(
        multi
          ? 'Uploading ' + images.length + ' photos to the live site…'
          : 'Uploading photo to the live site…',
        'is-busy'
      );

      // Upload each data-URL to media/portfolio/ so content.json stays small
      const publishedPaths = [];
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const id = BRContent.uid('port');
        if (String(image).startsWith('data:')) {
          setPhotoStatus(
            'Uploading photo ' + (i + 1) + ' of ' + images.length + '…',
            'is-busy'
          );
          if (!BRContent.uploadPhoto) {
            alert('Update content-store.js is missing uploadPhoto — hard-refresh Admin.');
            return;
          }
          const up = await BRContent.uploadPhoto(image, { token, id });
          if (!up.ok) {
            if (up.status === 401) {
              alert(
                'Admin token required to publish photos. Paste LEAD_ADMIN_TOKEN above (same as leads), Save on this device, then try again.'
              );
              showLeadLockedUi(
                'Token needed for portfolio publish — paste LEAD_ADMIN_TOKEN, Save on this device.'
              );
            } else {
              alert(up.error || 'Photo upload failed.');
            }
            setPhotoStatus(up.error || 'Upload failed.', 'is-error');
            return;
          }
          // Prefer public image URL (raw GitHub) so it shows before Vercel redeploy
          publishedPaths.push({ id, image: up.image || up.path });
        } else {
          // URL or existing path — keep as-is
          publishedPaths.push({ id, image: String(image).trim() });
        }
      }

      const newItems = publishedPaths.map((p, i) => ({
        id: p.id,
        title: multi ? baseTitle + ' (' + (i + 1) + ')' : baseTitle,
        location,
        description,
        image: p.image,
        date
      }));

      setPhotoStatus('Saving portfolio list…', 'is-busy');
      const data = await BRContent.load();
      // Keep selection order at the front of the list
      data.portfolio = newItems.concat(data.portfolio || []);

      const result = await persistContent(data);
      if (!result || result.ok === false) {
        alert((result && result.error) || 'Could not save photo(s).');
        setPhotoStatus(
          'Save failed — try fewer/smaller photos, or use image URL(s).',
          'is-error'
        );
        return;
      }
      const savedCount = newItems.length;
      form.reset();
      clearPortfolioPhotoUi();
      if (result.localOnly) {
        setPhotoStatus(
          'Local draft only — public site not updated. Fix token / GITHUB_TOKEN and save again.',
          'is-error'
        );
        alertPersistResult(result);
      } else {
        setPhotoStatus(
          savedCount > 1
            ? 'Published ' + savedCount + ' portfolio photos live. Open /portfolio to confirm.'
            : 'Published live. Open /portfolio to confirm.',
          'is-ok'
        );
      }
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert((err && err.message) || 'Could not add those photos. Try JPEG/PNG or an image URL.');
      setPhotoStatus(
        (err && err.message) || 'Upload failed. Try JPEG or PNG from your gallery.',
        'is-error'
      );
    } finally {
      setBusy(false);
    }
  });

  document.getElementById('form-pin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let lat = parseFloat(fd.get('lat'));
    let lng = parseFloat(fd.get('lng'));
    const address = String(fd.get('address') || '').trim();
    const city = String(fd.get('city') || '').trim();
    const type = String(fd.get('type') || 'client');
    const isClient = type !== 'city';

    // Geocode only as a placement aid; street never stored for client pins
    if ((Number.isNaN(lat) || Number.isNaN(lng)) && (address || city)) {
      try {
        const q = encodeURIComponent((address || city) + ', Washington, USA');
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
          { headers: { Accept: 'application/json' } }
        );
        const results = await res.json();
        if (results[0]) {
          lat = parseFloat(results[0].lat);
          lng = parseFloat(results[0].lon);
        }
      } catch {
        /* ignore */
      }
    }

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      alert('Could not place pin. Enter lat/lng, a city, or an address we can geocode.');
      return;
    }

    // Privacy: fuzzy offset (~0.4–0.9 km) so pins aren't house-accurate
    if (isClient) {
      const jitter = () => (Math.random() - 0.5) * 0.016; // ~±0.8 km at this latitude
      lat = Math.round((lat + jitter()) * 1000) / 1000; // ~100m precision max
      lng = Math.round((lng + jitter()) * 1000) / 1000;
    }

    const publicLabel =
      String(fd.get('label') || '').trim() ||
      (isClient
        ? city
          ? `Past service · ${city} area`
          : 'Past service (approx.)'
        : city || 'Service area');

    const data = await BRContent.load();
    data.pins.unshift({
      id: BRContent.uid('pin'),
      type: isClient ? 'client' : 'city',
      label: publicLabel,
      // Never persist street-level address for client/job pins
      address: isClient ? (city ? `${city} area` : 'Approximate area') : address || city,
      lat,
      lng,
      city,
      note: String(fd.get('note') || '').trim() || (isClient ? 'Approximate location' : '')
    });
    const result = await persistContent(data);
    if (!alertPersistResult(result)) return;
    e.target.reset();
    await refreshAll();
  });
}

async function loadGoogleReviewStatus() {
  const status = document.getElementById('google-sync-status');
  const link = document.getElementById('link-write-review');
  try {
    const res = await fetch('/api/reviews', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (link && data.writeReviewUrl) link.href = data.writeReviewUrl;
    if (!status || status.textContent) {
      // keep a just-finished sync note if present
      if (status && status.textContent && /Added |No new |Talking /.test(status.textContent)) return;
    }
    if (!status) return;
    if (!res.ok) {
      status.textContent = 'Google API not deployed yet — paste reviews by hand for now.';
      return;
    }
    if (data.error) {
      status.textContent = data.error;
      status.style.color = '#8a5a00';
      return;
    }
    if (!data.configured) {
      status.textContent =
        'Paste works now. Optional: add GOOGLE_PLACES_API_KEY on Vercel to Sync the latest 5 from Google.';
      status.style.color = '#666';
      return;
    }
    const bits = [];
    if (data.userRatingCount != null) bits.push(data.userRatingCount + ' Google reviews');
    if (data.rating != null) bits.push(data.rating + '★');
    status.textContent = bits.length
      ? 'Listing: ' + bits.join(' · ') + '. Sync pulls the newest 5.'
      : 'Places API is configured. Sync to pull the newest 5.';
    status.style.color = '#2e5a2e';
  } catch {
    if (status && !status.textContent) {
      status.textContent = 'Could not reach /api/reviews — paste still works.';
    }
  }
}

function renderReviews(list) {
  const ul = document.getElementById('list-reviews');
  ul.innerHTML = (list || [])
    .map(
      (r) => `
    <li>
      <div>
        <strong>${BRContent.escapeHtml(r.name)}</strong>
        ${BRContent.stars(r.rating)} · ${BRContent.escapeHtml(r.source || '')}<br>
        <span style="color:#666">${BRContent.escapeHtml((r.text || '').slice(0, 90))}${(r.text || '').length > 90 ? '…' : ''}</span>
      </div>
      <div class="actions">
        <button type="button" data-del-review="${BRContent.escapeAttr(r.id)}" class="btn-danger">Delete</button>
      </div>
    </li>`
    )
    .join('') || '<li>No reviews yet.</li>';

  ul.querySelectorAll('[data-del-review]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const data = await BRContent.load();
      data.reviews = data.reviews.filter((r) => r.id !== btn.dataset.delReview);
      const result = await persistContent(data);
      if (!alertPersistResult(result)) {
        btn.disabled = false;
        return;
      }
      await refreshAll();
    });
  });
}

function renderPortfolio(list) {
  const ul = document.getElementById('list-portfolio');
  ul.innerHTML = (list || [])
    .map(
      (p) => `
    <li>
      <div style="display:flex;gap:12px;align-items:center;">
        <img class="preview-thumb" src="${BRContent.escapeAttr(BRContent.resolveImageUrl ? BRContent.resolveImageUrl(p.image) : p.image)}" alt="">
        <div>
          <strong>${BRContent.escapeHtml(p.title)}</strong><br>
          <span style="color:#666">${BRContent.escapeHtml(p.location || '')}</span>
        </div>
      </div>
      <div class="actions">
        <button type="button" data-del-port="${BRContent.escapeAttr(p.id)}" class="btn-danger">Delete</button>
      </div>
    </li>`
    )
    .join('') || '<li>No portfolio items yet.</li>';

  ul.querySelectorAll('[data-del-port]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this portfolio photo from the live site?')) return;
      btn.disabled = true;
      const id = btn.dataset.delPort;
      const data = await BRContent.load();
      const removed = (data.portfolio || []).find((p) => p.id === id);
      data.portfolio = (data.portfolio || []).filter((p) => p.id !== id);
      const result = await persistContent(data);
      if (!alertPersistResult(result)) {
        btn.disabled = false;
        return;
      }
      // Best-effort remove media file for uploads we own (not seed IMG_*.jpeg)
      if (removed && removed.image && BRContent.deletePhoto) {
        resolveLeadToken();
        await BRContent.deletePhoto(removed.image, { token: getLeadToken() });
      }
      await refreshAll();
    });
  });
}

function renderPins(list) {
  const ul = document.getElementById('list-pins');
  ul.innerHTML = (list || [])
    .map(
      (p) => `
    <li>
      <div>
        <strong>${BRContent.escapeHtml(p.label)}</strong>
        <span style="color:#888;font-size:0.8rem;"> · ${BRContent.escapeHtml(p.type || 'city')}</span><br>
        <span style="color:#666">${BRContent.escapeHtml(p.city || p.address || '')} (${p.lat?.toFixed?.(3)}, ${p.lng?.toFixed?.(3)})</span>
      </div>
      <div class="actions">
        <button type="button" data-del-pin="${BRContent.escapeAttr(p.id)}" class="btn-danger">Delete</button>
      </div>
    </li>`
    )
    .join('') || '<li>No map pins yet.</li>';

  ul.querySelectorAll('[data-del-pin]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      const data = await BRContent.load();
      data.pins = data.pins.filter((p) => p.id !== btn.dataset.delPin);
      const result = await persistContent(data);
      if (!alertPersistResult(result)) {
        btn.disabled = false;
        return;
      }
      await refreshAll();
    });
  });
}
