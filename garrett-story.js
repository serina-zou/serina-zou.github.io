(() => {
  const block = document.querySelector('.gc-redesign-story');
  if (!block) return;
  const pin = block.querySelector('.gc-story-pin');
  const steps = [...block.querySelectorAll('.gc-story-step')];
  const panels = [...block.querySelectorAll('.gc-story-panel')];
  const dots = [...block.querySelectorAll('.gc-story-dots i')];
  const stage = block.querySelector('.gc-desktop-comparison');
  const slider = block.querySelector('input[type="range"]');
  const reduced = matchMedia('(prefers-reduced-motion:reduce)');
  let manual = false, manualY = 0, queued = false;
  function paint(value) {
    const p = Math.max(0, Math.min(100, value));
    stage.style.setProperty('--after-progress', `${p}%`);
    slider.value = String(Math.round(p));
    slider.style.setProperty('--slider-progress', `${p}%`);
    slider.setAttribute('aria-valuetext', `${Math.round(p)}% September`);
  }
  function update() {
    queued = false;
    if (reduced.matches) {
      panels.forEach(p => { p.inert = false; p.removeAttribute('aria-hidden'); });
      return;
    }
    const header = document.querySelector('header').getBoundingClientRect().height;
    const mobile = matchMedia('(max-width:700px)').matches;
    const height = pin.offsetHeight;
    const top = mobile ? header : Math.max(header + 16, header + (innerHeight - header - height) / 2);
    block.style.setProperty('--story-top', `${top}px`);
    const middle = mobile ? top + height + Math.max(0, innerHeight - top - height) / 2 : header + (innerHeight - header) / 2;
    const trigger = mobile ? middle : top;
    const active = steps[2].getBoundingClientRect().top <= trigger ? 2 : steps[1].getBoundingClientRect().top <= trigger ? 1 : 0;
    [steps, panels, dots].forEach(list => list.forEach((el, i) => el.classList.toggle('is-active', i === active)));
    panels.forEach((panel, i) => { panel.inert = i !== active; panel.setAttribute('aria-hidden', String(i !== active)); });
    if (!manual) {
      const travel = Math.max(1, steps[0].offsetHeight - height);
      paint((top - block.getBoundingClientRect().top) / travel * 100);
    }
  }
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  slider.addEventListener('input', () => { manual = true; manualY = scrollY; paint(Number(slider.value)); });
  addEventListener('scroll', () => { if (manual && Math.abs(scrollY - manualY) > 2) manual = false; queue(); }, { passive: true });
  addEventListener('resize', queue, { passive: true });
  reduced.addEventListener('change', () => { manual = false; if (reduced.matches) paint(50); queue(); });
  new ResizeObserver(queue).observe(pin);
  document.fonts.ready.then(queue);
  if (reduced.matches) paint(50);
  update();
})();
