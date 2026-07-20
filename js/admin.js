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
        ? 'Lead token saved for this browser session. Refreshing…'
        : 'Lead token cleared for this session.';
      meta.style.color = val ? '#2e5a2e' : '#666';
    }
    loadLeads();
  });

  // Prefill token field if already saved this session (does not reveal full secret length only)
  const tokenInput = document.getElementById('lead-admin-token');
  const existing = getLeadToken();
  if (tokenInput && existing) {
    tokenInput.value = existing;
    tokenInput.placeholder = 'Token saved for this session (edit to change)';
  }

  await BRContent.load();
  await refreshAll();
  wireForms();
  loadLeads();
});

function updateDraftStatus() {
  const el = document.getElementById('admin-draft-status');
  if (!el || !window.BRContent) return;
  if (BRContent.isLocalDraft && BRContent.isLocalDraft()) {
    el.textContent =
      'Status: local draft active on this device — Export + redeploy to publish, or Reset to defaults to match the live site.';
    el.style.color = '#8a5a00';
  } else {
    el.textContent = 'Status: showing bundled content.json (no local draft).';
    el.style.color = '#2e5a2e';
  }
}

async function refreshAll() {
  const data = await BRContent.load();
  renderReviews(data.reviews);
  renderPortfolio(data.portfolio);
  renderPins(data.pins);
  updateDraftStatus();
}

const LEAD_TOKEN_KEY = 'br_lead_token';

