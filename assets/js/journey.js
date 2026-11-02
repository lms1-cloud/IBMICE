/* Q2D Journey page controller (index.html).
   - Mobile nav sheet toggle
   - 400vh robot scroll stage: canvas renderer + four text beats + progress rail
   - 600vh lunar mission: parallax layers, trajectory, km counter, mission reel
   Scroll/pointer-driven values are written as CSS custom properties on .page;
   the markup reads them with var(--…). */
(function () {
  'use strict';

  var R = window.Q2DRobot;
  var interp = R.interp;
  var root = document.querySelector('.page');
  var stage = document.querySelector('[data-stage]');
  var lunar = document.querySelector('[data-lunar]');
  var track = document.querySelector('[data-reel-track]');
  var canvas = document.querySelector('[data-robot-canvas]');
  var kmEl = document.querySelector('[data-lm-km]');
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var state = { p: 0, q: 0, mx: 0, my: 0, reel: 1200 };

  /* ---------- nav sheet ---------- */
  var toggle = document.querySelector('[data-menu-toggle]');
  var sheet = document.getElementById('nav-sheet');
  var iconOpen = document.querySelector('[data-menu-icon="open"]');
  var iconClose = document.querySelector('[data-menu-icon="close"]');
  function setMenu(open) {
    sheet.hidden = !open;
    iconOpen.toggleAttribute('hidden', open);
    iconClose.toggleAttribute('hidden', !open);
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  toggle.addEventListener('click', function () { setMenu(sheet.hidden); });
  document.querySelectorAll('[data-menu-close]').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });

  /* ---------- hero video: fade in once it can play ---------- */
  var heroVideo = document.querySelector('[data-hero-video]');
  if (heroVideo) {
    var ready = function () { heroVideo.classList.add('is-ready'); };
    if (heroVideo.readyState >= 3) ready();
    heroVideo.addEventListener('playing', ready);
    heroVideo.addEventListener('canplay', ready);
    if (reduceMotion) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
  }

  /* ---------- helpers ---------- */
  function set(name, value) { root.style.setProperty(name, value); }
  function progress(el) {
    var r = el.getBoundingClientRect();
    var span = r.height - window.innerHeight;
    return span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
  }

  function beat(id, input, output) {
    var o = interp(state.p, input, output);
    set('--' + id + '-o', o.toFixed(3));
    set('--' + id + '-t', 'translateY(' + ((1 - o) * 40).toFixed(1) + 'px)');
    set('--' + id + '-pe', o > 0.5 ? 'auto' : 'none');
  }

  function renderStage() {
    beat('b0', [0, 0.1, 0.18], [1, 1, 0]);
    beat('b1', [0.2, 0.28, 0.4, 0.47], [0, 1, 1, 0]);
    beat('b2', [0.5, 0.57, 0.68, 0.75], [0, 1, 1, 0]);
    beat('b3', [0.82, 0.9, 1], [0, 1, 1]);
    set('--rail', (state.p * 100).toFixed(1) + '%');
  }

  function renderLunar() {
    var q = state.q, mx = state.mx, my = state.my;
    var seg = function (a, b) { return Math.min(1, Math.max(0, (q - a) / (b - a))); };
    var rise = seg(0, 0.35);
    var shift = function (depth) { return { x: (mx * depth * -22).toFixed(1), y: (my * depth * -12).toFixed(1) }; };
    var lt = function (riseVh, depth) {
      var c = shift(depth);
      return 'translate3d(' + c.x + 'px, calc(' + (riseVh * (1 - rise)).toFixed(2) + 'vh + ' + c.y + 'px), 0)';
    };
    var k = seg(0.36, 0.68);

    set('--lm-t1', lt(-4, 0.1));
    set('--lm-t2', lt(40, 0.25));
    set('--lm-t3', lt(6, 0.35));
    set('--lm-t4', lt(12, 0.55));
    set('--lm-t5', lt(22, 0.8));
    var d6 = shift(1.1);
    set('--lm-t6', 'translate3d(' + d6.x + 'px, calc(' + (-12 * seg(0, 0.3)).toFixed(2) + 'vh + ' + d6.y + 'px), 0)');
    set('--lm-dustO', interp(q, [0, 0.3], [1, 0]).toFixed(3));
    var tt = shift(0.3);
    set('--lm-tt', 'translate3d(' + tt.x + 'px,' + tt.y + 'px,0)');
    set('--lm-off', (1250.5 * (1 - k)).toFixed(1));
    set('--lm-trajO', interp(q, [0.3, 0.36, 0.64, 0.71], [0, 1, 1, 0.18]).toFixed(3));
    set('--lm-shade', interp(q, [0.66, 0.74], [0, 0.65]).toFixed(3));
    var intro = interp(q, [0, 0.2, 0.28], [1, 1, 0]);
    set('--lm-introO', intro.toFixed(3));
    set('--lm-introT', 'translateY(' + (-30 * (1 - intro)).toFixed(1) + 'px)');
    set('--lm-counterO', interp(q, [0.3, 0.36, 0.64, 0.69], [0, 1, 1, 0]).toFixed(3));
    set('--lm-reelO', interp(q, [0.72, 0.78], [0, 1]).toFixed(3));
    set('--lm-reelPE', q > 0.72 ? 'auto' : 'none');
    set('--lm-reelT', 'translateX(' + (-state.reel * seg(0.74, 1)).toFixed(1) + 'px)');
    set('--lm-beacon', k >= 0.999 ? '1' : '0');

    var stops = [0, 0.34, 0.68, 1];
    for (var i = 0; i < 4; i++) {
      var on = k >= stops[i] - 0.001;
      set('--lm-m' + i, on ? '1' : '0.25');
      set('--lm-f' + i, on ? '#6F94FF' : '#050505');
    }
    kmEl.textContent = Math.round(k * 384400).toLocaleString('en-US');
  }

  /* ---------- scroll + pointer ---------- */
  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      renderStage();
      renderLunar();
    });
  }
  function onScroll() {
    state.p = progress(stage);
    state.q = progress(lunar);
    state.reel = Math.max(0, track.scrollWidth - window.innerWidth + 48);
    schedule();
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);

  var ptr = { x: 0, y: 0 };
  window.addEventListener('pointermove', function (e) {
    ptr.x = (e.clientX / window.innerWidth) * 2 - 1;
    ptr.y = (e.clientY / window.innerHeight) * 2 - 1;
    state.mx = ptr.x;
    state.my = ptr.y;
    schedule();
  }, { passive: true });

  /* ---------- robot canvas ---------- */
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas);
  else window.addEventListener('resize', resize);

  var visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(stage);
  }

  var eased = 0, ex = 0, ey = 0;
  function tick(time) {
    requestAnimationFrame(tick);
    if (!visible) return;
    eased += (state.p - eased) * 0.12;
    ex += (ptr.x - ex) * 0.06;
    ey += (ptr.y - ey) * 0.06;
    R.drawRobot(ctx, W, H, R.explodeAt(eased), ex, ey, reduceMotion ? 0 : time, R.driftAt(eased));
  }
  requestAnimationFrame(tick);

  onScroll();
  renderStage();
  renderLunar();
})();
