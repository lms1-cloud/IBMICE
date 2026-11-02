/* Procedural "Q2D Sentinel" robot-head renderer used by the scroll stage on index.html.
   Exposes window.Q2DRobot = { drawRobot, explodeAt, driftAt, interp }. */
(function () {
'use strict';
// Procedural "Q2D Sentinel" robot-head dismantling renderer (side profile, facing right).
// Live stand-in until the real image sequence is in /public/sequence.

const BG = "#050505";

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

/** Scroll progress (0..1) → dismantle amount (0..1): assembled → dismantled at 60% → reassembled at 90%. */
/** Scroll progress → horizontal drift: right while the left-aligned text shows, left while the right-aligned text shows. */
function driftAt(p) {
  const k = [[0, 0], [0.18, 0], [0.3, 0.55], [0.42, 0.55], [0.55, -0.78], [0.72, -0.78], [0.85, 0], [1, 0]];
  for (let i = 1; i < k.length; i++) {
    if (p <= k[i][0]) {
      const f = ease((p - k[i - 1][0]) / (k[i][0] - k[i - 1][0]));
      return k[i - 1][1] + (k[i][1] - k[i - 1][1]) * f;
    }
  }
  return 0;
}

function explodeAt(p) {
  if (p < 0.15) return 0;
  if (p < 0.6) return ease((p - 0.15) / 0.45);
  if (p < 0.9) return 1 - ease((p - 0.6) / 0.3);
  return 0;
}

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const SVG = {
  head: "M 40 -150 C 75 -148 100 -120 108 -85 C 113 -65 116 -55 114 -45 C 110 -35 112 -22 122 -8 L 138 8 C 136 16 126 20 118 22 C 124 30 128 36 124 42 L 116 48 C 124 54 126 62 120 70 C 116 80 118 92 108 104 C 96 116 78 120 58 120 C 30 124 0 118 -38 102 L -96 96 C -128 78 -148 45 -152 5 L -158 -20 C -165 -70 -150 -130 -110 -160 C -60 -195 20 -185 40 -150 Z",
  face: "M 40 -150 C 75 -148 100 -120 108 -85 C 113 -65 116 -55 114 -45 C 110 -35 112 -22 122 -8 L 138 8 C 136 16 126 20 118 22 C 124 30 128 36 124 42 L 116 48 C 124 54 126 62 120 70 C 116 80 118 92 108 104 C 96 116 78 120 58 120 L 48 108 C 52 70 46 30 36 0 C 28 -40 30 -100 40 -150 Z",
  cranium: "M 40 -150 C 20 -185 -60 -195 -110 -160 C -150 -130 -165 -70 -158 -20 L -152 5 C -125 0 -100 -18 -82 -42 C -62 -78 -20 -104 30 -112 C 35 -125 38 -140 40 -150 Z",
  rear: "M -152 5 C -148 45 -128 78 -96 96 L -38 102 C -50 70 -62 40 -78 20 C -100 5 -125 0 -152 5 Z",
  jaw: "M 48 108 L 58 120 C 30 124 0 118 -38 102 C -36 80 -26 62 -10 56 C 15 52 35 62 46 80 Z",
  faceSeams: "M 64 -12 C 80 0 94 14 104 34 M 50 -122 C 70 -118 90 -105 100 -88 M 106 -30 C 100 -20 98 -10 104 2",
};

const PANELS = [
  { key: "rear", pivot: [-110, 50], d: [-150, 70], rot: -0.2, depth: 0.5, mat: "chrome2", screws: [[-132, 40], [-86, 86]] },
  { key: "jaw", pivot: [10, 95], d: [70, 105], rot: 0.22, depth: 0.85, mat: "chrome", screws: [[-4, 80], [30, 74]] },
  { key: "cranium", pivot: [-60, -120], d: [-125, -25], rot: -0.1, depth: 0.7, mat: "chrome", screws: [[-104, -146], [-6, -156], [-146, -62]] },
  { key: "face", pivot: [80, -10], d: [112, -6], rot: 0.07, depth: 1.1, mat: "ceramic", screws: [[56, -124], [70, 96]] },
];

const WIRES = [
  { d: "M -60 20 C -80 90 -100 170 -105 330", w: 7 },
  { d: "M -30 40 C -40 90 -70 160 -72 330", w: 8 },
  { d: "M -10 50 C -10 110 -30 190 -40 330", w: 6 },
  { d: "M 12 46 C 22 110 4 200 -4 330", w: 5 },
];
const DATA_WIRES = [
  "M -25 -45 C 10 -52 50 -46 84 -40",
  "M -20 10 C -30 80 -50 180 -56 330",
  "M 0 -30 C 20 20 30 60 20 120",
];

const DUST = (() => {
  const r = rng(42);
  return Array.from({ length: 70 }, () => ({ x: r(), y: r(), sp: 0.2 + r() * 0.6, sz: 0.4 + r() * 1.2 }));
})();
const BRAIN_NODES = (() => {
  const r = rng(11);
  return Array.from({ length: 26 }, () => ({ x: -100 + r() * 150, y: -120 + r() * 95, ph: r() * 6 }));
})();

let P2D = null;
function paths() {
  if (!P2D) {
    P2D = {};
    for (const k in SVG) P2D[k] = new Path2D(SVG[k]);
    P2D.wires = WIRES.map((w) => ({ p: new Path2D(w.d), w: w.w }));
    P2D.data = DATA_WIRES.map((d) => new Path2D(d));
  }
  return P2D;
}

function material(ctx, name) {
  if (name === "ceramic") {
    const g = ctx.createLinearGradient(40, -150, 140, 120);
    g.addColorStop(0, "#f3f5f7");
    g.addColorStop(0.45, "#d3d8dd");
    g.addColorStop(0.75, "#98a0a9");
    g.addColorStop(1, "#5a616a");
    return g;
  }
  const g = ctx.createLinearGradient(-165, -195, 60, 125);
  const dark = name === "chrome2";
  g.addColorStop(0, dark ? "#1d2228" : "#2b3139");
  g.addColorStop(0.3, dark ? "#aab2ba" : "#dde2e7");
  g.addColorStop(0.42, dark ? "#5e666f" : "#7f8892");
  g.addColorStop(0.6, dark ? "#15191d" : "#21262c");
  g.addColorStop(0.82, dark ? "#7f8892" : "#a9b2bb");
  g.addColorStop(1, "#14171b");
  return g;
}

function gear(ctx, x, y, r, teeth, angle, light) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  const inner = r * 0.84;
  for (let i = 0; i < teeth; i++) {
    const a0 = (i / teeth) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / teeth;
    const q = (a1 - a0) / 4;
    ctx.lineTo(Math.cos(a0) * inner, Math.sin(a0) * inner);
    ctx.lineTo(Math.cos(a0 + q) * r, Math.sin(a0 + q) * r);
    ctx.lineTo(Math.cos(a0 + 2 * q) * r, Math.sin(a0 + 2 * q) * r);
    ctx.lineTo(Math.cos(a0 + 3 * q) * inner, Math.sin(a0 + 3 * q) * inner);
  }
  ctx.closePath();
  const g = ctx.createRadialGradient(-r * 0.4, -r * 0.4, r * 0.1, 0, 0, r);
  g.addColorStop(0, light ? "#e3e8ec" : "#9aa3ac");
  g.addColorStop(0.6, light ? "#7c858f" : "#4a525b");
  g.addColorStop(1, "#1a1e23");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = 0.8;
  ctx.stroke();
  ctx.fillStyle = "#0b0e12";
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = "#c9d0d6";
  ctx.fill();
  ctx.restore();
}

/**
 * @param t   dismantle amount 0..1
 * @param mx  pointer x -1..1, @param my pointer y -1..1 (3D parallax)
 * @param drift  horizontal shift -1..1 so the robot makes room for side text
 */
function drawRobot(ctx, W, H, t, mx, my, time, drift = 0) {
  const P = paths();
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);

  for (const d of DUST) {
    const y = (((d.y - time * 0.00006 * d.sp) % 1) + 1) % 1;
    ctx.fillStyle = `rgba(150,175,255,${0.07 + d.sz * 0.05})`;
    ctx.beginPath();
    ctx.arc(d.x * W + mx * d.sz * 6, y * H, d.sz, 0, Math.PI * 2);
    ctx.fill();
  }

  const s = Math.min(W / 720, H / 600);
  const cx = W / 2 - 10 * s + drift * Math.min(W * 0.2, 300 * s);
  const cy = H / 2 - 40 * s + Math.sin(time * 0.0012) * 5 * s;

  // backlight
  const bl = ctx.createRadialGradient(cx + 40 * s, cy - 20 * s, 10 * s, cx, cy, 380 * s);
  bl.addColorStop(0, `rgba(45,91,255,${0.22 + 0.1 * t})`);
  bl.addColorStop(0.5, "rgba(45,91,255,0.05)");
  bl.addColorStop(1, "rgba(45,91,255,0)");
  ctx.fillStyle = bl;
  ctx.fillRect(0, 0, W, H);

  const layer = (depth, fn) => {
    ctx.save();
    ctx.translate(cx + mx * depth * 18 * s, cy + my * depth * 11 * s);
    ctx.rotate(mx * 0.035);
    ctx.scale(s, s);
    fn();
    ctx.restore();
  };

  // ── interior ──
  layer(0.25, () => {
    ctx.save();
    ctx.translate(-10, -30);
    ctx.scale(0.97, 0.97);
    ctx.translate(10, 30);
    const ig = ctx.createRadialGradient(-20, -40, 10, -20, -20, 190);
    ig.addColorStop(0, "#111827");
    ig.addColorStop(1, "#06080b");
    ctx.fillStyle = ig;
    ctx.fill(P.head);
    ctx.restore();

    // neck vertebrae
    for (let i = 0; i < 7; i++) {
      ctx.save();
      ctx.translate(-56 - i * 3.5, 128 + i * 27 + t * i * 9);
      ctx.rotate(-0.08);
      const vg = ctx.createLinearGradient(-30, -9, 30, 9);
      vg.addColorStop(0, "#2a3036");
      vg.addColorStop(0.35, "#c3cad1");
      vg.addColorStop(0.6, "#3a4148");
      vg.addColorStop(1, "#15181c");
      ctx.fillStyle = vg;
      ctx.beginPath();
      ctx.roundRect(-30, -9, 60, 18, 7);
      ctx.fill();
      ctx.restore();
    }

    // wiring harness
    ctx.lineCap = "round";
    for (const w of P.wires) {
      ctx.strokeStyle = "#13171d";
      ctx.lineWidth = w.w;
      ctx.stroke(w.p);
      ctx.strokeStyle = "rgba(120,140,170,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke(w.p);
    }

    // neural "brain" module
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(-28, -76, 84, 54, -0.12, 0, Math.PI * 2);
    const bg = ctx.createRadialGradient(-28, -80, 5, -28, -76, 90);
    bg.addColorStop(0, `rgba(45,91,255,${0.25 + 0.35 * t})`);
    bg.addColorStop(0.7, "#0b1226");
    bg.addColorStop(1, "#070a14");
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.clip();
    ctx.strokeStyle = `rgba(110,150,255,${0.25 + 0.35 * t})`;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let i = 0; i < BRAIN_NODES.length - 1; i++) {
      const a = BRAIN_NODES[i];
      const b = BRAIN_NODES[(i * 7 + 3) % BRAIN_NODES.length];
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
    ctx.stroke();
    for (const n of BRAIN_NODES) {
      const g = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(time * 0.003 + n.ph));
      ctx.fillStyle = `rgba(120,165,255,${(g * (0.4 + 0.6 * t)).toFixed(3)})`;
      ctx.shadowColor = "rgba(80,130,255,0.9)";
      ctx.shadowBlur = 6 + 8 * t;
      ctx.beginPath();
      ctx.arc(n.x, n.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();

    // gear train
    const spin = time * 0.0007 * (1 + 2.5 * t);
    gear(ctx, -22, 10, 44, 16, spin, false);
    gear(ctx, 30, -26, 26, 10, -spin * (44 / 26) + 0.2, true);
    gear(ctx, -48, -46, 20, 8, -spin * (44 / 20), true);

    // optic barrel
    const ob = ctx.createLinearGradient(30, -48, 30, -32);
    ob.addColorStop(0, "#c7ced5");
    ob.addColorStop(0.5, "#4b535c");
    ob.addColorStop(1, "#1a1e23");
    ctx.fillStyle = ob;
    ctx.beginPath();
    ctx.roundRect(28, -47, 58, 14, 4);
    ctx.fill();

    // data wires (animated flow)
    ctx.setLineDash([6, 10]);
    ctx.lineDashOffset = -time * 0.06;
    ctx.strokeStyle = `rgba(95,145,255,${0.55 + 0.4 * t})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = "rgba(80,130,255,0.9)";
    ctx.shadowBlur = 8;
    for (const d of P.data) ctx.stroke(d);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // fade the neck into the background
    const nf = ctx.createLinearGradient(0, 200, 0, 330);
    nf.addColorStop(0, "rgba(5,5,5,0)");
    nf.addColorStop(1, "rgba(5,5,5,1)");
    ctx.fillStyle = nf;
    ctx.fillRect(-200, 200, 400, 140);
  });

  // ── outer panels ──
  for (const pn of PANELS) {
    layer(pn.depth, () => {
      const ox = pn.d[0] * t;
      const oy = pn.d[1] * t;
      if (t > 0.02) {
        ctx.save();
        ctx.setLineDash([3, 5]);
        ctx.strokeStyle = `rgba(160,180,220,${0.3 * t})`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(pn.pivot[0], pn.pivot[1]);
        ctx.lineTo(pn.pivot[0] + ox, pn.pivot[1] + oy);
        ctx.stroke();
        ctx.restore();
      }
      ctx.translate(pn.pivot[0] + ox, pn.pivot[1] + oy);
      ctx.rotate(pn.rot * t);
      ctx.translate(-pn.pivot[0], -pn.pivot[1]);
      const path = P[pn.key];

      // thickness + drop shadow
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.65)";
      ctx.shadowBlur = 6 + 26 * t;
      ctx.shadowOffsetY = 6 * t;
      ctx.translate(-2.5, 3);
      ctx.fillStyle = "#0b0d10";
      ctx.fill(path);
      ctx.restore();

      ctx.fillStyle = material(ctx, pn.mat);
      ctx.fill(path);

      // specular sweep
      ctx.save();
      ctx.clip(path);
      const sw = ctx.createLinearGradient(-160, -200, 140, 120);
      const k = 0.35 + mx * 0.12;
      sw.addColorStop(Math.max(0, k - 0.06), "rgba(255,255,255,0)");
      sw.addColorStop(k, "rgba(255,255,255,0.35)");
      sw.addColorStop(Math.min(1, k + 0.06), "rgba(255,255,255,0)");
      ctx.fillStyle = sw;
      ctx.fillRect(-200, -220, 380, 360);
      if (pn.key === "face") {
        ctx.strokeStyle = "rgba(0,0,0,0.22)";
        ctx.lineWidth = 1;
        ctx.stroke(P.faceSeams);
      }
      ctx.restore();

      // rim light + edge
      ctx.strokeStyle = pn.key === "face" ? "rgba(170,195,255,0.55)" : "rgba(140,175,255,0.4)";
      ctx.lineWidth = 1.2;
      ctx.stroke(path);

      // screws
      for (const sc of pn.screws) {
        ctx.beginPath();
        ctx.arc(sc[0], sc[1], 2.6, 0, Math.PI * 2);
        ctx.fillStyle = "#1a1e23";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(sc[0] - 0.6, sc[1] - 0.6, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ctx.fill();
      }

      if (pn.key === "face") {
        ctx.fillStyle = "#0a0d13";
        ctx.beginPath();
        ctx.ellipse(86, -40, 15, 8, -0.05, 0, Math.PI * 2);
        ctx.fill();
        const pulse = 0.75 + 0.25 * Math.sin(time * 0.004);
        ctx.shadowColor = "rgba(90,140,255,1)";
        ctx.shadowBlur = 16;
        ctx.fillStyle = `rgba(130,170,255,${pulse})`;
        ctx.beginPath();
        ctx.arc(91, -40, 4.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });
  }

  // ── temple disc (pops toward the viewer) ──
  layer(1.4, () => {
    const ex = -60 * t;
    const sc = 1 + 0.28 * t;
    ctx.translate(-58 + ex, -2 - 8 * t);
    ctx.scale(sc, sc);
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 10 + 20 * t;
    const dg = ctx.createRadialGradient(-14, -14, 4, 0, 0, 40);
    dg.addColorStop(0, "#eef1f4");
    dg.addColorStop(0.55, "#8a939c");
    dg.addColorStop(1, "#22272d");
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(0, 0, 38, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0d1015";
    ctx.beginPath();
    ctx.arc(0, 0, 30, 0, Math.PI * 2);
    ctx.fill();
    gear(ctx, 0, 0, 27, 18, -time * 0.0012 * (1 + 2 * t), true);
    ctx.fillStyle = "#0d1015";
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "rgba(90,140,255,1)";
    ctx.shadowBlur = 12;
    ctx.fillStyle = "#7fa6ff";
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(170,195,255,0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, 38, -2.4, -0.6);
    ctx.stroke();
  });
}

function q2dInterp(p, input, output) {
  if (p <= input[0]) return output[0];
  for (var i = 1; i < input.length; i++) {
    if (p <= input[i]) { var f = (p - input[i - 1]) / (input[i] - input[i - 1]); return output[i - 1] + (output[i] - output[i - 1]) * f; }
  }
  return output[output.length - 1];
}

window.Q2DRobot = { drawRobot: drawRobot, explodeAt: explodeAt, driftAt: driftAt, interp: q2dInterp };
})();
