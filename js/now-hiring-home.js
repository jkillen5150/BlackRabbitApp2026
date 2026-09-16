/**
 * Homepage Now Hiring yellow-glow CTA + hiring-extras.css + quick-link
 */
(function () {
  if ((document.body.dataset.page || '') !== 'home') return;
  if (!document.querySelector('link[href="css/hiring-extras.css"], link[href="/css/hiring-extras.css"]')) {
    const siteCss = document.querySelector('link[href="css/site.css"], link[href="/css/site.css"]');
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/hiring-extras.css';
    if (siteCss && siteCss.parentNode) siteCss.parentNode.insertBefore(link, siteCss.nextSibling);
    else document.head.appendChild(link);
  }
  const ctas = document.querySelector('.hero-ctas');
  if (ctas && !ctas.querySelector('a.hero-cta.now-hiring')) {
    const a = document.createElement('a');
    a.className = 'hero-cta now-hiring';
    a.href = '/now-hiring';
    a.textContent = 'Now Hiring';
    ctas.appendChild(a);
  }
  const ql = document.querySelector('.quick-links');
  if (ql && !ql.querySelector('a.quick-link-card[href="/now-hiring"]')) {
    const card = document.createElement('a');
    card.className = 'quick-link-card';
    card.href = '/now-hiring';
    card.innerHTML = '<div class="icon">🚪</div><strong>Now Hiring</strong><span>Door knockers — your own schedule</span>';
    const first = ql.querySelector('a.quick-link-card');
    if (first) ql.insertBefore(card, first.nextSibling);
    else ql.appendChild(card);
  }
})();
