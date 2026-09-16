/**
 * Leaflet service-area map
 * - Secured / past-job pins, colored by city group
 * - Approximate only — never street addresses or client names
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
    Spanaway: '#d97706',
    'Thurston County': '#64748b'
  };
  const DEFAULT_COLOR = '#d97706';

  function isCity(p) {
    return (p.type || 'city') === 'city';
  }

  function cityColor(city) {
    if (!city) return DEFAULT_COLOR;
    return CITY_COLORS[city] || DEFAULT_COLOR;
  }

  function clientIcon(color) {
    const c = color || DEFAULT_COLOR;
    return L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;background:${c};
        border:2px solid #fff;border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10]
    });
  }

  function publicLabel(p) {
    return p.label || (p.city ? `Secured · ${p.city} area` : 'Secured (approx.)');
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
    const usedCities = new Set();
    clients.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const color = cityColor(p.city);
      if (p.city) usedCities.add(p.city);
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
      const cities = Array.from(usedCities).sort();
      const chips = cities.length
        ? cities
            .map((c) => {
              const col = cityColor(c);
              return `<span class="map-chip" style="border-color:${col};color:${col};">● ${BRContent.escapeHtml(c)}</span>`;
            })
            .join('')
        : `<span class="map-chip" style="border-color:${DEFAULT_COLOR};color:#b45309;">● Secured places (approx.)</span>`;
      legendEl.innerHTML = chips;
    }

    if (listJobs) {
      if (!clients.length) {
        listJobs.innerHTML =
          '<div class="empty-state">No approximate job pins yet — paste towns or addresses privately and we’ll add fuzzy pins only.</div>';
      } else {
        const sorted = clients.slice().sort((a, b) => String(a.city || '').localeCompare(String(b.city || '')));
        listJobs.innerHTML = sorted
          .map((p) => {
            const detail = publicDetail(p);
            const col = cityColor(p.city);
            return `
          <div class="pin-list-item">
            <div class="pin-dot" style="background:${col};border-color:${col};" aria-hidden="true"></div>
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
