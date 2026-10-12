/* FloBrain · Sticky scrollytelling
   The step whose middle is closest to the middle of the screen is "active";
   the matching screenshot and dot light up. Works for any number of .fb-sty blocks on the page. */
(() => {
  const blocks = [...document.querySelectorAll('[data-scrollytelling]')];
  if (!blocks.length) return;

  const setups = blocks.map(block => ({
    block,
    pin: block.querySelector('.fb-sty__pin'),
    steps: [...block.querySelectorAll('.fb-sty__step')],
    imgs:  [...block.querySelectorAll('.fb-sty__frame img')],
    dots:  [...block.querySelectorAll('.fb-sty__dots i')],
    current: -1
  }));

  function update() {
    const header = document.querySelector('header').getBoundingClientRect().height;
    const mobile = matchMedia('(max-width:700px)').matches;
    setups.forEach(s => {
      const height = s.pin.offsetHeight;
      const top = mobile ? header : Math.max(header + 16, header + (innerHeight - header - height) / 2);
      s.block.style.setProperty('--sty-pin-top', `${top}px`);
      const mid = mobile ? top + height + Math.max(0, innerHeight - top - height) / 2 : header + (innerHeight - header) / 2;
      let best = 0, dist = Infinity;
      s.steps.forEach((step, i) => {
        const r = step.getBoundingClientRect();
        const d = Math.abs(r.top + r.height / 2 - mid);
        if (d < dist) { dist = d; best = i; }
      });
      if (best === s.current) return;
      s.current = best;
      [s.steps, s.imgs, s.dots].forEach(list =>
        list.forEach((el, i) => el.classList.toggle('is-active', i === best)));
      s.imgs.forEach((img, i) => img.setAttribute('aria-hidden', String(i !== best)));
    });
  }

  let queued = false;
  addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { passive: true });
  addEventListener('resize', update);
  document.fonts.ready.then(update);
  update();
})();
