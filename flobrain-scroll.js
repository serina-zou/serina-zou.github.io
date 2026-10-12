(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const revealTargets = [...document.querySelectorAll(
    '.case-hero > .back-link, .case-hero > .case-eyebrow, .case-hero > h1, .case-hero > .tagline, .case-hero > .meta, .case-hero > p, .case-hero > .cta, .case-hero > figure, .story-section > h2, .story-section > h3, .story-section > p, .story-section > ul, .story-section > .rule, .story-section > figure, .comparison-panel, .case-end > a'
  )];
  const heroVideo = document.querySelector('.case-hero > figure');
  heroVideo?.classList.add('reveal-scale');
  const revealObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('is-revealed');
      revealObserver.unobserve(target);
    });
  }, { threshold: .08, rootMargin: '0px 0px -24px 0px' });
  revealTargets.forEach(target => {
    target.classList.add('scroll-reveal');
    if (reduced.matches) target.classList.add('is-revealed');
    else revealObserver.observe(target);
  });
  const highlights = [...document.querySelectorAll('.highlight-sweep')];
  // Measure real wrapped lines after the font loads, so each line sweeps in order.
  const highlightText = new Map(highlights.map(el => [el, el.textContent]));
  const splitHighlightLines = () => highlights.forEach(el => {
    const text = highlightText.get(el);
    el.textContent = text;
    const node = el.firstChild;
    const range = document.createRange();
    const lines = [];
    for (const match of text.matchAll(/\S+/g)) {
      range.setStart(node, match.index);
      range.setEnd(node, match.index + match[0].length);
      const top = range.getBoundingClientRect().top;
      let line = lines[lines.length - 1];
      if (!line || Math.abs(line.top - top) > 3) {
        line = { top, start: match.index, end: 0 };
        lines.push(line);
      }
      line.end = match.index + match[0].length;
    }
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      if (index) fragment.append(' ');
      const span = document.createElement('span');
      span.className = 'highlight-line';
      span.style.setProperty('--highlight-line-index', index);
      span.textContent = text.slice(line.start, line.end);
      fragment.append(span);
    });
    el.replaceChildren(fragment);
  });
  splitHighlightLines();
  document.fonts.ready.then(splitHighlightLines);
  let lineFrame = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(lineFrame);
    lineFrame = requestAnimationFrame(splitHighlightLines);
  }, { passive: true });
  const highlightObserver = new IntersectionObserver(entries => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) target.classList.add('is-highlighted');
      else target.classList.remove('is-highlighted');
    });
  }, { threshold: .5 });
  highlights.forEach(target => highlightObserver.observe(target));

  const runway = document.querySelector('.comparison-scroll');
  if (!runway) return;
  const pin = runway.querySelector('.comparison-pin');
  const stage = runway.querySelector('.comparison-stage');
  const slider = runway.querySelector('input[type="range"]');
  let travel = 0, pinTop = 0, frame = 0, manual = false, manualScrollY = 0;
  const paint = value => {
    const percent = Math.min(100, Math.max(0, value));
    stage.style.setProperty('--after-progress', `${percent}%`);
    slider.value = String(Math.round(percent));
    slider.style.setProperty('--slider-progress', `${percent}%`);
    slider.setAttribute('aria-valuetext', `${Math.round(percent)}% After`);
  };
  const renderScroll = () => {
    frame = 0;
    if (reduced.matches || manual || !travel) return;
    paint((pinTop - runway.getBoundingClientRect().top) / travel * 100);
  };
  const queueScroll = () => {
    if (!frame) frame = requestAnimationFrame(renderScroll);
  };
  const measure = () => {
    runway.classList.toggle('is-scroll-linked', !reduced.matches);
    if (reduced.matches) {
      runway.style.removeProperty('height');
      paint(50);
      return;
    }
    const headerHeight = document.querySelector('header').getBoundingClientRect().height;
    const height = pin.getBoundingClientRect().height;
    pinTop = Math.max(headerHeight + 16, headerHeight + (innerHeight - headerHeight - height) / 2);
    travel = Math.max(580, innerHeight * 1.1);
    runway.style.setProperty('--pin-top', `${pinTop}px`);
    runway.style.height = `${height + travel}px`;
    queueScroll();
  };
  slider.addEventListener('input', () => {
    manual = true;
    manualScrollY = scrollY;
    paint(Number(slider.value));
  });
  window.addEventListener('scroll', () => {
    // Keep a dragged value until the visitor actually resumes scrolling.
    if (manual && Math.abs(scrollY - manualScrollY) > 2) manual = false;
    queueScroll();
  }, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  new ResizeObserver(measure).observe(pin);
  document.fonts.ready.then(measure);
  measure();
  reduced.addEventListener('change', () => {
    if (reduced.matches) {
      revealObserver.disconnect();
      revealTargets.forEach(target => target.classList.add('is-revealed'));
    }
    manual = false;
    measure();
  });
})();
