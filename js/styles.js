/* ============================================================
   BUTTON STYLES — config, unlocks and the 3D pedestal shop.
   Each style: a palette (pedestal pixels), an accent (roll
   button ring/border), and an unlock condition checked against
   the save. Adding a style = adding one block here.
   ============================================================ */

const RR_STYLES = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'The original ring. Quiet, monochrome, always yours.',
    palette: ['#8f8f99', '#55555f', '#ececee'],
    accent: '#c9c9d4',
    btn: 'circle',
    unlock: () => true,
    progress: () => null,
  },
  {
    id: 'ember',
    name: 'Ember',
    desc: 'A warm ring for rollers who kept going.',
    palette: ['#fb923c', '#f97316', '#fde68a'],
    accent: '#f97316',
    btn: 'circle-double',
    unlock: (s) => s.totalRolls >= 25,
    progress: (s) => ({ cur: Math.min(s.totalRolls, 25), goal: 25, label: 'rolls' }),
  },
  {
    id: 'verdant',
    name: 'Verdant',
    desc: 'For collectors: five different rarities found.',
    palette: ['#4ade80', '#16a34a', '#86efac'],
    accent: '#4ade80',
    btn: 'squircle',
    unlock: (s) => discoveredCount(s) >= 5,
    progress: (s) => ({ cur: Math.min(discoveredCount(s), 5), goal: 5, label: 'rarities found' }),
  },
  {
    id: 'azure',
    name: 'Azure',
    desc: 'One hundred rolls deep. The ring cools down.',
    palette: ['#60a5fa', '#2563eb', '#93c5fd'],
    accent: '#60a5fa',
    btn: 'circle',
    unlock: (s) => s.totalRolls >= 100,
    progress: (s) => ({ cur: Math.min(s.totalRolls, 100), goal: 100, label: 'rolls' }),
  },
  {
    id: 'prism',
    name: 'Prism',
    desc: 'Earned the moment a tier-5 rarity lands.',
    palette: ['#f0abfc', '#67e8f9', '#fde047'],
    accent: '#e879f9',
    btn: 'square',
    unlock: (s) => (s.bestTier || 0) >= 5,
    progress: (s) => ({ cur: Math.min(s.bestTier || 0, 5), goal: 5, label: 'best tier' }),
  },
  {
    id: 'void',
    name: 'Void',
    desc: 'Roll a tier-7 rarity and the pedestal turns inward.',
    palette: ['#c4b5fd', '#1e1b4b', '#8b5cf6'],
    accent: '#a78bfa',
    btn: 'circle-dashed',
    unlock: (s) => (s.bestTier || 0) >= 7,
    progress: (s) => ({ cur: Math.min(s.bestTier || 0, 7), goal: 7, label: 'best tier' }),
  },
  {
    id: 'aurum',
    name: 'Aurum',
    desc: 'Five hundred rolls. The gold standard.',
    palette: ['#fbbf24', '#f97316', '#fde68a'],
    accent: '#fbbf24',
    btn: 'circle-thick',
    unlock: (s) => s.totalRolls >= 500,
    progress: (s) => ({ cur: Math.min(s.totalRolls, 500), goal: 500, label: 'rolls' }),
  },
  {
    id: 'chroma',
    name: 'Chroma',
    desc: 'Twelve different rarities in one collection.',
    palette: ['#f0abfc', '#22d3ee', '#fde047'],
    accent: '#f0abfc',
    btn: 'circle-prism',
    unlock: (s) => discoveredCount(s) >= 12,
    progress: (s) => ({ cur: Math.min(discoveredCount(s), 12), goal: 12, label: 'rarities found' }),
  },
];

function discoveredCount(save) {
  return Object.values(save.counts || {}).filter((n) => n > 0).length;
}

/* ============================================================
   PEDESTAL RENDERER — a small canvas 3D "cube" with pixel
   texture. Pixels fade out toward the floor and their colors
   slowly drift through the style's palette. The 2D roll button
   sits on the front face, tilted with the cube.
   ============================================================ */
