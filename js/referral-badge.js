/**
 * Corner badge for neighbor referrals of genuine lawn-care need.
 * Tap goes to /genuine-need. Dismiss is remembered in localStorage.
 * Skips admin, login, booking, and the destination page itself.
 */
(function () {
  var STORAGE_KEY = 'br-genuine-need-badge-dismissed';
  var PAGE_HREF = '/genuine-need';
  var SKIP_PAGES = {
    admin: 1,
    login: 1,
    customer: 1,
    'cut-my-grass': 1,
    track: 1,
    thankyou: 1,
    'genuine-need': 1,
    assistant: 1
  };

  function shouldSkip() {
    var page = (document.body && document.body.dataset.page) || '';
    if (SKIP_PAGES[page]) return true;
    if (document.body && document.body.classList.contains('admin-page')) return true;
    var path = location.pathname || '';
    if (/admin-cmg-hq|admin\.html|login\.html|customer\.html|genuine-need/i.test(path)) return true;
    if (/\/cut-my-grass|\/track(?:\/|$)/i.test(path)) return true;
    try {
      if (localStorage.getItem(STORAGE_KEY) === '1') return true;
    } catch (e) { /* private mode */ }
    return false;
  }

  function injectStyles() {
    if (document.getElementById('referral-badge-css')) return;
    var css = document.createElement('style');
    css.id = 'referral-badge-css';
    css.textContent =
      '.referral-badge{position:fixed;left:10px;bottom:18px;z-index:90;width:136px;' +
      'padding:14px 12px 13px;border-radius:18px;' +
      'background:linear-gradient(180deg,#fffcf7 0%,#f3ebe0 100%);' +
      'color:var(--green-dark,#1e3d1e);border:1px solid rgba(46,90,46,.28);' +
      'box-shadow:0 8px 24px rgba(46,40,28,.16);font-family:inherit;text-align:center;line-height:1.25}' +
      'body.has-mobile-cta .referral-badge{bottom:calc(84px + env(safe-area-inset-bottom,0px))}' +
      '.referral-badge-link{display:block;text-decoration:none;color:inherit;padding-right:8px}' +
      '.referral-badge-kicker{display:block;font-size:.72rem;font-weight:700;color:var(--green,#2e5a2e)}' +
      '.referral-badge-sub{display:block;margin-top:4px;font-size:.62rem;font-weight:500;color:var(--muted,#5c564e)}' +
      '.referral-badge-x{position:absolute;top:2px;right:2px;width:28px;height:28px;border:none;' +
      'background:transparent;color:#6b645c;font-size:1.1rem;line-height:1;cursor:pointer;' +
      'border-radius:999px;font-family:inherit;padding:0}' +
      '.referral-badge-x:hover,.referral-badge-x:focus-visible{background:rgba(46,90,46,.1);color:var(--green-dark,#1e3d1e);outline:none}' +
      '@media (min-width:769px){.referral-badge{left:18px;bottom:22px;width:148px;padding:16px 14px 15px}' +
      '.referral-badge-kicker{font-size:.78rem}.referral-badge-sub{font-size:.66rem}}';
    document.head.appendChild(css);
  }

  function mount() {
    if (shouldSkip()) return;
    if (document.getElementById('referral-badge')) return;
    injectStyles();
    var wrap = document.createElement('div');
    wrap.id = 'referral-badge';
    wrap.className = 'referral-badge';
    wrap.setAttribute('role', 'complementary');
    wrap.setAttribute('aria-label', 'Neighbor referral');
    wrap.innerHTML =
      '<button type="button" class="referral-badge-x" aria-label="Dismiss">×</button>' +
      '<a class="referral-badge-link" href="' + PAGE_HREF + '">' +
      '<span class="referral-badge-kicker">Know somebody in need?</span>' +
      '<span class="referral-badge-sub">Send them our way.</span>' +
      '</a>';
    wrap.querySelector('.referral-badge-x').addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { localStorage.setItem(STORAGE_KEY, '1'); } catch (err) {}
      wrap.remove();
    });
    document.body.appendChild(wrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
