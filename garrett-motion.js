/* Garrett Comer case: three scroll animations drawn from Garrett's real race times.
   Markup:  <figure class="gc-motion" data-gc="axis|trend|opener"> … <svg class="gc-svg"></svg> … <button data-gc-replay>Replay</button> … </figure>
   Each figure rests in its final state, plays when it scrolls into view, plays again
   every time it re-enters the viewport, and replays from its button.
   prefers-reduced-motion: shows the final state only. */
(() => {
  const T = s => { const [m, r] = s.split(':'); return +m * 60 + +r; };
  const fmt = v => { const m = Math.floor(v / 60); return m + ':' + (v - m * 60).toFixed(1).padStart(4, '0'); };
  const RACES = {
    2023: [['2023-08-31','19:45.4'],['2023-09-09','19:16.3'],['2023-09-13','19:22.2'],['2023-09-23','18:47.9'],['2023-09-27','18:36.0'],['2023-10-07','18:47.1'],['2023-10-14','20:06.6'],['2023-10-19','19:21.8'],['2023-10-28','18:24.6']],
    2024: [['2024-08-29','21:04.2'],['2024-10-05','21:04.9'],['2024-10-11','20:34.8'],['2024-10-17','19:17.8'],['2024-10-26','18:42.7']],
    2025: [['2025-08-15','17:22.3'],['2025-08-27','17:40.1'],['2025-09-09','16:55.1'],['2025-09-13','16:58.4'],['2025-09-20','16:46.8'],['2025-09-25','16:55.9'],['2025-09-27','16:55.4'],['2025-10-04','16:49.8'],['2025-10-10','17:16.1'],['2025-10-16','17:00.5'],['2025-10-24','16:43.8'],['2025-11-08','16:44.5']]
  };
  const NS = 'http://www.w3.org/2000/svg';
  const el = (t, a, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const W = 760, L = 64, R = 40, TOP = 24;

  function axes(svg, H, lo, hi, ticks) {
    const B = H - 40, y = v => TOP + (hi - v) / (hi - lo) * (B - TOP);
    ticks.forEach(t => {
      el('line', { x1: L, x2: W - R, y1: y(t), y2: y(t), class: 'gc-grid' }, svg);
      el('text', { x: L - 8, y: y(t) + 4, 'text-anchor': 'end' }, svg).textContent = fmt(t);
    });
    return { y, B };
  }
  function regress(ys) {
    const n = ys.length, mx = (n - 1) / 2, my = ys.reduce((a, b) => a + b) / n;
    let num = 0, den = 0; ys.forEach((v, i) => { num += (i - mx) * (v - my); den += (i - mx) ** 2; });
    const s = num / den; return { s, b: my - s * mx, avg: my };
  }

  /* A · Decision 1: three seasons on a date axis -> 2023 by race order */
  function axis(fig, svg) {
    svg.setAttribute('viewBox', `0 0 ${W} 300`);
    const { y, B } = axes(svg, 300, T('16:20'), T('21:20'), ['17:00','18:00','19:00','20:00','21:00'].map(T));
    const t0 = +new Date('2023-08-10'), t1 = +new Date('2025-11-25');
    const dx = d => L + (d - t0) / (t1 - t0) * (W - L - R), ox = i => L + 20 + i * (W - L - R - 40) / 8;
    const years = ['2023','2024','2025'].map(yr => { const t = el('text', { x: dx(new Date(yr + '-10-01')), y: B + 22, 'text-anchor': 'middle' }, svg); t.textContent = yr; return t; });
    const order = [...Array(9)].map((_, i) => { const t = el('text', { x: ox(i), y: B + 22, 'text-anchor': 'middle' }, svg); t.textContent = 'R' + (i + 1); return t; });
    const pts = [];
    Object.entries(RACES).forEach(([yr, list]) => list.forEach(([d, t], i) => pts.push({ yr, dateX: dx(new Date(d)), ordX: ox(i), y: y(T(t)) })));
    const line = el('polyline', { class: 'gc-line gc-2023', points: pts.filter(p => p.yr === '2023').map(p => p.ordX + ',' + p.y).join(' ') }, svg);
    pts.forEach(p => { p.c = el('circle', { cx: p.dateX, cy: p.y, r: 4.5, class: 'gc-pt gc-' + p.yr }, svg); });
    const tag = fig.querySelector('[data-gc-tag]');
    const state = done => {
      years.forEach(t => t.style.opacity = done ? 0 : 1);
      order.forEach(t => t.style.opacity = done ? 1 : 0);
      line.style.opacity = done ? 1 : 0;
      pts.forEach(p => { const is23 = p.yr === '2023'; p.c.setAttribute('cx', done && is23 ? p.ordX : p.dateX); p.c.style.opacity = done && !is23 ? 0 : 1; });
      if (tag) tag.textContent = done ? 'After · the 2023 season by race order' : 'Before · three seasons on one date axis';
    };
    return { state, play: async (wait, isCurrent) => { fig.classList.add('gc-instant'); state(false); fig.offsetWidth; fig.classList.remove('gc-instant'); await wait(1200); state(true); } };
  }

  /* B · Decision 2: every 2023 result first, then the trend line */
  function trend(fig, svg) {
    svg.setAttribute('viewBox', `0 0 ${W} 300`);
    const { y, B } = axes(svg, 300, T('18:10'), T('20:20'), ['18:30','19:00','19:30','20:00'].map(T));
    const d = RACES[2023].map(([, t]) => T(t)), x = i => L + 20 + i * (W - L - R - 40) / 8, { s, b, avg } = regress(d);
    el('line', { x1: L, x2: W - R, y1: y(avg), y2: y(avg), class: 'gc-avg' }, svg);
    el('text', { x: L + 6, y: y(avg) - 6 }, svg).textContent = 'avg ' + fmt(avg);
    const line = el('polyline', { class: 'gc-line gc-2023', points: d.map((v, i) => x(i) + ',' + y(v)).join(' ') }, svg);
    const tr = el('line', { x1: x(0), y1: y(b), x2: x(8), y2: y(s * 8 + b), class: 'gc-trend gc-2023' }, svg);
    const tlen = Math.hypot(x(8) - x(0), y(s * 8 + b) - y(b));
    const ring = el('circle', { cx: x(6), cy: y(d[6]), r: 11, class: 'gc-ring' }, svg);
    const ringT = el('text', { x: x(6), y: y(d[6]) - 18, 'text-anchor': 'middle', class: 'gc-strong' }, svg); ringT.textContent = '+1:19.5';
    const pts = d.map((v, i) => el('circle', { cx: x(i), cy: y(v), r: 4.5, class: 'gc-pt gc-2023' }, svg));
    d.forEach((_, i) => { el('text', { x: x(i), y: B + 22, 'text-anchor': 'middle' }, svg).textContent = 'R' + (i + 1); });
    const lab = el('text', { x: x(8) - 14, y: y(s * 8 + b) + 22, 'text-anchor': 'end', class: 'gc-strong' }, svg); lab.textContent = '↓ Faster trend';
    const plen = line.getTotalLength();
    const state = done => {
      line.style.strokeDasharray = plen; line.style.strokeDashoffset = done ? 0 : plen;
      tr.style.strokeDasharray = done ? '7 5' : tlen; tr.style.strokeDashoffset = done ? 0 : tlen;
      pts.forEach(p => p.style.opacity = done ? 1 : 0);
      [ring, ringT, lab].forEach(e => e.style.opacity = done ? 1 : 0);
    };
    return { state, play: async (wait, isCurrent) => {
      fig.classList.add('gc-instant'); state(false); fig.offsetWidth; fig.classList.remove('gc-instant');
      line.style.transition = 'stroke-dashoffset 1.6s linear'; line.style.strokeDashoffset = 0;
      for (let i = 0; i < pts.length; i++) { pts[i].style.opacity = 1; if (i === 6) { ring.style.opacity = ringT.style.opacity = 1; } await wait(170); }
      await wait(250); tr.style.transition = 'stroke-dashoffset 1s ease-out'; tr.style.strokeDashoffset = 0;
      await wait(1000); tr.style.transition = 'none'; tr.style.strokeDasharray = '7 5'; lab.style.opacity = 1;
      line.style.transition = tr.style.transition = '';
    } };
  }

  /* C · Decision 3: the 2025 opener against the 2024 average */
  function opener(fig, svg) {
    svg.setAttribute('viewBox', `0 0 ${W} 240`);
    const { y } = axes(svg, 240, T('16:50'), T('20:40'), ['17:00','18:00','19:00','20:00'].map(T));
    const avg = RACES[2024].map(([, t]) => T(t)).reduce((a, b) => a + b) / RACES[2024].length, op = T(RACES[2025][0][1]), xo = W - R - 150, len = W - R - L;
    const al = el('line', { x1: L, x2: W - R, y1: y(avg), y2: y(avg), class: 'gc-line gc-2024' }, svg);
    el('text', { x: L + 6, y: y(avg) - 8, class: 'gc-strong' }, svg).textContent = '2024 average · ' + fmt(avg);
    const br = el('line', { x1: xo, x2: xo, y1: y(avg), y2: y(op), class: 'gc-gap' }, svg);
    const pt = el('circle', { cx: xo, cy: y(op), r: 6, class: 'gc-pt gc-2025' }, svg);
    const pl = el('text', { x: xo - 14, y: y(op) + 22, 'text-anchor': 'end', class: 'gc-strong' }, svg); pl.textContent = '2025 opener · ' + fmt(op);
    const gap = el('text', { x: xo - 12, y: (y(avg) + y(op)) / 2 + 4, 'text-anchor': 'end', class: 'gc-strong' }, svg);
    const diff = avg - op;
    const state = done => {
      al.style.strokeDasharray = len; al.style.strokeDashoffset = done ? 0 : len;
      pt.setAttribute('cy', done ? y(op) : y(avg) - 30); pt.style.opacity = done ? 1 : 0;
      [br, pl, gap].forEach(e => e.style.opacity = done ? 1 : 0); gap.textContent = '−' + fmt(diff);
    };
    return { state, play: async (wait, isCurrent) => {
      fig.classList.add('gc-instant'); state(false); fig.offsetWidth; fig.classList.remove('gc-instant');
      al.style.transition = 'stroke-dashoffset .9s ease-out'; al.style.strokeDashoffset = 0; await wait(900);
      pt.style.opacity = 1; pt.setAttribute('cy', y(op)); await wait(900);
      br.style.opacity = pl.style.opacity = gap.style.opacity = 1;
      const t0 = performance.now(), dur = reduced.matches ? 0 : 900;
      const tick = now => { if (!isCurrent()) return; const k = dur ? Math.min(1, (now - t0) / dur) : 1; gap.textContent = '−' + fmt(diff * k); if (k < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick); al.style.transition = '';
    } };
  }

  const builders = { axis, trend, opener };
  const models = new Map();
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    const m = models.get(entry.target); if (!m) return;
    if (!entry.isIntersecting) { m.armed = false; m.stop(); }
    else if (entry.intersectionRatio >= .55 && !m.armed) { m.armed = true; m.run(); }
  }), { threshold: [0, .55] });
  document.querySelectorAll('.gc-motion[data-gc]').forEach(fig => {
    const svg = fig.querySelector('svg.gc-svg'), make = builders[fig.dataset.gc];
    if (!svg || !make) return;
    const animation = make(fig, svg);
    let generation = 0;
    const final = () => {
      fig.classList.add('gc-instant');
      svg.querySelectorAll('*').forEach(el => el.style.removeProperty('transition'));
      animation.state(true); fig.getBoundingClientRect(); fig.classList.remove('gc-instant');
    };
    const model = {
      armed: false,
      stop() { generation++; final(); },
      async run() {
        const current = ++generation;
        if (reduced.matches) { final(); return; }
        const isCurrent = () => current === generation;
        const wait = ms => new Promise(resolve => setTimeout(resolve, ms)).then(() => {
          if (!isCurrent()) throw new Error('Animation cancelled');
        });
        try { await animation.play(wait, isCurrent); }
        catch (error) { if (isCurrent()) console.error(error); }
      }
    };
    models.set(fig, model); final();
    fig.querySelector('[data-gc-replay]')?.addEventListener('click', () => model.run());
    io.observe(fig);
  });
  reduced.addEventListener('change', () => models.forEach(m => { m.stop(); m.armed = false; }));
})();
