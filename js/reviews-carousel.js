/**
 * Rotating Google-style review cards for the homepage
 */
(function () {
  let index = 0;
  let reviews = [];
  let timer = null;
  const INTERVAL_MS = 5500;

  function featured(list) {
    const f = list.filter((r) => r.featured !== false);
    return f.length ? f : list;
  }

  function render() {
    const track = document.getElementById('reviews-track');
    const dots = document.getElementById('carousel-dots');
    if (!track) return;

    if (!reviews.length) {
      track.innerHTML =
        '<div class="empty-state">Reviews coming soon. Add them in Admin → Reviews.</div>';
      if (dots) dots.innerHTML = '';
      return;
    }

    track.innerHTML = reviews
      .map((r, i) => BRContent.renderReviewCard(r, i === index))
      .join('');

    if (dots) {
      dots.innerHTML = reviews
        .map(
          (_, i) =>
            `<button type="button" aria-label="Go to review ${i + 1}" class="${
              i === index ? 'active' : ''
            }" data-i="${i}"></button>`
        )
        .join('');
      dots.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => go(Number(btn.dataset.i)));
      });
    }
  }

  function go(i) {
    if (!reviews.length) return;
    index = ((i % reviews.length) + reviews.length) % reviews.length;
    render();
    restart();
  }

  function next() {
    go(index + 1);
  }

  function prev() {
    go(index - 1);
  }

  function restart() {
    if (timer) clearInterval(timer);
    if (reviews.length > 1) {
      timer = setInterval(next, INTERVAL_MS);
    }
  }

  async function init() {
    const data = await BRContent.load();
    reviews = featured(data.reviews || []);
    index = 0;
    render();
    restart();

    document.getElementById('carousel-prev')?.addEventListener('click', prev);
    document.getElementById('carousel-next')?.addEventListener('click', next);

    const wrap = document.querySelector('.reviews-carousel-wrap');
    if (wrap) {
      wrap.addEventListener('mouseenter', () => timer && clearInterval(timer));
      wrap.addEventListener('mouseleave', restart);
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('br:content-updated', async () => {
    const data = await BRContent.load();
    reviews = featured(data.reviews || []);
    index = 0;
    render();
    restart();
  });
})();
