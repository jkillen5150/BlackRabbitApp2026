/**
 * Leaflet service-area + client pin map
 */
(function () {
  let map;
  let layerGroup;

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
    const listEl = document.getElementById('pin-list');
    const legendEl = document.getElementById('map-legend');

    layerGroup.clearLayers();

    const rabbitIcon = L.divIcon({
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

    const bounds = [];

    pins.forEach((p) => {
      if (p.lat == null || p.lng == null) return;
      const m = L.marker([p.lat, p.lng], { icon: rabbitIcon }).addTo(layerGroup);
      m.bindPopup(
        `<strong>${BRContent.escapeHtml(p.label || p.city || 'Job site')}</strong><br>
         ${BRContent.escapeHtml(p.address || '')}<br>
         <em>${BRContent.escapeHtml(p.note || '')}</em>`
      );
      bounds.push([p.lat, p.lng]);
    });

    // Soft circles for named service towns (if no exact pin)
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
      const names = [...new Set([
        ...areas.map((a) => a.name),
        ...pins.map((p) => p.city).filter(Boolean)
      ])];
      legendEl.innerHTML = names
        .map((n) => `<span class="map-chip">📍 ${BRContent.escapeHtml(n)}</span>`)
        .join('');
    }

    if (listEl) {
      if (!pins.length) {
        listEl.innerHTML =
          '<div class="empty-state">No pins yet. Log in as admin and add client addresses on the map.</div>';
      } else {
        listEl.innerHTML = pins
          .map(
            (p) => `
          <div class="pin-list-item">
            <div class="pin-dot" aria-hidden="true"></div>
            <div>
              <h4>${BRContent.escapeHtml(p.label || p.city || 'Client')}</h4>
              <p>${BRContent.escapeHtml(p.address || '')}</p>
              ${p.note ? `<p>${BRContent.escapeHtml(p.note)}</p>` : ''}
            </div>
          </div>`
          )
          .join('');
      }
    }
  }

  document.addEventListener('DOMContentLoaded', init);
})();