(() => {
  'use strict';

  const hexToRgb = (h) => {
    const m = /^#?([0-9a-f]{6})$/i.exec(h);
    const n = m ? parseInt(m[1], 16) : 0x888888;
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  /* color at palette phase p (0..palette.length cycles) */
  function paletteAt(pal, p) {
    const n = pal.length;
    const i = Math.floor(p) % n;
    const j = (i + 1) % n;
    const f = smooth(p - Math.floor(p));
    const a = pal[i], b = pal[j];
    return [
      Math.round(lerp(a[0], b[0], f)),
      Math.round(lerp(a[1], b[1], f)),
      Math.round(lerp(a[2], b[2], f)),
    ];
  }

  /**
   * draw one pedestal frame
   * ctx, size: css pixels (canvas is DPR-scaled by caller)
   * pal: [[r,g,b],...]  t: seconds  locked: grayscale + lock glyph
   */
  function drawPedestal(ctx, size, pal, t, locked, accent, shape = 'circle') {
    const W = size, H = size;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2 + 26;
    const accentRGB = hexToRgb(accent);

    /* floor glow */
    const glow = ctx.createRadialGradient(cx, cy + 46, 0, cx, cy + 46, 70);
    glow.addColorStop(0, `rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},${locked ? 0.05 : 0.12})`);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-0.12); /* the little tilt to the side */

    const FW = 56, FH = 42;      /* front face half-extents */
    const DX = 30, DY = -17;     /* depth offset (up-right) */
    const palN = pal.map(hexToRgb);
    if (locked) palN.forEach(c => { c[0] = c[1] = c[2] = Math.round((c[0] + c[1] + c[2]) / 3 * 0.6); });

    /* back-to-front: right face, top face, then the front face */
    drawFace(ctx,
      [ [FW, -FH], [FW + DX, -FH + DY], [FW + DX, FH + DY], [FW, FH] ],
      palN, t, 0.5, 4, 6, 2 * FH / 6, false, 'rgba(8,8,10,0.95)');

    drawFace(ctx,
      [ [-FW, -FH], [FW, -FH], [FW + DX, -FH + DY], [-FW + DX, -FH + DY] ],
      palN, t + 3, 0.55, 7, 3, Math.hypot(DX, DY) / 3, false, 'rgba(22,22,26,0.95)');

    drawFace(ctx,
      [ [-FW, -FH], [FW, -FH], [FW, FH], [-FW, FH] ],
      palN, t + 6, 1, 7, 6, 2 * FH / 6, /* fade */ true, 'rgba(14,14,17,0.97)');

    /* the 2D roll button standing on the front face */
    drawBtn(ctx, palN, t, locked, accentRGB, shape);

    ctx.restore();
  }

  const lerpP = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];

  /**
   * draw a quad face: solid body fill + a pixel grid mapped with
   * bilinear interpolation (so skewed faces stay geometrically true).
   * A,B,C,D run around the quad; A→B is the "columns" edge, A→D "rows".
   */
  function drawFace(ctx, [A, B, C, D], palN, t, mul, cols, rows, cellH, fade, fill) {
    /* solid body so the cube reads as one object */
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(C[0], C[1]);
    ctx.lineTo(D[0], D[1]);
    ctx.closePath();
    ctx.fill();

    const cellW = Math.hypot(B[0] - A[0], B[1] - A[1]) / cols;
    const pw = cellW * 0.72, ph = cellH * 0.72;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const v = (r + 0.5) / rows;
        const top = lerpP(A, B, u);
        const bot = lerpP(D, C, u);
        const x = lerp(top[0], bot[0], v);
        const y = lerp(top[1], bot[1], v);
        const col = paletteAt(palN, t * 0.12 + r * 0.45 + c * 0.18);
        let a = (0.1 + 0.26 * (1 - r / rows)) * mul;
        if (fade) a *= 0.3 + 0.7 * (1 - r / rows); /* vanish near the floor */
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
        ctx.fillRect(x - pw / 2, y - ph / 2, pw, ph);
      }
    }

    /* face edge, whisper-thin */
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(A[0], A[1]);
    ctx.lineTo(B[0], B[1]);
    ctx.lineTo(C[0], C[1]);
    ctx.lineTo(D[0], D[1]);
    ctx.closePath();
    ctx.stroke();
  }

  /* the button's silhouette per style: shape + ring treatment */
  function btnSilhouette(ctx, r, shape) {
    const rr = (rad) => {
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(-r, -r, r * 2, r * 2, rad);
      } else {
        ctx.beginPath();
        ctx.rect(-r, -r, r * 2, r * 2);
      }
    };
    switch (shape) {
      case 'squircle': rr(r * 0.42); break;
      case 'square':   rr(r * 0.22); break;
      default:         ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    }
  }

  function drawBtn(ctx, palN, t, locked, accentRGB, shape = 'circle') {
    const r = 27;
    const y = 8;
    const col = paletteAt(palN, t * 0.12 + 2);
    ctx.save();
    ctx.translate(0, y);
    /* soft halo */
    ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${locked ? 0.04 : 0.1})`;
    ctx.beginPath();
    ctx.arc(0, 0, r + 9, 0, Math.PI * 2);
    ctx.fill();
    /* disc */
    ctx.fillStyle = 'rgba(10,10,12,0.85)';
    btnSilhouette(ctx, r, shape);
    ctx.fill();
    /* ring(s) — treatment first, then the stroke */
    if (locked) {
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1.4;
    } else {
      ctx.strokeStyle = `rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},0.75)`;
      ctx.lineWidth = shape === 'circle-thick' ? 3 : 1.4;
      if (shape === 'circle-dashed') ctx.setLineDash([4, 3]);
      if (shape === 'circle-prism') {
        const pr = paletteAt(palN, t * 0.25);
        ctx.strokeStyle = `rgba(${pr[0]},${pr[1]},${pr[2]},0.85)`;
      }
    }
    ctx.stroke();
    if (!locked && shape === 'circle-double') {
      ctx.strokeStyle = `rgba(${accentRGB[0]},${accentRGB[1]},${accentRGB[2]},0.3)`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    /* label or lock glyph */
    ctx.strokeStyle = locked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1.4;
    ctx.lineCap = 'round';
    if (locked) {
      ctx.beginPath(); /* shackle */
      ctx.arc(0, -3, 5, Math.PI, 0);
      ctx.stroke();
      ctx.fillRect(-7, -2, 14, 10);
    } else {
      ctx.font = '600 8px Sora, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.letterSpacing = '2px';
      ctx.fillText('ROLL', 1, 1);
    }
    ctx.setLineDash([]);
    ctx.restore();
  }

  window.RRPedestal = { drawPedestal, hexToRgb };
})();
