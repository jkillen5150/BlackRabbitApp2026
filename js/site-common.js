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
        <a href="/testimonials.html">Testimonials</a>
        <a href="/portfolio.html">Portfolio</a>
        <a href="/service-area.html">Service Map</a>
        <a href="/assistant.html">Ask AI</a>
        <a href="/#service-form">Get a Quote</a>
        <a href="${FACEBOOK_URL}" target="_blank" rel="noopener noreferrer">Facebook</a>
      </nav>
      <p class="footer-cities">
        <a href="/lawn-care-yelm/">Yelm</a> ·
        <a href="/lawn-care-rainier/">Rainier</a> ·
        <a href="/lawn-care-lacey/">Lacey</a> ·
        <a href="/lawn-care-roy/">Roy</a> ·
        <a href="/lawn-care-olympia/">Olympia</a>
      </p>
      <p class="footer-nap">${NAP_LINE}<a href="tel:${PHONE_TEL}">${PHONE_DISPLAY}</a></p>
    `;
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
    if (page === 'assistant') return;
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

  document.addEventListener('DOMContentLoaded', () => {
    const active = document.body.dataset.page || '';
    injectNav(active);
    injectFooter();
    injectFabs();
    wireUrgencyButtons();
  });
})();
