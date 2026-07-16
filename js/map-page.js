/**
 * Leaflet service-area map
 * - City pins: main towns we serve (exact city centers OK)
 * - Client pins: approximate only — never show street addresses publicly
 */
(function () {
  let map;
  let layerGroup;

  function isCity(p) {
    return (p.type || 'city') === 'city';
  }

  function cityIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:28px;height:28px;background:#2e5a2e;
        border:3px solid #fff;border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        box-shadow:0 2px 8px rgba(0,0,0,.35);
      "></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  }

  function clientIcon() {
    return L.divIcon({
      className: '',
      html: `<div style="
        width:14px;height:14px;background:#d97706;
        border:2px solid #fff;border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,.3);
      "></div>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10]
    });
  }

  function publicLabel(p) {
    if (isCity(p)) return p.label || p.city || 'Service area';
    return p.label || (p.city ? `Past service · ${p.city} area` : 'Past service (approx.)');
  }

  /** Never expose street-level address for client pins */
  function publicDetail(p) {
    if (isCity(p)) {
      return {
        line: p.address || p.city || '',
        note: p.note || ''
      };
    }
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
    const pins = data.pins || [];
    const areas = data.serviceAreas || [];
    const listCities = document.getElementById('pin-list-cities');
    const listJobs = document.getElementById('pin-list-jobs');
    const listEl = document.getElementById('pin-list');
    const legendEl = document.getElementById('map-legend');

    layerGroup.clearLayers();

    const bounds = [];
    const cities = pins.filter(isCity);
    const clients = pins.filter((p) => !isCity(p));

    cities.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const detail = publicDetail(p);
      const m = L.marker([p.lat, p.lng], { icon: cityIcon(), zIndexOffset: 200 }).addTo(layerGroup);
      m.bindPopup(
        `<strong>${BRContent.escapeHtml(publicLabel(p))}</strong><br>
         ${BRContent.escapeHtml(detail.line)}<br>
         <em>${BRContent.escapeHtml(detail.note)}</em>`
      );
      bounds.push([p.lat, p.lng]);
    });

    clients.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const detail = publicDetail(p);
      const m = L.marker([p.lat, p.lng], { icon: clientIcon(), zIndexOffset: 100 }).addTo(layerGroup);
      m.bindPopup(
        `<strong>${BRContent.escapeHtml(publicLabel(p))}</strong><br>
         ${BRContent.escapeHtml(detail.line)}<br>
         <em>${BRContent.escapeHtml(detail.note)}</em>`
      );
      bounds.push([p.lat, p.lng]);
    });

    areas.forEach((a) => {
      if (a.lat == null || a.lng == null) return;
      L.circle([a.lat, a.lng], {
        radius: 2200,
        color: '#2e5a2e',
        fillColor: '#2e5a2e',
        fillOpacity: 0.08,
        weight: 1
      }).addTo(layerGroup);
    });

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }

    if (legendEl) {
      legendEl.innerHTML = `
        <span class="map-chip">📍 Towns we serve</span>
        <span class="map-chip" style="border-color:#d97706;color:#b45309;">● Past jobs (approx.)</span>
      `;
    }

    function listHtml(items, emptyMsg) {
      if (!items.length) {
        return `<div class="empty-state">${emptyMsg}</div>`;
      }
      return items
        .map((p) => {
          const detail = publicDetail(p);
          const dotClass = isCity(p) ? 'pin-dot' : 'pin-dot pin-dot-client';
          return `
          <div class="pin-list-item">
            <div class="${dotClass}" aria-hidden="true"></div>
            <div>
              <h4>${BRContent.escapeHtml(publicLabel(p))}</h4>
              <p>${BRContent.escapeHtml(detail.line)}</p>
              ${detail.note ? `<p>${BRContent.escapeHtml(detail.note)}</p>` : ''}
            </div>
          </div>`;
        })
        .join('');
    }

    if (listCities) {
      listCities.innerHTML = listHtml(cities, 'No city pins yet.');
    }
    if (listJobs) {
      listJobs.innerHTML = listHtml(
        clients,
        'No approximate job pins yet — paste towns or addresses privately and we’ll add fuzzy pins only.'
      );
    }
    // Fallback single list if page still has old markup
    if (listEl && !listCities) {
      listEl.innerHTML = listHtml(pins, 'No pins yet.');
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
