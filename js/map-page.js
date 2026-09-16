/**
 * Leaflet service-area map
 * - Past-job / secured pins only (approximate — never street addresses)
 * - Client pins colored by city
 * - City centers are not pinned: South Sound locals already know the towns
 */
(function () {
  let map;
  let layerGroup;

  const CITY_COLORS = {
    Lacey: '#2563eb',
    Olympia: '#7c3aed',
    Yelm: '#16a34a',
    Rainier: '#0d9488',
    Tumwater: '#ea580c',
    Roy: '#db2777',
    Tenino: '#ca8a04',
    Spanaway: '#d97706'
  };
  const DEFAULT_COLOR = '#d97706';

  function isCity(p) {
    return (p.type || 'city') === 'city';
  }

  function cityColor(city) {
    if (!city) return DEFAULT_COLOR;
    const key = Object.keys(CITY_COLORS).find(
      (k) => k.toLowerCase() === String(city).trim().toLowerCase()
    );
    return key ? CITY_COLORS[key] : DEFAULT_COLOR;
  }

  function clientIcon(color) {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;background:${color};
        border:2px solid #fff;border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10]
    });
  }

  function publicLabel(p) {
    return p.label || (p.city ? `Past service · ${p.city} area` : 'Past service (approx.)');
  }

  /** Never expose street-level address for client pins */
  function publicDetail(p) {
    return {
      line: p.city ? `${p.city} area` : 'Approximate location',
      note: p.note || 'Approximate — exact address not shown'
    };
  }

  async function init() {
    const el = document.getElementById('service-map');
    if (!el || typeof L === 'undefined') return;

    map = L.map('service-map').setView([46.95, -122.7], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);

    layerGroup = L.layerGroup().addTo(map);
    await draw();
    window.addEventListener('br:content-updated', draw);
  }

  async function draw() {
    const data = await BRContent.load();
    const clients = (data.pins || []).filter((p) => !isCity(p));
    const listJobs = document.getElementById('pin-list-jobs');
    const legendEl = document.getElementById('map-legend');

    layerGroup.clearLayers();

    const bounds = [];
    const citiesUsed = new Map();

    clients.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const color = cityColor(p.city);
      const cityKey = (p.city && String(p.city).trim()) || 'Other';
      if (!citiesUsed.has(cityKey)) citiesUsed.set(cityKey, color);

      const detail = publicDetail(p);
      const m = L.marker([p.lat, p.lng], { icon: clientIcon(color), zIndexOffset: 100 }).addTo(layerGroup);
      m.bindPopup(
        `<strong>${BRContent.escapeHtml(publicLabel(p))}</strong><br>
         ${BRContent.escapeHtml(detail.line)}<br>
         <em>${BRContent.escapeHtml(detail.note)}</em>`
      );
      bounds.push([p.lat, p.lng]);
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }

    if (legendEl) {
      const paletteOrder = ['Lacey', 'Olympia', 'Yelm', 'Rainier', 'Tumwater', 'Roy', 'Tenino', 'Spanaway'];
      const ordered = [];
      paletteOrder.forEach((name) => {
        if (citiesUsed.has(name)) ordered.push([name, citiesUsed.get(name)]);
      });
      citiesUsed.forEach((color, name) => {
        if (!paletteOrder.includes(name)) ordered.push([name, color]);
      });

      const chips = ordered
        .map(
          ([name, color]) =>
            `<span class="map-chip" style="border-color:${color};color:${color};">● ${BRContent.escapeHtml(name)}</span>`
        )
        .join('');

      legendEl.innerHTML =
        chips ||
        `<span class="map-chip" style="border-color:${DEFAULT_COLOR};color:#b45309;">● Past jobs (approx.)</span>`;
    }

    if (listJobs) {
      if (!clients.length) {
        listJobs.innerHTML =
          '<div class="empty-state">No approximate job pins yet — paste towns or addresses privately and we’ll add fuzzy pins only.</div>';
      } else {
        listJobs.innerHTML = clients
          .map((p) => {
            const detail = publicDetail(p);
            const color = cityColor(p.city);
            return `
          <div class="pin-list-item">
            <div class="pin-dot pin-dot-client" style="background:${color};border-color:${color};" aria-hidden="true"></div>
            <div>
              <h4>${BRContent.escapeHtml(publicLabel(p))}</h4>
              <p>${BRContent.escapeHtml(detail.line)}</p>
              ${detail.note ? `<p>${BRContent.escapeHtml(detail.note)}</p>` : ''}
            </div>
          </div>`;
          })
          .join('');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
