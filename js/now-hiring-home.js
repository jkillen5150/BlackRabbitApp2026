/**
 * Homepage Christmas lights glow CTA. Same slot the Now Hiring banner used.
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
  const old = ctas && ctas.querySelector('a.hero-cta.now-hiring');
  if (old) old.remove();
  if (ctas && !ctas.querySelector('a.hero-cta.christmas-lights')) {
    const a = document.createElement('a');
    a.className = 'hero-cta christmas-lights';
    a.href = '/holiday-lights';
    a.textContent = 'Christmas Lights';
    ctas.appendChild(a);
  }
  const ql = document.querySelector('.quick-links');
  const oldCard = ql && ql.querySelector('a.quick-link-card[href="/now-hiring"]');
  if (oldCard) oldCard.remove();
  if (ql && !ql.querySelector('a.quick-link-card[href="/holiday-lights"]')) {
    const card = document.createElement('a');
    card.className = 'quick-link-card christmas-lights';
    card.href = '/holiday-lights';
    card.innerHTML = '<div class="icon">✨</div><strong>Christmas Lights</strong><span>Install and takedown — Olympia, Lacey, Yelm</span>';
    const first = ql.querySelector('a.quick-link-card');
    if (first) ql.insertBefore(card, first.nextSibling);
    else ql.appendChild(card);
  }
})();
