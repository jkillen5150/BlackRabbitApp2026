/**
 * Leaflet service-area map
 * - Map shows past-job pins only (approximate — never street addresses)
 * - City centers are not pinned: South Sound locals already know the towns
 */
(function () {
  let map;
  let layerGroup;

  function isCity(p) {
    return (p.type || 'city') === 'city';
  }

  /** SEO city landings — folder URLs work on GitHub Pages + Vercel */
  const CITY_PAGES = {
    yelm: '/lawn-care-yelm/',
    rainier: '/lawn-care-rainier/',
    lacey: '/lawn-care-lacey/',
    roy: '/lawn-care-roy/',
    olympia: '/lawn-care-olympia/',
    tenino: '/lawn-care-tenino/'
  };

  function cityPageHref(p) {
    const key = String(p.city || p.label || '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
    return CITY_PAGES[key] || null;
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
    const listCities = document.getElementById('pin-list-cities');
    const listJobs = document.getElementById('pin-list-jobs');
    const listEl = document.getElementById('pin-list');
    const legendEl = document.getElementById('map-legend');

    layerGroup.clearLayers();

    const bounds = [];
    const cities = pins.filter(isCity);
    const clients = pins.filter((p) => !isCity(p));

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

    if (bounds.length) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
    }

    if (legendEl) {
      legendEl.innerHTML = `
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
          const page = isCity(p) ? cityPageHref(p) : null;
          const title = page
            ? `<h4><a href="${BRContent.escapeAttr(page)}">${BRContent.escapeHtml(publicLabel(p))}</a></h4>`
            : `<h4>${BRContent.escapeHtml(publicLabel(p))}</h4>`;
          return `
          <div class="pin-list-item">
            <div class="${dotClass}" aria-hidden="true"></div>
            <div>
              ${title}
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
