/**
 * Shared nav, FABs, urgency form helpers
 */
(function () {
  function navHtml(active) {
    const links = [
      { href: 'index.html', id: 'home', label: 'Home' },
      { href: 'testimonials.html', id: 'testimonials', label: 'Testimonials' },
      { href: 'portfolio.html', id: 'portfolio', label: 'Portfolio' },
      { href: 'service-area.html', id: 'map', label: 'Service Map' },
      { href: 'assistant.html', id: 'assistant', label: 'Ask AI' },
      { href: 'index.html#service-form', id: 'quote', label: 'Get a Quote' },
      { href: 'login.html', id: 'login', label: 'Login' }
    ];
    return `
      <nav class="site-nav" id="site-nav" aria-label="Main">
        <div class="site-nav-inner">
          <a class="site-nav-brand" href="index.html">
            <img src="logo.jpg" alt="" width="40" height="40">
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
    wireUrgencyButtons();
  });
})();
