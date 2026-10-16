(() => {
  const items = [...document.querySelectorAll('.about-bio > p, .about-bio > .contact')];
  if (!items.length) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  items.forEach((item, index) => {
    item.classList.add('about-reveal');
    item.style.setProperty('--reveal-index', index);
  });
  if (reduced.matches) {
    items.forEach(item => item.classList.add('is-revealed'));
    return;
  }
  function beginReveal() {
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(({ target, isIntersecting }) => {
        if (!isIntersecting) return;
        target.classList.add('is-revealed');
        reveal.unobserve(target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
    items.forEach(item => reveal.observe(item));
  }
  // The homepage-style loader previously concealed most of this animation.
  // Start observing only after it has faded out and been removed.
  const loader = document.querySelector('.loader');
  if (!loader) beginReveal();
  else {
    const loading = new MutationObserver(() => {
      if (loader.isConnected) return;
      loading.disconnect();
      requestAnimationFrame(() => requestAnimationFrame(beginReveal));
    });
    loading.observe(loader.parentNode, { childList: true });
  }
})();
