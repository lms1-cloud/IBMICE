/* Q2D Landing page controller (landing.html).
   - Cursor follower ring
   - Pointer parallax on [data-parallax="kx,ky"] elements
   - 3D tilt on [data-tilt="depth"] cards
   - Rotating neural-core globe on canvas[data-core] that reacts to the pointer */
(function () {
  'use strict';

  var page = document.querySelector('.landing');
  var cursor = document.querySelector('[data-cursor]');
  var parallax = Array.prototype.slice.call(document.querySelectorAll('[data-parallax]')).map(function (el) {
    var k = el.getAttribute('data-parallax').split(',').map(Number);
    return { el: el, kx: k[0], ky: k[1] };
  });
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* pointer target: mx/my in -1..1, cx/cy in client px */
  var target = { mx: 0, my: 0, cx: -100, cy: -100 };
  var raf = 0;

  function render() {
    raf = 0;
    parallax.forEach(function (p) {
      p.el.style.transform = 'translate3d(' + (-target.mx * p.kx).toFixed(1) + 'px,' + (-target.my * p.ky).toFixed(1) + 'px,0)';
    });
    cursor.style.transform = 'translate3d(' + (target.cx - 18) + 'px,' + (target.cy - 18) + 'px,0)';
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }

  page.addEventListener('mousemove', function (e) {
    target.mx = (e.clientX / window.innerWidth) * 2 - 1;
    target.my = (e.clientY / window.innerHeight) * 2 - 1;
    target.cx = e.clientX;
    target.cy = e.clientY;
    cursor.style.opacity = '1';
    schedule();
  });
  page.addEventListener('mouseleave', function () {
    target.mx = 0; target.my = 0;
    cursor.style.opacity = '0';
    schedule();
  });

  /* ---------- 3D tilt cards ---------- */
  document.querySelectorAll('[data-tilt]').forEach(function (el) {
    var depth = Number(el.getAttribute('data-tilt')) || 10;
    var rest = 'rotateX(0deg) rotateY(0deg) translateZ(0)';
    el.style.transform = rest;
    el.addEventListener('mousemove', function (e) {
      var r = el.getBoundingClientRect();
      var x = (e.clientX - r.left) / r.width - 0.5;
      var y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = 'rotateX(' + (-y * depth).toFixed(2) + 'deg) rotateY(' + (x * depth).toFixed(2) + 'deg) translateZ(10px)';
    });
    el.addEventListener('mouseleave', function () { el.style.transform = rest; });
  });

  /* ---------- neural core globe ---------- */
  var cv = document.querySelector('[data-core]');
  var ctx = cv.getContext('2d');
  var W = 0, H = 0, dpr = 1;
  function resize() {
    var r = cv.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    cv.width = Math.max(1, Math.round(W * dpr));
    cv.height = Math.max(1, Math.round(H * dpr));
  }
  resize();
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv);
  else window.addEventListener('resize', resize);

  var N = 460, pts = [];
  var ga = Math.PI * (3 - Math.sqrt(5));
  for (var i = 0; i < N; i++) {
    var y = 1 - (i / (N - 1)) * 2, rad = Math.sqrt(1 - y * y), th = ga * i;
    var wob = 1 + (Math.sin(i * 12.9898) * 0.5) * 0.06;
    pts.push([Math.cos(th) * rad * wob, y * wob, Math.sin(th) * rad * wob]);
  }
  var pairs = [];
  for (var a = 0; a < N; a++) for (var b = a + 1; b < N; b++) {
    var dx = pts[a][0] - pts[b][0], dy = pts[a][1] - pts[b][1], dz = pts[a][2] - pts[b][2];
    if (dx * dx + dy * dy + dz * dz < 0.034) pairs.push([a, b]);
  }
  var rings = [];
  for (var k = 0; k < 3; k++) {
    var tilt = [0.4, -0.9, 1.3][k], rr = [1.32, 1.5, 1.18][k], ring = [];
    for (var s = 0; s < 120; s++) {
      var t = (s / 120) * Math.PI * 2;
      var x = Math.cos(t) * rr, z = Math.sin(t) * rr;
      ring.push([x, z * Math.sin(tilt), z * Math.cos(tilt)]);
    }
    rings.push({ ring: ring, speed: [0.006, -0.004, 0.008][k], phase: k * 2 });
  }
  var packets = [];
  for (var p = 0; p < 26; p++) packets.push({ e: Math.floor(Math.random() * pairs.length), t: Math.random() });

  var ay = 0, rx = 0.25, ry = 0, time = 0;
  var proj = new Array(N);
  function rot(q, cy, sy, cx, sx) {
    var x = q[0] * cy - q[2] * sy, z = q[0] * sy + q[2] * cy, y = q[1];
    var y2 = y * cx - z * sx; z = y * sx + z * cx;
    return [x, y2, z];
  }

  var visible = true;
  if (window.IntersectionObserver) {
    new IntersectionObserver(function (entries) { visible = entries[0].isIntersecting; }).observe(cv);
  }

  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    if (!reduceMotion) { time += 1; ay += 0.0032; }
    rx += ((0.25 + target.my * 0.6) - rx) * 0.05;
    ry += ((target.mx * 0.9) - ry) * 0.05;
    var cy = Math.cos(ay + ry), sy = Math.sin(ay + ry), cx = Math.cos(rx), sx = Math.sin(rx);
    var R = Math.min(W, H) * 0.3, f = R * 3.2, ox = W / 2, oy = H / 2;
    var rect = cv.getBoundingClientRect();
    var lmx = target.cx - rect.left, lmy = target.cy - rect.top;
    var i, q, sc;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // soft core shadow for depth
    var g = ctx.createRadialGradient(ox - R * 0.25, oy - R * 0.3, R * 0.1, ox, oy, R * 1.15);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.6, 'rgba(160,180,200,0.18)');
    g.addColorStop(1, 'rgba(160,180,200,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ox, oy, R * 1.15, 0, Math.PI * 2); ctx.fill();

    for (i = 0; i < N; i++) {
      q = rot(pts[i], cy, sy, cx, sx);
      sc = f / (f - q[2] * R);
      proj[i] = [ox + q[0] * R * sc, oy + q[1] * R * sc, q[2]];
    }

    ctx.lineWidth = 0.8;
    for (i = 0; i < pairs.length; i++) {
      var pa = proj[pairs[i][0]], pb = proj[pairs[i][1]];
      var al = 0.08 + ((pa[2] + pb[2]) * 0.5 + 1) * 0.22;
      ctx.strokeStyle = 'rgba(11,15,20,' + al.toFixed(3) + ')';
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }

    for (i = 0; i < N; i++) {
      var pp = proj[i], zz = pp[2];
      var ddx = pp[0] - lmx, ddy = pp[1] - lmy, d = Math.sqrt(ddx * ddx + ddy * ddy);
      if (d < 110 && zz > -0.2) {
        var kk = 1 - d / 110;
        ctx.strokeStyle = 'rgba(45,91,255,' + (kk * 0.7).toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(pp[0], pp[1]); ctx.lineTo(lmx, lmy); ctx.stroke();
        ctx.fillStyle = '#2D5BFF';
        ctx.beginPath(); ctx.arc(pp[0], pp[1], 1.8 + kk * 3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(11,15,20,' + (0.15 + (zz + 1) * 0.4).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(pp[0], pp[1], 0.8 + (zz + 1) * 1.1, 0, Math.PI * 2); ctx.fill();
      }
    }

    for (i = 0; i < packets.length; i++) {
      var pk = packets[i];
      if (!reduceMotion) pk.t += 0.03;
      if (pk.t >= 1) { pk.t = 0; pk.e = Math.floor(Math.random() * pairs.length); }
      var ea = proj[pairs[pk.e][0]], eb = proj[pairs[pk.e][1]];
      if ((ea[2] + eb[2]) < 0) continue;
      ctx.fillStyle = '#2D5BFF';
      ctx.shadowColor = 'rgba(45,91,255,0.8)'; ctx.shadowBlur = 10;
      ctx.beginPath(); ctx.arc(ea[0] + (eb[0] - ea[0]) * pk.t, ea[1] + (eb[1] - ea[1]) * pk.t, 2.4, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
    }

    for (var r = 0; r < rings.length; r++) {
      var rg = rings[r], spin = time * rg.speed;
      var cs = Math.cos(spin), sn = Math.sin(spin);
      ctx.beginPath();
      for (var n = 0; n < rg.ring.length; n++) {
        var p0 = rg.ring[n];
        q = rot([p0[0] * cs - p0[2] * sn, p0[1], p0[0] * sn + p0[2] * cs], cy, sy, cx, sx);
        sc = f / (f - q[2] * R);
        if (n === 0) ctx.moveTo(ox + q[0] * R * sc, oy + q[1] * R * sc);
        else ctx.lineTo(ox + q[0] * R * sc, oy + q[1] * R * sc);
      }
      ctx.closePath();
      ctx.strokeStyle = r === 1 ? 'rgba(45,91,255,0.45)' : 'rgba(11,15,20,0.22)';
      ctx.setLineDash(r === 2 ? [3, 6] : []);
      ctx.stroke(); ctx.setLineDash([]);
      var sp = rg.ring[Math.floor((time * 0.5 + rg.phase * 20) % rg.ring.length)];
      q = rot([sp[0] * cs - sp[2] * sn, sp[1], sp[0] * sn + sp[2] * cs], cy, sy, cx, sx);
      sc = f / (f - q[2] * R);
      ctx.fillStyle = r === 1 ? '#2D5BFF' : '#0B0F14';
      ctx.beginPath(); ctx.arc(ox + q[0] * R * sc, oy + q[1] * R * sc, 4 + q[2] * 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }
  requestAnimationFrame(frame);
})();
