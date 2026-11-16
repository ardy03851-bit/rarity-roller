/* ============================================================
   RarityFX — rarity effects engine (v1.2)
   ------------------------------------------------------------
   Public API (window.RarityFX):
     Particles (canvas)
       .burst(x, y, opts) / .ringBurst(x, y, opts) / .clear()
     Screen effects
       .flash(color, duration, strength)
     Morphing shape icons
       .iconSVG(shape, size)     static path-based SVG
       .stageIcon(rarity)        <svg> element that morphs between
                                 shapes and colors via .morphTo(rarity)
     DOM builders
       .vars(el, rarity) / .textSpan(rarity, text)
       .tick(rarity) / .landed(rarity)      stage ticker elements
       .buildCard(rarity, opts)             inventory card (shape + hover)
       .attachHover(card, rarity)           enables the hover/press effect
       .center(el)
     Tab transition
       .voxelTransition(fromView, toView)  3D pixel disintegration
     Orchestration
       .playReveal(rarity, el, opts)
       .register(name, fn) / .run(name, ctx)
     Sound (procedural WebAudio, quiet)
       .sound.tick() / .reveal(tier) / .transition() / .toggle()
   ============================================================ */
(() => {
  'use strict';

  const FX = {};
  const $ = (s, c = document) => c.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const TAU = Math.PI * 2;

  /* ==========================================================
     PARTICLE SYSTEM (canvas)
     ========================================================== */
  const canvas = $('#fx-canvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let running = false;
  const MAX_PARTICLES = 400;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(innerWidth * dpr);
    canvas.height = Math.floor(innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);

  function spawn(p) {
    if (particles.length < MAX_PARTICLES) particles.push(p);
  }

  const makers = {
    spark(o) {
      return {
        type: 'spark', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed,
        g: o.gravity ?? 220, drag: 0.985, size: o.size ?? rand(1, 2.2),
        life: o.life ?? rand(0.4, 0.8), age: 0, color: o.color, blend: 'lighter',
      };
    },
    orb(o) {
      return {
        type: 'orb', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed * 0.6, vy: Math.sin(o.a) * o.speed * 0.6,
        g: o.gravity ?? -30, drag: 0.97, size: o.size ?? rand(3, 8),
        life: o.life ?? rand(0.8, 1.4), age: 0, color: o.color, blend: 'lighter',
      };
    },
    ring(o) {
      return {
        type: 'ring', x: o.x, y: o.y, vx: 0, vy: 0, g: 0, drag: 1,
        size: o.size ?? 8, grow: o.grow ?? 380,
        life: o.life ?? 0.8, age: 0, color: o.color, blend: 'lighter',
      };
    },
    star(o) {
      return {
        type: 'star', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed,
        g: o.gravity ?? 140, drag: 0.99, size: o.size ?? rand(4, 9),
        life: o.life ?? rand(0.8, 1.4), age: 0, color: o.color, blend: 'lighter',
        rot: rand(0, TAU), vr: rand(-3, 3),
      };
    },
  };

  function drawStar(c, x, y, r, rot) {
    c.beginPath();
    for (let i = 0; i < 4; i++) {
      const a = rot + (i * TAU) / 4;
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    c.stroke();
  }

  function step(dt) {
    const w = innerWidth, h = innerHeight;
    ctx.clearRect(0, 0, w, h);
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age += dt;
      if (p.age >= p.life) { particles.splice(i, 1); continue; }
      p.vy += (p.g || 0) * dt;
      p.vx *= p.drag; p.vy *= p.drag;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.vr !== undefined) p.rot += p.vr * dt;
      const t = 1 - p.age / p.life;
      ctx.globalCompositeOperation = p.blend;
      ctx.globalAlpha = Math.min(1, t * 1.5);
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      ctx.lineWidth = 1;

      switch (p.type) {
        case 'spark':
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035);
          ctx.stroke();
          break;
        case 'orb': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, p.color);
          g.addColorStop(1, 'transparent');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case 'star':
          ctx.lineWidth = 1.4;
          drawStar(ctx, p.x, p.y, p.size * t, p.rot);
          break;
        case 'ring':
          ctx.lineWidth = 1.5 * t + 0.4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + p.grow * p.age, 0, TAU);
          ctx.stroke();
          break;
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }

  let last = 0;
  function loop(ts) {
    if (!particles.length) { running = false; ctx.clearRect(0, 0, innerWidth, innerHeight); return; }
    const dt = Math.min((ts - last) / 1000 || 0.016, 0.05);
    last = ts;
    step(dt);
    requestAnimationFrame(loop);
  }
  function kick() {
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(loop); }
  }

  FX.burst = (x, y, opts = {}) => {
    const maker = makers[opts.type ?? 'spark'];
    if (!maker) return;
    const colors = opts.colors || ['#7dd3fc'];
    const count = opts.count ?? 12;
    for (let i = 0; i < count; i++) {
      const a = opts.angle !== undefined
        ? opts.angle + rand(-(opts.spread ?? 0.5), opts.spread ?? 0.5)
        : rand(0, TAU);
      spawn(maker({
        x, y, a,
        speed: rand(opts.speedMin ?? 90, opts.speedMax ?? 280),
        color: pick(colors),
        ...opts.particle,
      }));
    }
    kick();
  };

  FX.ringBurst = (x, y, opts = {}) => {
    const colors = opts.colors || ['#7dd3fc'];
    for (let i = 0; i < (opts.count ?? 1); i++) {
      setTimeout(() => {
        spawn(makers.ring({ x, y, color: pick(colors), grow: opts.grow ?? 380, life: opts.life ?? 0.8 }));
        kick();
      }, i * (opts.stagger ?? 140));
    }
  };

  FX.clear = () => { particles = []; };

  /* ==========================================================
     SOUND — quiet, warm, procedural.
     ========================================================== */
  const sound = (() => {
    let ac = null;
    let master = null;
    let muted = false;

    function ensure() {
      if (ac) return true;
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        master = ac.createGain();
        master.gain.value = 0.5;
        master.connect(ac.destination);
      } catch { return false; }
      return true;
    }

    function unlock() {
      if (!ensure()) return;
      if (ac.state === 'suspended') ac.resume();
    }

    function tone(freq, { type = 'sine', dur = 0.2, vol = 0.05, delay = 0, attack = 0.008 } = {}) {
      if (muted || !ensure()) return;
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }

    function noise({ dur = 0.5, vol = 0.05, from = 120, to = 900, delay = 0, attack = 0.1 } = {}) {
      if (muted || !ensure()) return;
      const t0 = ac.currentTime + delay;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(from, t0);
      lp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(lp).connect(g).connect(master);
      src.start(t0);
      src.stop(t0 + dur);
    }

    const CHORD = [220, 277.18, 329.63, 440, 554.37, 659.25];

    return {
      unlock,
      get muted() { return muted; },
      toggle() { muted = !muted; return muted; },
      tick() {
        tone(rand(950, 1150), { type: 'sine', dur: 0.045, vol: 0.028, attack: 0.002 });
      },
      reveal(tier = 1) {
        const notes = Math.min(CHORD.length, 1 + Math.ceil(tier / 1.6));
        for (let i = 0; i < notes; i++) {
          tone(CHORD[i], { type: 'sine', dur: 1.1 + i * 0.1, vol: 0.05, delay: i * 0.07, attack: 0.04 });
        }
        if (tier >= 7) tone(110, { type: 'sine', dur: 1.6, vol: 0.05, attack: 0.06 });
        if (tier >= 9) {
          for (let i = 0; i < 3; i++) tone(CHORD[5] * 2, { type: 'sine', dur: 0.8, vol: 0.02, delay: 0.9 + i * 0.18, attack: 0.03 });
        }
      },
      /* the voxel transition: a deep, slow exhale */
      transition() {
        noise({ dur: 1.7, vol: 0.07, from: 90, to: 700, attack: 0.35 });
        tone(55, { type: 'sine', dur: 1.5, vol: 0.05, attack: 0.3 });
        tone(110, { type: 'sine', dur: 1.2, vol: 0.03, delay: 0.25, attack: 0.2 });
      },
    };
  })();
  FX.sound = sound;

  /* ==========================================================
     SCREEN EFFECTS
     ========================================================== */
  FX.flash = (color = 'rgba(255,255,255,1)', duration = 400, strength = 0.14) => {
    const layer = $('#flash-layer');
    layer.style.background = color;
    layer.style.transition = 'none';
    layer.style.opacity = String(strength);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layer.style.transition = `opacity ${duration}ms ease-out`;
      layer.style.opacity = '0';
    }));
  };

  FX.center = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  /* ==========================================================
     MORPHING SHAPE ICONS
     Every shape is a polygon; every polygon is resampled to the
     same number of points, so any shape can smoothly morph into
     any other. The stage icon uses this; static cards embed the
     same geometry as an SVG path.
     ========================================================== */
  const K = 24; // points per shape

  function ngon(n, r, cx = 12, cy = 12) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (i * TAU) / n;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return pts;
  }

  function starVerts(points, r1, r2, cx = 12, cy = 12) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + (i * TAU) / (points * 2);
      const rr = i % 2 ? r2 : r1;
      pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
    }
    return pts;
  }

  const SHAPE_VERTS = {
    circle: () => ngon(16, 9),
    square: () => [[4, 4], [20, 4], [20, 20], [4, 20]],
    triangle: () => [[12, 2.5], [21.5, 20], [2.5, 20]],
    diamond: () => [[12, 2], [22, 12], [12, 22], [2, 12]],
    pentagon: () => ngon(5, 9.6),
    hexagon: () => ngon(6, 9.6),
    octagon: () => ngon(8, 9.6),
    star4: () => starVerts(4, 10, 3.2),
    star5: () => starVerts(5, 10, 4.5),
    star6: () => starVerts(6, 10, 5.2),
    star8: () => starVerts(8, 10, 6.4),
    burst: () => starVerts(12, 10, 6.8),
    cross: () => [[8, 3], [16, 3], [16, 8], [21, 8], [21, 16], [16, 16], [16, 21], [8, 21], [8, 16], [3, 16], [3, 8], [8, 8]],
    shield: () => [[4, 4.5], [20, 4.5], [20, 12.5], [12, 21.5], [4, 12.5]],
    chevron: () => [[3.5, 7], [12, 3], [20.5, 7], [20.5, 12.5], [12, 8.5], [3.5, 12.5]],
    crescent: () => [
      [15.5, 3.5], [19.5, 8], [20.5, 12.5], [18.5, 17.5], [14, 21], [10, 21.5],
      [14, 17.5], [16.5, 12.5], [15.5, 8], [12.5, 4.5],
    ],
    droplet: () => [[12, 1.5], [16.5, 7.5], [19.5, 12.5], [19, 16.5], [15.5, 20.5], [12, 22], [8.5, 20.5], [5, 16.5], [4.5, 12.5], [7.5, 7.5]],
  };

  /* resample polygon perimeter to exactly K evenly spaced points */
  function sampleShape(name) {
    const verts = (SHAPE_VERTS[name] || SHAPE_VERTS.circle)();
    const pts = [];
    // closed perimeter segments
    const segs = [];
    let total = 0;
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      segs.push({ a, b, len });
      total += len;
    }
    let seg = 0;
    let segPos = 0;
    for (let i = 0; i < K; i++) {
      const dist = (i / K) * total;
      while (segPos + segs[seg].len < dist && seg < segs.length - 1) {
        segPos += segs[seg].len;
        seg++;
      }
      const { a, b, len } = segs[seg];
      const t = len > 0 ? (dist - segPos) / len : 0;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    return pts;
  }

  const SHAPE_CACHE = {};
  function shapePoints(name) {
    if (!SHAPE_CACHE[name]) SHAPE_CACHE[name] = sampleShape(name);
    return SHAPE_CACHE[name];
  }

  function pathFromPoints(pts) {
    return 'M' + pts.map((p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join('L') + 'Z';
  }

  FX.iconSVG = (shape, size = 32) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="rc-icon"><path d="${pathFromPoints(shapePoints(shape))}" fill="currentColor"/></svg>`;

  FX.SHAPES = Object.keys(SHAPE_VERTS);

  /* --- morphing stage icon element --- */
  function hexToRgb(hex) {
    const m = hex.replace('#', '');
    const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }

  FX.stageIcon = (initialRarity) => {
    const wrap = document.createElement('span');
    wrap.className = 'stage-icon-morph';
    wrap.innerHTML = `<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true"><path fill="currentColor"/></svg>`;
    const svg = wrap.firstElementChild;
    const path = svg.firstElementChild;

    let curPts = shapePoints(initialRarity.icon).map((p) => [...p]);
    let curColor = hexToRgb(initialRarity.colors[1] || initialRarity.colors[0]);
    let anim = null;

    function render() {
      path.setAttribute('d', pathFromPoints(curPts));
      const [r, g, b] = curColor.map((v) => Math.round(v));
      svg.style.color = `rgb(${r},${g},${b})`;
      wrap.style.setProperty('--stage-c', `rgb(${r},${g},${b})`);
    }
    render();

    wrap.morphTo = (rarity, duration = 110) => {
      const fromPts = curPts.map((p) => [...p]);
      const toPts = shapePoints(rarity.icon);
      const fromColor = [...curColor];
      const toColor = hexToRgb(rarity.colors[1] || rarity.colors[0]);
      const t0 = performance.now();
      if (anim) cancelAnimationFrame(anim);
      const frame = (t) => {
        const k = Math.min(1, (t - t0) / duration);
        const e = 1 - Math.pow(1 - k, 3); // easeOutCubic
        for (let i = 0; i < K; i++) {
          curPts[i][0] = fromPts[i][0] + (toPts[i][0] - fromPts[i][0]) * e;
          curPts[i][1] = fromPts[i][1] + (toPts[i][1] - fromPts[i][1]) * e;
        }
        for (let c = 0; c < 3; c++) {
          curColor[c] = fromColor[c] + (toColor[c] - fromColor[c]) * e;
        }
        render();
        if (k < 1) anim = requestAnimationFrame(frame);
        else anim = null;
      };
      anim = requestAnimationFrame(frame);
    };

    return wrap;
  };

  /* ==========================================================
     DOM BUILDERS
     ========================================================== */
  /* hex/#rrggbb or rgb() string -> "r,g,b" for use with rgba(var(--x), a) */
  const toRGB = (c) => {
    if (!c) return '255,255,255';
    let m = /^#([0-9a-f]{6})$/i.exec(c);
    if (m) {
      const n = parseInt(m[1], 16);
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
    }
    m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(c);
    if (m) {
      return m.slice(1).map(h => parseInt(h + h, 16)).join(',');
    }
    m = /rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(c);
    if (m) return `${m[1]},${m[2]},${m[3]}`;
    return '255,255,255';
  };

  FX.vars = (el, rarity) => {
    const s = el.style;
    s.setProperty('--r1', rarity.colors[0]);
    s.setProperty('--r2', rarity.colors[1] || rarity.colors[0]);
    s.setProperty('--r3', rarity.colors[2] || rarity.colors[1] || rarity.colors[0]);
    s.setProperty('--r1-rgb', toRGB(rarity.colors[0]));
    s.setProperty('--r2-rgb', toRGB(rarity.colors[1] || rarity.colors[0]));
    s.setProperty('--r3-rgb', toRGB(rarity.colors[2] || rarity.colors[1] || rarity.colors[0]));
    s.setProperty('--rglow', rarity.glow);
    s.setProperty('--fx-font', rarity.font ? `"${rarity.font}", var(--font-body)` : 'var(--font-body)');
    if (rarity.speed) s.setProperty('--fx-speed', rarity.speed);
    s.setProperty('--fx-glow', String(0.25 + rarity.tier * 0.14));
    s.setProperty('--stage-c', rarity.colors[1] || rarity.colors[0]);
  };

  FX.textSpan = (rarity, text, { size } = {}) => {
    const span = document.createElement('span');
    span.className = 'rar-text';
    span.textContent = text;
    if (size) span.style.fontSize = size;
    FX.vars(span, rarity);
    return span;
  };

  FX.tick = (rarity, label) => {
    const el = document.createElement('span');
    el.className = 'tick';
    el.textContent = label ?? rarity.name;
    FX.vars(el, rarity);
    return el;
  };

  FX.landed = (rarity) => {
    const el = FX.tick(rarity);
    el.classList.add('landed');
    return el;
  };

  /* --- inventory card --- */
  FX.buildCard = (rarity, { count, discovered = true, isNew = false } = {}) => {
    const odds = `1 in ${Math.round((typeof TOTAL_WEIGHT !== 'undefined' ? TOTAL_WEIGHT : 100000) / rarity.weight).toLocaleString()}`;
    const card = document.createElement('article');
    card.className = `inv-card shape-${rarity.shape} hover-${rarity.hover} t${rarity.tier}` +
      (discovered ? '' : ' undiscovered');
    FX.vars(card, rarity);

    const nameEl = document.createElement('h3');
    nameEl.className = 'inv-name';
    if (discovered) {
      nameEl.appendChild(FX.textSpan(rarity, rarity.name));
    } else {
      nameEl.textContent = rarity.name;
    }

    card.innerHTML = `
      ${FX.iconSVG(rarity.icon, 22)}
      <span class="inv-art"></span>
      <span class="fx-sheen"></span>
      <span class="fx-scan"></span>
      <span class="fx-twinkle"><i></i><i></i><i></i></span>
      <span class="fx-dust"><i></i><i></i><i></i><i></i></span>
      ${isNew && discovered ? '<span class="inv-new">New</span>' : ''}
      <div class="inv-body"></div>
      <div class="inv-foot">
        <span class="inv-odds">${discovered ? odds : ''}</span>
        <span class="inv-count">${discovered ? count : '—'}</span>
      </div>
    `;
    card.querySelector('.inv-body').appendChild(nameEl);

    // image layer (optional)
    if (rarity.images && rarity.images.art) {
      card.querySelector('.inv-art').style.backgroundImage = `url(${rarity.images.art})`;
    }

    FX.attachHover(card, rarity);
    return card;
  };

  /* subtle per-rarity hover/press effect — works for mouse and finger */
  FX.attachHover = (card, rarity) => {
    const on = () => card.classList.add('fx-on');
    const off = () => card.classList.remove('fx-on');
    card.addEventListener('pointerenter', on);
    card.addEventListener('pointerleave', off);
    card.addEventListener('pointerdown', on);
    card.addEventListener('pointerup', off);
    card.addEventListener('pointercancel', off);
  };

  /* ==========================================================
     VOXEL TAB TRANSITION
     The current view is snapshot, broken into a grid of 3D
     pixels, each one lifts off the screen, tumbles through
     space and re-settles as a pixel of the next view.
     ========================================================== */
  const Voxel = (() => {
    let libPromise = null;
    const COLS = 56;

    function loadLib() {
      if (libPromise) return libPromise;
      libPromise = new Promise((resolve) => {
        if (window.html2canvas) return resolve(window.html2canvas);
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js';
        s.onload = () => resolve(window.html2canvas || null);
        s.onerror = () => resolve(null);
        document.head.appendChild(s);
      });
      return libPromise;
    }

    async function capture(el) {
      const lib = await loadLib();
      if (!lib) return null;
      try {
        return await lib(el, { backgroundColor: '#0b0b0d', logging: false, scale: 1, useCORS: true });
      } catch { return null; }
    }

    function gridFrom(snap, cols, rows) {
      const tiny = document.createElement('canvas');
      tiny.width = cols;
      tiny.height = rows;
      const tctx = tiny.getContext('2d', { willReadFrequently: true });
      tctx.drawImage(snap, 0, 0, cols, rows);
      const data = tctx.getImageData(0, 0, cols, rows).data;
      const cells = [];
      for (let i = 0; i < cols * rows; i++) {
        cells.push({
          r: data[i * 4],
          g: data[i * 4 + 1],
          b: data[i * 4 + 2],
          a: data[i * 4 + 3] / 255,
        });
      }
      return cells;
    }

    const easeInOut = (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    async function animate(voxCanvas, snapA, snapB, rect, onDone) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      voxCanvas.width = Math.floor(rect.width * dpr);
      voxCanvas.height = Math.floor(rect.height * dpr);
      voxCanvas.style.left = `${rect.left}px`;
      voxCanvas.style.top = `${rect.top}px`;
      voxCanvas.style.width = `${rect.width}px`;
      voxCanvas.style.height = `${rect.height}px`;
      const vctx = voxCanvas.getContext('2d');
      vctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cols = COLS;
      const rows = Math.max(8, Math.round(cols * rect.height / rect.width));
      const cw = rect.width / cols;
      const ch = rect.height / rows;

      const gA = gridFrom(snapA, cols, rows);
      const gB = gridFrom(snapB, cols, rows);

      /* build voxel list — skip cells that are background in BOTH views */
      const voxels = [];
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const a = gA[i], b = gB[i];
          if (a.a < 0.05 && b.a < 0.05) continue;
          const dx = x / cols - 0.5;
          const dy = y / rows - 0.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          voxels.push({
            ax: x * cw + cw / 2, ay: y * ch + ch / 2,
            bx: x * cw + cw / 2, by: y * ch + ch / 2,
            ca: a, cb: b,
            delay: dist * 620 * rand(0.7, 1.3) + rand(0, 90),
            flight: rand(650, 950),
            zAmp: rand(50, 210),
            ox: rand(-42, 42),
            oy: rand(-30, 30),
            rot: rand(-1, 1) * Math.PI * rand(0.6, 1.5),
          });
        }
      }

      const DURATION = 1950;
      const t0 = performance.now();

      function frame(t) {
        const el = t - t0;
        vctx.clearRect(0, 0, rect.width, rect.height);

        if (el >= DURATION) {
          // final frame: the new screen, pixel-perfect
          vctx.drawImage(snapB, 0, 0, rect.width, rect.height);
          onDone();
          return;
        }

        for (const v of voxels) {
          const local = (el - v.delay) / v.flight;
          if (local <= 0) {
            // not yet lifted: show as part of the old screen
            vctx.fillStyle = `rgb(${v.ca.r},${v.ca.g},${v.ca.b})`;
            vctx.globalAlpha = v.ca.a;
            vctx.fillRect(v.ax - cw / 2, v.ay - ch / 2, cw + 0.5, ch + 0.5);
            continue;
          }
          const p = easeInOut(Math.min(1, local));
          const arc = Math.sin(p * Math.PI);
          const x = v.ax + (v.bx - v.ax) * p + arc * v.ox;
          const y = v.ay + (v.by - v.ay) * p + arc * v.oy;
          const z = arc * v.zAmp;
          const scale = 1 + z / 460;
          const size = Math.max(cw, ch) * scale * 1.06;

          const cA = v.ca, cB = v.cb;
          const r = Math.round(cA.r + (cB.r - cA.r) * p);
          const g = Math.round(cA.g + (cB.g - cA.g) * p);
          const b = Math.round(cA.b + (cB.b - cA.b) * p);
          const alpha = (cA.a + (cB.a - cA.a) * p) * (0.55 + 0.45 * scale);

          vctx.save();
          vctx.translate(x, y);
          vctx.rotate(v.rot * arc);
          vctx.globalAlpha = alpha;
          vctx.fillStyle = `rgb(${r},${g},${b})`;
          vctx.fillRect(-size / 2, -size / 2, size, size);
          vctx.restore();
        }
        vctx.globalAlpha = 1;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }

    return { capture, animate };
  })();

  FX.voxelTransition = async (fromView, toView) => {
    const app = $('#app');
    const rect = app.getBoundingClientRect();

    const snapA = await Voxel.capture(app);
    if (!snapA) return false;

    // freeze the old screen over the app while we prepare the new one
    const voxCanvas = document.createElement('canvas');
    voxCanvas.className = 'voxel-layer';
    voxCanvas.style.left = `${rect.left}px`;
    voxCanvas.style.top = `${rect.top}px`;
    voxCanvas.style.width = `${rect.width}px`;
    voxCanvas.style.height = `${rect.height}px`;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    voxCanvas.width = Math.floor(rect.width * dpr);
    voxCanvas.height = Math.floor(rect.height * dpr);
    const vc = voxCanvas.getContext('2d');
    vc.setTransform(dpr, 0, 0, dpr, 0, 0);
    vc.drawImage(snapA, 0, 0, rect.width, rect.height);
    document.body.appendChild(voxCanvas);

    // swap the views beneath the frozen image
    fromView.classList.remove('active');
    toView.classList.add('active');

    // capture the new view
    const snapB = await Voxel.capture(app);
    if (!snapB) {
      voxCanvas.remove();
      return false;
    }

    FX.sound.transition();

    await new Promise((resolve) => {
      Voxel.animate(voxCanvas, snapA, snapB, rect, resolve);
    });

    // crossfade the voxel layer into the real DOM
    voxCanvas.style.transition = 'opacity 280ms ease-out';
    voxCanvas.style.opacity = '0';
    setTimeout(() => voxCanvas.remove(), 300);
    return true;
  };

  /* ==========================================================
     EFFECTS REGISTRY — extensible
     ========================================================== */
  const registry = {};
  FX.register = (name, fn) => { registry[name] = fn; };
  FX.run = (name, ctx) => registry[name] && registry[name](ctx);

  /* ==========================================================
     REVEAL — tier-scaled, restrained.
     ========================================================== */
  FX.playReveal = (rarity, el, { x, y } = {}) => {
    const p = x !== undefined ? { x, y } : FX.center(el);
    const t = rarity.tier;
    const colors = rarity.colors;

    sound.reveal(t);

    if (t <= 2) return; // name only

    if (t <= 4) {
      FX.flash(colors[1], 350, 0.07);
      return;
    }

    if (t <= 6) {
      FX.flash(colors[1], 400, 0.1);
      FX.burst(p.x, p.y, { type: 'spark', count: 10, colors, speedMin: 60, speedMax: 180 });
      return;
    }

    if (t <= 8) {
      FX.flash(colors[1], 450, 0.13);
      FX.burst(p.x, p.y, { type: 'spark', count: 16, colors, speedMin: 80, speedMax: 240 });
      FX.burst(p.x, p.y, { type: 'orb', count: 5, colors, speedMin: 30, speedMax: 90 });
      return;
    }

    /* top tier */
    FX.flash(colors[1], 550, 0.16);
    FX.burst(p.x, p.y, { type: 'spark', count: 26, colors, speedMin: 100, speedMax: 320 });
    FX.burst(p.x, p.y, { type: 'star', count: 8, colors, speedMin: 60, speedMax: 160 });
    FX.ringBurst(p.x, p.y, { colors, count: 2, stagger: 260, grow: 300, life: 0.9 });
  };

  window.RarityFX = FX;
})();
