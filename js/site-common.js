/**
 * Shared nav, FABs, NAP footer, urgency form helpers
 */
(function () {
  const GBP_URL = 'https://www.google.com/maps/place/Black+Rabbit+Landscaping/data=!4m2!3m1!1s0x2143c35a223dde03:0x610abda6fc33b5df';
  const PHONE_TEL = '+14079511663';
  const PHONE_DISPLAY = '(407) 951-1663';
  const NAP_LINE = 'Black Rabbit Landscaping · Rainier, WA 98576 · ';
  /** Direct Google "write a review" link for the Business Profile (no API or Place ID needed). */
  const GOOGLE_REVIEW_URL = 'https://g.page/r/Cd-1M_ymvQphEAE/review';

  function navHtml(active) {
    const links = [
      { href: '/', id: 'home', label: 'Home' },
      { href: '/cut-my-grass', id: 'cut-my-grass', label: 'Cut My Grass' },
      { href: '/fall-winter-services', id: 'fall-winter', label: 'Fall &amp; Winter' },
      { href: '/testimonials', id: 'testimonials', label: 'Testimonials' },
      { href: '/portfolio', id: 'portfolio', label: 'Portfolio' },
      { href: '/service-area', id: 'map', label: 'Service Map' },
      { href: '/assistant', id: 'assistant', label: 'Ask AI' },
      { href: '/ai-for-small-business', id: 'ai-lessons', label: 'AI Lessons' },
      { href: '/#service-form', id: 'quote', label: 'Get a Quote' },
      { href: '/genuine-need', id: 'genuine-need', label: 'Know somebody in need?' },
      { href: '/holiday-lights', id: 'christmas-lights', label: 'Christmas Lights' },
      { href: '/login', id: 'login', label: 'Login' }
    ];
    return `
      <nav class="site-nav" id="site-nav" aria-label="Main">
        <div class="site-nav-inner">
          <a class="site-nav-brand" href="/">
            <img src="/logo.webp" alt="Black Rabbit Landscaping" width="40" height="40">
            <span>Black Rabbit</span>
          </a>
          <button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="nav-links">Menu</button>
          <div class="site-nav-links" id="nav-links">
            ${links
              .map(
                (l) =>
                  `<a href="${l.href}" class="${[l.id === active ? 'active' : '', l.id === 'christmas-lights' ? 'nav-christmas' : ''].filter(Boolean).join(' ')}">${l.label}</a>`
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
        <a href="/cut-my-grass">Cut My Grass</a>
        <a href="/fall-winter-services">Fall &amp; Winter</a>
        <a href="/testimonials">Testimonials</a>
        <a href="/portfolio">Portfolio</a>
        <a href="/service-area">Service Map</a>
        <a href="/assistant">Ask AI</a>
        <a href="/ai-for-small-business">AI Lessons</a>
        <a href="/#service-form">Get a Quote</a>
        <a href="/genuine-need">Know somebody in need?</a>
        <a href="/holiday-lights">Christmas Lights</a>
        <a href="${GBP_URL}" target="_blank" rel="noopener noreferrer">Google Business Profile</a>
      </nav>
      <p class="footer-cities">
        <a href="/lawn-care-olympia">Olympia</a> · <a href="/lawn-care-lacey">Lacey</a> · <a href="/lawn-care-tumwater">Tumwater</a> · <a href="/lawn-care-yelm">Yelm</a> · <a href="/lawn-care-rainier">Rainier</a> · <a href="/lawn-care-tenino">Tenino</a> · <a href="/lawn-care-roy">Roy</a>
      </p>
      <p class="footer-services">
        <a href="/lawn-mowing">Lawn mowing</a> · <a href="/yard-cleanup">Yard cleanup</a> · <a href="/fall-leaf-cleanup">Fall leaf cleanup</a> · <a href="/storm-cleanup">Storm cleanup</a> · <a href="/hedge-trimming">Hedge trimming</a> · <a href="/gutter-cleaning-roof-moss">Gutters &amp; roof moss</a> · <a href="/pressure-washing">Pressure washing</a> · <a href="/holiday-lights">Holiday lights</a> · <a href="/commercial-hoa-property-maintenance">Commercial &amp; HOA</a> · <a href="/fall-winter-services">Fall &amp; winter services</a>
      </p>
      <p class="footer-trust">Licensed WA BLACKRL740MU · Bonded · Insured</p>
      <p class="footer-nap">${NAP_LINE}<a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></p>
    `;
  }

  function ensureFooterTrust() {
    document.querySelectorAll('footer.site-footer').forEach((footer) => {
      if (footer.classList.contains('site-footer-simple')) return;
      if (footer.querySelector('.footer-trust')) return;
      const nap = footer.querySelector('.footer-nap');
      const el = document.createElement('p');
      el.className = 'footer-trust';
      el.textContent = 'Licensed WA BLACKRL740MU · Bonded · Insured';
      if (nap) footer.insertBefore(el, nap);
      else footer.appendChild(el);
    });
  }

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

  function injectFooter() {
    const mount = document.getElementById('site-footer-mount');
    if (mount) {
      if (!mount.classList.contains('site-footer')) mount.classList.add('site-footer');
      mount.innerHTML = footerHtml();
      return;
    }
    const shell = document.querySelector('footer.site-footer[data-br-footer]');
    if (shell && !shell.querySelector('.footer-nap')) {
      shell.innerHTML = footerHtml();
    }
  }

  function stripFabs() {
    document.querySelectorAll('a.fab, #site-fabs').forEach((el) => el.remove());
  }

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
      <a class="mcta-quote" href="/cut-my-grass">Cut My Grass</a>
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

  function applyReviewLinks() {
    document.querySelectorAll('a[data-google-review-link]').forEach((a) => {
      a.href = GOOGLE_REVIEW_URL;
    });
  }

  async function hydrateReviews() {
    const page = document.body.dataset.page || '';
    applyReviewLinks();
    if (page === 'admin' || page === 'login') return;
    if (window.BRContent && typeof window.BRContent.refreshPublicReviewStats === 'function') {
      await window.BRContent.refreshPublicReviewStats();
      applyReviewLinks();
    }
  }

  window.BR_GOOGLE_REVIEW_URL = GOOGLE_REVIEW_URL;

  document.addEventListener('DOMContentLoaded', () => {
    const active = document.body.dataset.page || '';
    injectNav(active);
    injectFooter();
    ensureFooterTrust();
    injectHeroTrust();
    stripFabs();
    injectMobileCta();
    wireUrgencyButtons();
    hydrateReviews();
    if ((document.body.dataset.page || '') === 'home') {
      var s = document.createElement('script');
      s.src = '/js/now-hiring-home.js';
      s.defer = true;
      document.body.appendChild(s);
    }
  });
})();
