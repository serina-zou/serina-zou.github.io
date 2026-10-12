(() => {
  const dialog = document.querySelector('.image-dialog');
  const enlarged = dialog.querySelector('img');
  document.querySelectorAll('.image-expand').forEach(button => button.addEventListener('click', () => {
    const original = button.querySelector('img, .case-graphic');
    const source = original.dataset.source || original.src;
    enlarged.src = source;
    enlarged.alt = original.dataset.alt || original.alt;
    dialog.querySelector('.original-image').href = source;
    dialog.showModal();
  }));
  dialog.querySelector('.image-dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r=dialog.getBoundingClientRect(); if(event.clientX<r.left || event.clientX>r.right || event.clientY<r.top || event.clientY>r.bottom) dialog.close(); } });
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Reveal authored strokes and explicitly marked filled arrows; never animate outlined text.
  const graphics = [...document.querySelectorAll('.case-graphic')];
  const finishGraphic = graphic => {
    graphic.classList.add('is-drawn');
    graphic.classList.remove('is-drawing', 'line-ready');
  };
  const drawingStates = new WeakMap();
  const resetGraphic = graphic => {
    const state = drawingStates.get(graphic);
    state.started = false;
    state.pending.clear();
    graphic.classList.remove('is-drawing', 'is-drawn');
    graphic.classList.add('line-ready');
  };
  const drawingObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    const graphic = entry.target;
    const state = drawingStates.get(graphic);
    if (reduced.matches) { finishGraphic(graphic); return; }
    // Re-arm only after the entire graphic leaves, avoiding flicker at the threshold.
    if (!entry.isIntersecting || entry.intersectionRatio === 0) {
      resetGraphic(graphic);
    } else if (entry.intersectionRatio >= .15 && !state.started) {
      state.started = true;
      state.pending = new Set(state.lines);
      graphic.classList.add('is-drawing');
    }
  }), { threshold: [0, .15] });
  graphics.forEach((graphic, graphicIndex) => {
    const lines = [...graphic.querySelectorAll('[stroke]')].filter(line =>
      line.getAttribute('stroke') !== 'none' && typeof line.getTotalLength === 'function');
    lines.forEach((line, index) => {
      line.style.setProperty('--draw-length', Math.ceil(line.getTotalLength()) + 1);
      line.style.setProperty('--draw-delay', `${Math.min(index * 35, 280)}ms`);
      line.classList.add('draw-line');
    });
    // Exported arrows are filled outlines. A wide animated mask follows their
    // centerline, revealing the original pixels, including dashed return paths.
    const svgNS = 'http://www.w3.org/2000/svg';
    const defs = document.createElementNS(svgNS, 'defs');
    graphic.prepend(defs);
    graphic.querySelectorAll('[data-arrow-reveal]').forEach((arrow, index) => {
      const mask = document.createElementNS(svgNS, 'mask');
      const id = `case-arrow-mask-${graphicIndex}-${index}`;
      mask.id = id;
      mask.setAttribute('maskUnits', 'userSpaceOnUse');
      const view = graphic.viewBox.baseVal;
      for (const [key, value] of Object.entries({x: view.x, y: view.y, width: view.width, height: view.height})) {
        mask.setAttribute(key, value);
      }
      const reveal = document.createElementNS(svgNS, 'path');
      reveal.setAttribute('d', arrow.dataset.arrowReveal);
      reveal.setAttribute('fill', 'none');
      reveal.setAttribute('stroke', 'white');
      reveal.setAttribute('stroke-width', '18');
      reveal.setAttribute('stroke-linejoin', 'round');
      mask.append(reveal);
      defs.append(mask);
      reveal.style.setProperty('--draw-length', Math.ceil(reveal.getTotalLength()) + 1);
      reveal.style.setProperty('--draw-delay', `${160 + index * 140}ms`);
      reveal.style.setProperty('--draw-duration', '1400ms');
      reveal.classList.add('draw-line');
      arrow.setAttribute('mask', `url(#${id})`);
      lines.push(reveal);
    });
    if (!lines.length) return;
    const state = { lines, started: false, pending: new Set() };
    drawingStates.set(graphic, state);
    graphic.addEventListener('animationend', event => {
      if (event.animationName !== 'case-line-draw' || !state.started) return;
      if (state.pending.delete(event.target) && state.pending.size === 0) finishGraphic(graphic);
    });
    if (reduced.matches) finishGraphic(graphic);
    else resetGraphic(graphic);
    drawingObserver.observe(graphic);
  });
  reduced.addEventListener('change', event => {
    drawingObserver.disconnect();
    graphics.filter(graphic => drawingStates.has(graphic)).forEach(graphic => {
      if (event.matches) finishGraphic(graphic);
      else resetGraphic(graphic);
      drawingObserver.observe(graphic);
    });
  });
  const videos = [...document.querySelectorAll('video')];
  const manualPause = new WeakSet();
  const visibility = new WeakMap();
  videos.forEach(video => {
    video.muted = true;
    if(reduced.matches){video.autoplay=false;video.pause();}
    video.addEventListener('pause', () => { if(visibility.get(video) && !document.hidden) manualPause.add(video); });
    video.addEventListener('play', () => manualPause.delete(video));
  });
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    const video = entry.target;
    visibility.set(video, entry.isIntersecting);
    if(!entry.isIntersecting) video.pause();
    else if(!reduced.matches && !manualPause.has(video) && !document.hidden) video.play().catch(()=>{});
  }), {threshold:.2});
  videos.forEach(video => observer.observe(video));
  document.addEventListener('visibilitychange',()=>videos.forEach(video=>{
    if(document.hidden) video.pause();
    else if(visibility.get(video)&&!reduced.matches&&!manualPause.has(video)) video.play().catch(()=>{});
  }));
  const sections=[...document.querySelectorAll('.story-section')];
  const nav=[...document.querySelectorAll('.story-nav a')];
  let queued=false;
  function highlight(){queued=false;let current=sections[0];for(const section of sections){if(section.getBoundingClientRect().top<=190) current=section;}nav.forEach(link=>{if(link.hash==='#'+current.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});}
  window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(highlight);}},{passive:true});
  highlight();
})();
