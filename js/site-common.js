/**
 * Shared nav, FABs, NAP footer, urgency form helpers
 */
(function () {
  const FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61591537527292';
  const PHONE_TEL = '+14079511663';
  const PHONE_DISPLAY = '(407) 951-1663';
  const NAP_LINE = 'Black Rabbit Landscaping · Yelm, WA 98597 · ';

  // Root-relative so nav/footer work from city subfolders on GitHub Pages + Vercel
  function navHtml(active) {
    const links = [
      { href: '/', id: 'home', label: 'Home' },
      { href: '/cut-my-grass/', id: 'cut-my-grass', label: 'Cut My Grass' },
      { href: '/testimonials.html', id: 'testimonials', label: 'Testimonials' },
      { href: '/portfolio.html', id: 'portfolio', label: 'Portfolio' },
      { href: '/service-area.html', id: 'map', label: 'Service Map' },
      { href: '/assistant.html', id: 'assistant', label: 'Ask AI' },
      { href: '/#service-form', id: 'quote', label: 'Get a Quote' },
      { href: '/login.html', id: 'login', label: 'Login' }
    ];
    return `
      <nav class="site-nav" id="site-nav" aria-label="Main">
        <div class="site-nav-inner">
          <a class="site-nav-brand" href="/">
            <img src="/logo.jpg" alt="Black Rabbit Landscaping" width="40" height="40">
            <span>Black Rabbit</span>
          </a>
          <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-links">Menu</button>
          <div class="site-nav-links" id="nav-links">
            ${links
              .map(
                (l) =>
                  `<a href="${l.href}" class="${l.id === active ? 'active' : ''}">${l.label}</a>`
              )
              .join('')}
          </div>
        </div>
      </nav>
    `;
  }

  function footerHtml() {
    return `
      <nav class="footer-nav" aria-label="Footer">
        <a href="/">Home</a>
        <a href="/cut-my-grass/">Cut My Grass</a>
        <a href="/testimonials.html">Testimonials</a>
        <a href="/portfolio.html">Portfolio</a>
        <a href="/service-area.html">Service Map</a>
        <a href="/assistant.html">Ask AI</a>
        <a href="/#service-form">Get a Quote</a>
        <a href="/genuine-need">Know somebody in need?</a>
        <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">Facebook</a>
      </nav>
      <p class="footer-cities">
        <a href="/lawn-care-yelm/">Yelm</a> ·
        <a href="/lawn-care-rainier/">Rainier</a> ·
        <a href="/lawn-care-lacey/">Lacey</a> ·
        <a href="/lawn-care-roy/">Roy</a> ·
        <a href="/lawn-care-olympia/">Olympia</a> ·
        <a href="/lawn-care-tenino/">Tenino</a>
      </p>
      <p class="footer-services">
        <a href="/cut-my-grass/">Cut My Grass</a> ·
        <a href="/lawn-mowing/">Lawn mowing</a> ·
        <a href="/yard-cleanup/">Yard cleanup</a> ·
        <a href="/fall-leaf-cleanup/">Fall leaf cleanup</a>
      </p>
      <p class="footer-trust">Licensed · Bonded · Insured</p>
      <p class="footer-nap">${NAP_LINE}<a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></p>
    `;
  }

  /** Ensure every public footer shows credentials (static HTML may predate this). */
  function ensureFooterTrust() {
    document.querySelectorAll('footer.site-footer').forEach((footer) => {
      if (footer.classList.contains('site-footer-simple')) return;
      if (footer.querySelector('.footer-trust')) return;
      const nap = footer.querySelector('.footer-nap');
      const el = document.createElement('p');
      el.className = 'footer-trust';
      el.textContent = 'Licensed · Bonded · Insured';
      if (nap) footer.insertBefore(el, nap);
      else footer.appendChild(el);
    });
  }

  /** Licensed / bonded / insured pills on marketing heroes */
  function injectHeroTrust() {
    if (document.querySelector('.trust-badges')) return;
    const hero = document.querySelector('.page-hero, header.hero');
    if (!hero) return;
    const page = document.body.dataset.page || '';
    if (['admin', 'login', 'customer', 'thankyou', 'assistant'].includes(page)) return;
    if (document.body.classList.contains('admin-page')) return;
    const wrap = document.createElement('div');
    wrap.className = 'trust-badges';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Credentials');
    wrap.innerHTML = `
      <span class="trust-badge"><span class="trust-check" aria-hidden="true">✓</span> Licensed</span>
      <span class="trust-badge"><span class="trust-check" aria-hidden="true">✓</span> Bonded</span>
      <span class="trust-badge"><span class="trust-check" aria-hidden="true">✓</span> Insured</span>
    `;
    const ctas = hero.querySelector('.city-hero-ctas, .hero-ctas');
    if (ctas) hero.insertBefore(wrap, ctas);
    else hero.appendChild(wrap);
  }

  function injectNav(active) {
    const mount = document.getElementById('site-nav-mount');
    if (!mount) return;
    mount.innerHTML = navHtml(active);
    const nav = document.getElementById('site-nav');
    const btn = document.getElementById('nav-toggle');
    if (btn && nav) {
      btn.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  /**
   * Prefer static full footers in HTML (best for crawlable NAP).
   * If #site-footer-mount exists, fill it; also normalize empty .site-footer shells.
   */
  function injectFooter() {
    const mount = document.getElementById('site-footer-mount');
    if (mount) {
      if (!mount.classList.contains('site-footer')) mount.classList.add('site-footer');
      mount.innerHTML = footerHtml();
      return;
    }
    // Optional: empty footer shell with data-br-footer
    const shell = document.querySelector('footer.site-footer[data-br-footer]');
    if (shell && !shell.querySelector('.footer-nap')) {
      shell.innerHTML = footerHtml();
    }
  }

  /** Floating call / text / Facebook — skip admin + assistant (busy UI) */
  function injectFabs() {
    const page = document.body.dataset.page || '';
    if (
      page === 'assistant' ||
      page === 'admin' ||
      page === 'login' ||
      page === 'customer' ||
      page === 'thankyou' ||
      page === 'cut-my-grass' ||
      page === 'track'
    ) {
      return;
    }
    if (document.body.classList.contains('admin-page')) return;
    if (document.getElementById('site-fabs')) return;

    // Remove any page-level fabs so we don't double-stack
    document.querySelectorAll('a.fab').forEach((el) => el.remove());

    const wrap = document.createElement('div');
    wrap.id = 'site-fabs';
    wrap.className = 'site-fabs';
    wrap.innerHTML = `
      <a href="${FACEBOOK_URL}" class="fab fb" target="_blank" rel="noopener noreferrer" aria-label="Black Rabbit on Facebook">
        <span class="fab-fb-f" aria-hidden="true">f</span>
      </a>
      <a href="sms:${PHONE_TEL}?body=Hey,%20Black%20Rabbit!" class="fab sms" aria-label="Text us">💬</a>
      <a href="tel:${PHONE_TEL}" class="fab call" aria-label="Call us">📞</a>
    `;
    document.body.appendChild(wrap);
  }

  /**
   * Sticky mobile CTA: Text + Call + Quote.
   * Skips login/admin/assistant (busy or private UI).
   */
  function injectMobileCta() {
    const page = document.body.dataset.page || '';
    if (
      page === 'assistant' ||
      page === 'login' ||
      page === 'customer' ||
      page === 'admin' ||
      page === 'thankyou' ||
      page === 'cut-my-grass' ||
      page === 'track'
    ) {
      return;
    }
    if (document.body.classList.contains('admin-page')) return;
    if (document.getElementById('mobile-cta-bar')) return;

    const bar = document.createElement('div');
    bar.id = 'mobile-cta-bar';
    bar.className = 'mobile-cta-bar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Quick contact');
    bar.innerHTML = `
      <a class="mcta-text" href="sms:${PHONE_TEL}?body=Hey%20Black%20Rabbit%20—%20I%20want%20a%20quote">Text</a>
      <a class="mcta-call" href="tel:${PHONE_TEL}">Call</a>
      <a class="mcta-quote" href="/cut-my-grass/">Cut My Grass</a>
    `;
    document.body.appendChild(bar);
    document.body.classList.add('has-mobile-cta');
  }

  function wireUrgencyButtons() {
    const field = document.getElementById('urgency-field');
    document.querySelectorAll('.urgency-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.urgency-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (field) field.value = btn.dataset.value || '';
      });
    });
  }

  /** Load the genuine-need corner badge on inner marketing pages, not the crowded homepage. */
  function loadReferralBadge() {
    const page = document.body.dataset.page || '';
    const path = location.pathname || '';
    if (
      page === 'home' ||
      page === 'assistant' ||
      page === 'admin' ||
      page === 'login' ||
      page === 'customer' ||
      page === 'thankyou' ||
      page === 'cut-my-grass' ||
      page === 'track' ||
      page === 'genuine-need'
    ) {
      return;
    }
    if (path === '/' || /\/index\.html$/i.test(path)) return;
    if (document.body.classList.contains('admin-page')) return;
    if (document.querySelector('script[src*="referral-badge.js"]')) return;
    const s = document.createElement('script');
    s.src = '/js/referral-badge.js';
    document.body.appendChild(s);
  }

  async function hydrateReviews() {
    const page = document.body.dataset.page || '';
    if (page === 'admin' || page === 'login') return;
    if (window.BRContent && typeof window.BRContent.refreshPublicReviewStats === 'function') {
      await window.BRContent.refreshPublicReviewStats();
      return;
    }
    try {
      const res = await fetch('/api/reviews', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.writeReviewUrl) {
        document.querySelectorAll('a[data-google-review-link]').forEach((a) => {
          a.href = data.writeReviewUrl;
        });
      }
    } catch {
      /* ignore */
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const active = document.body.dataset.page || '';
    injectNav(active);
    injectFooter();
    ensureFooterTrust();
    injectHeroTrust();
    injectFabs();
    injectMobileCta();
    wireUrgencyButtons();
    hydrateReviews();
    loadReferralBadge();
  });
})();