function getLeadToken() {
  try {
    return sessionStorage.getItem(LEAD_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function setLeadToken(token) {
  try {
    if (token) sessionStorage.setItem(LEAD_TOKEN_KEY, token);
    else sessionStorage.removeItem(LEAD_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function leadAuthHeaders(extra) {
  const headers = Object.assign({}, extra || {});
  const token = getLeadToken();
  if (token) headers['X-Lead-Token'] = token;
  return headers;
}

async function ensureLeadTokenOn401(res) {
  if (res.status !== 401) return false;
  const input = document.getElementById('lead-admin-token');
  if (input) {
    input.focus();
    input.classList.add('lead-token-needed');
  }
  const entered = window.prompt(
    'Lead list is locked. Paste LEAD_ADMIN_TOKEN from Vercel (same value you set in Project → Settings → Environment Variables):'
  );
  if (!entered) return false;
  const token = entered.trim();
  setLeadToken(token);
  if (input) {
    input.value = token;
    input.classList.remove('lead-token-needed');
  }
  return true;
}

async function loadLeads() {
  const list = document.getElementById('leads-list');
  const meta = document.getElementById('leads-meta');
  if (!list) return;
  list.innerHTML = '<p style="color:#666">Loading…</p>';
  try {
    let res = await fetch('/api/lead', { cache: 'no-store', headers: leadAuthHeaders() });
    if (res.status === 401 && (await ensureLeadTokenOn401(res))) {
      res = await fetch('/api/lead', { cache: 'no-store', headers: leadAuthHeaders() });
    }
    if (res.status === 401) {
      if (meta) {
        meta.textContent = 'Locked — set LEAD_ADMIN_TOKEN on Vercel, then paste it above.';
        meta.style.color = '#8a5a00';
      }
      list.innerHTML =
        '<div class="empty-state">Lead list is protected. Add <code>LEAD_ADMIN_TOKEN</code> in Vercel env, redeploy, paste the same token above, then Refresh. Public visitors cannot list leads without it. New Cut My Grass / chat leads still POST and email you normally.</div>';
      return;
    }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    const leads = data.leads || [];
    if (meta) {
      const lock = getLeadToken() ? ' · token OK' : '';
      meta.textContent = data.durable
        ? `${leads.length} lead(s) · durable storage on${lock}`
        : `${leads.length} lead(s) · ${data.note || 'email mode'}${lock}`;
      meta.style.color = '#666';
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
              ? `<a href="/track/?t=${BRContent.escapeAttr(l.trackToken)}" target="_blank" rel="noopener">Open track page</a>
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
        const url = window.location.origin + '/track/?t=' + encodeURIComponent(token);
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
          let res = await fetch('/api/lead', {
            method: 'PATCH',
            headers: leadAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ id: btn.dataset.id, status: btn.dataset.status })
          });
          if (res.status === 401 && (await ensureLeadTokenOn401(res))) {
            res = await fetch('/api/lead', {
              method: 'PATCH',
              headers: leadAuthHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ id: btn.dataset.id, status: btn.dataset.status })
            });
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
      source: String(fd.get('source') || 'Customer'),
      date: String(fd.get('date') || new Date().toISOString().slice(0, 10)),
      featured: fd.get('featured') === 'on'
    });
    const result = BRContent.save(data);
    if (!result || result.ok === false) {
      alert((result && result.error) || 'Could not save review.');
      return;
    }
    e.target.reset();
    await refreshAll();
  });

  const photoInput = document.getElementById('portfolio-photo');
  const photoStatus = document.getElementById('portfolio-photo-status');
  const photoPreview = document.getElementById('portfolio-photo-preview');
  if (photoInput && photoStatus) {
    photoInput.addEventListener('change', () => {
      const f = photoInput.files && photoInput.files[0];
      if (!f) {
        photoStatus.textContent = 'No file chosen yet.';
        if (photoPreview) {
          photoPreview.hidden = true;
          photoPreview.removeAttribute('src');
        }
        return;
      }
      const mb = (f.size / (1024 * 1024)).toFixed(1);
      photoStatus.textContent = `Selected: ${f.name} (${mb} MB) — will be compressed on save.`;
      if (photoPreview) {
        const url = URL.createObjectURL(f);
        photoPreview.src = url;
        photoPreview.hidden = false;
        photoPreview.onload = () => URL.revokeObjectURL(url);
      }
    });
  }

  document.getElementById('form-portfolio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const fd = new FormData(form);
    const file = fd.get('photo');
    let image = String(fd.get('imageUrl') || '').trim();

    const setBusy = (busy) => {
      if (!submitBtn) return;
      submitBtn.disabled = busy;
      submitBtn.textContent = busy ? 'Adding photo…' : 'Add portfolio item';
    };

    try {
      setBusy(true);
      if (file && typeof file === 'object' && file.size) {
        // Phone photos are often 4–12MB; we compress before saving to local draft
        if (file.size > 20 * 1024 * 1024) {
          alert('That photo is over 20MB. Pick a smaller shot or paste an image URL.');
          return;
        }
        if (photoStatus) photoStatus.textContent = 'Compressing photo…';
        image = await BRContent.compressImageFile(file);
        if (photoStatus) {
          const kb = Math.round((image.length * 0.75) / 1024);
          photoStatus.textContent = `Ready (~${kb} KB compressed). Saving…`;
        }
      }
      if (!image) {
        alert('Add a photo file or an image URL.');
        return;
      }

      const data = await BRContent.load();
      data.portfolio.unshift({
        id: BRContent.uid('port'),
        title: String(fd.get('title') || '').trim(),
        location: String(fd.get('location') || '').trim(),
        description: String(fd.get('description') || '').trim(),
        image,
        date: new Date().toISOString().slice(0, 10)
      });
      const result = BRContent.save(data);
      if (!result || result.ok === false) {
        alert((result && result.error) || 'Could not save photo.');
        if (photoStatus) photoStatus.textContent = 'Save failed — try a smaller photo or image URL.';
        return;
      }
      form.reset();
      if (photoStatus) photoStatus.textContent = 'No file chosen yet.';
      if (photoPreview) {
        photoPreview.hidden = true;
        photoPreview.removeAttribute('src');
      }
      await refreshAll();
    } catch (err) {
      console.error(err);
      alert((err && err.message) || 'Could not add that photo. Try JPEG/PNG or an image URL.');
      if (photoStatus) photoStatus.textContent = 'Upload failed. Try JPEG or PNG.';
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
    const result = BRContent.save(data);
    if (!result || result.ok === false) {
      alert((result && result.error) || 'Could not save pin.');
      return;
    }
    e.target.reset();
    await refreshAll();
  });
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
      const data = await BRContent.load();
      data.reviews = data.reviews.filter((r) => r.id !== btn.dataset.delReview);
      const result = BRContent.save(data);
      if (!result || result.ok === false) {
        alert((result && result.error) || 'Could not save.');
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
        <img class="preview-thumb" src="${BRContent.escapeAttr(p.image)}" alt="">
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
      const data = await BRContent.load();
      data.portfolio = data.portfolio.filter((p) => p.id !== btn.dataset.delPort);
      const result = BRContent.save(data);
      if (!result || result.ok === false) {
        alert((result && result.error) || 'Could not save.');
        return;
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
      const data = await BRContent.load();
      data.pins = data.pins.filter((p) => p.id !== btn.dataset.delPin);
      const result = BRContent.save(data);
      if (!result || result.ok === false) {
        alert((result && result.error) || 'Could not save.');
        return;
      }
      await refreshAll();
    });
  });
}
