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

  await BRContent.load();
  await refreshAll();
  wireForms();
});

async function refreshAll() {
  const data = await BRContent.load();
  renderReviews(data.reviews);
  renderPortfolio(data.portfolio);
  renderPins(data.pins);
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
    BRContent.save(data);
    e.target.reset();
    await refreshAll();
  });

  document.getElementById('form-portfolio').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const file = fd.get('photo');
    let image = String(fd.get('imageUrl') || '').trim();
    if (file && file.size) {
      if (file.size > 2.5 * 1024 * 1024) {
        alert('Please use a photo under ~2.5MB (or host it and paste a URL).');
        return;
      }
      image = await BRContent.fileToDataUrl(file);
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
    BRContent.save(data);
    e.target.reset();
    await refreshAll();
  });

  document.getElementById('form-pin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    let lat = parseFloat(fd.get('lat'));
    let lng = parseFloat(fd.get('lng'));
    const address = String(fd.get('address') || '').trim();

    // If no coords, try Nominatim geocode (OpenStreetMap)
    if ((Number.isNaN(lat) || Number.isNaN(lng)) && address) {
      try {
        const q = encodeURIComponent(address + ', Washington, USA');
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
      alert('Could not place pin. Enter lat/lng or a full address we can geocode.');
      return;
    }

    const data = await BRContent.load();
    data.pins.unshift({
      id: BRContent.uid('pin'),
      label: String(fd.get('label') || '').trim() || 'Client job',
      address,
      lat,
      lng,
      city: String(fd.get('city') || '').trim(),
      note: String(fd.get('note') || '').trim()
    });
    BRContent.save(data);
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
      BRContent.save(data);
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
      BRContent.save(data);
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
        <strong>${BRContent.escapeHtml(p.label)}</strong><br>
        <span style="color:#666">${BRContent.escapeHtml(p.address || '')} (${p.lat?.toFixed?.(4)}, ${p.lng?.toFixed?.(4)})</span>
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
      BRContent.save(data);
      await refreshAll();
    });
  });
}
