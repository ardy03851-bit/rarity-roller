/* ============================================================
   RarityFX — rarity effects engine (v2: restrained, editorial)
   ------------------------------------------------------------
   Public API (window.RarityFX):
     Particles (canvas)
       .burst(x, y, opts)        radial burst (types: spark, orb,
                                 star, confetti, ember, ring, ray, glyph)
       .clear()
     Screen effects
       .flash(color, duration, strength)
     DOM builders
       .vars(el, rarity)          apply rarity CSS variables
       .textSpan(rarity, text)    animated gradient text span
       .tick(rarity, label)       one stage-name tick (spinner step)
       .landed(rarity)            the final landed name element
       .buildRow(rarity, opts)    inventory row
       .iconSVG(shape, size)     basic-shape SVG icon
       .center(el)
     Orchestration
       .playReveal(rarity, el)    tier-scaled, restrained reveal
       .register(name, fn) / .run(name, ctx)
     Sound (procedural WebAudio, quiet)
       .sound.tick() / .reveal(tier) / .toggle() / .muted / .unlock()
   ============================================================ */
(() => {
  'use strict';

  const FX = {};
  const $ = (s, c = document) => c.querySelector(s);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];
  const TAU = Math.PI * 2;
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    if (!maker || REDUCED) return;
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
    if (REDUCED) return;
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
     SOUND — quiet, warm, procedural. No arcade fanfares.
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

    /* warm, slow-attack pad notes */
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
    };
  })();
  FX.sound = sound;

  /* ==========================================================
     SCREEN EFFECTS
     ========================================================== */
  FX.flash = (color = 'rgba(255,255,255,1)', duration = 400, strength = 0.14) => {
    if (REDUCED) return;
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
     BASIC-SHAPE SVG ICONS (pure geometry)
     ========================================================== */
  function poly(n, cx, cy, r, rot = -Math.PI / 2) {
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i * TAU) / n;
      pts.push(`${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  function starPoly(points, cx, cy, r, inner = 0.42) {
    const pts = [];
    for (let i = 0; i < points * 2; i++) {
      const a = -Math.PI / 2 + (i * TAU) / (points * 2);
      const rr = i % 2 ? r * inner : r;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
    }
    return pts.join(' ');
  }

  const SHAPES = {
    circle: () => `<circle cx="12" cy="12" r="8.5" fill="currentColor"/>`,
    square: () => `<rect x="4.5" y="4.5" width="15" height="15" rx="2.5" fill="currentColor"/>`,
    triangle: () => `<polygon points="${poly(3, 12, 12.8, 8.5)}" fill="currentColor"/>`,
    diamond: () => `<polygon points="${poly(4, 12, 12, 8.8)}" fill="currentColor"/>`,
    pentagon: () => `<polygon points="${poly(5, 12, 12.4, 8.6)}" fill="currentColor"/>`,
    hexagon: () => `<polygon points="${poly(6, 12, 12, 8.8)}" fill="currentColor"/>`,
    star4: () => `<polygon points="${starPoly(4, 12, 12, 9.5, 0.32)}" fill="currentColor"/>`,
    star5: () => `<polygon points="${starPoly(5, 12, 12.4, 9, 0.45)}" fill="currentColor"/>`,
    star6: () => `<polygon points="${starPoly(6, 12, 12, 9.2, 0.5)}" fill="currentColor"/>`,
    star8: () => `<polygon points="${starPoly(8, 12, 12, 9.4, 0.62)}" fill="currentColor"/>`,
    ring: () => `<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="3"/>`,
    burst: () => `<polygon points="${starPoly(12, 12, 12, 9.6, 0.66)}" fill="currentColor"/>`,
  };

  FX.iconSVG = (shape, size = 32) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true" class="rc-icon">${
      (SHAPES[shape] || SHAPES.circle)(size)
    }</svg>`;

  /* ==========================================================
     DOM BUILDERS
     ========================================================== */
  FX.vars = (el, rarity) => {
    const s = el.style;
    s.setProperty('--r1', rarity.colors[0]);
    s.setProperty('--r2', rarity.colors[1] || rarity.colors[0]);
    s.setProperty('--r3', rarity.colors[2] || rarity.colors[1] || rarity.colors[0]);
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

  /* one spinner tick: a fresh name element (so the tick-in
     animation replays) carrying the rarity's gradient + font */
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

  /* inventory row */
  FX.buildRow = (rarity, { count, discovered = true, isNew = false } = {}) => {
    const li = document.createElement('li');
    li.className = `inv-row t${rarity.tier}` + (discovered ? '' : ' undiscovered');
    FX.vars(li, rarity);

    const name = document.createElement('span');
    name.className = 'inv-name';
    if (discovered) {
      const t = FX.textSpan(rarity, rarity.name);
      t.classList.add('rar-text');
      name.appendChild(t);
    } else {
      name.textContent = rarity.name;
    }

    li.innerHTML = `${FX.iconSVG(rarity.icon, 16)}
      <span class="inv-main"></span>
      <span class="inv-odds">${discovered ? `1 in ${Math.round(TOTAL_WEIGHT / rarity.weight)}` : ''}</span>
      ${isNew && discovered ? '<span class="inv-new">New</span>' : ''}
      <span class="inv-count">${discovered ? count : '—'}</span>`;

    // name goes inside .inv-main (kept separate for layout)
    li.querySelector('.inv-main').appendChild(name);
    return li;
  };

  /* ==========================================================
     EFFECTS REGISTRY — extensible
     ========================================================== */
  const registry = {};
  FX.register = (name, fn) => { registry[name] = fn; };
  FX.run = (name, ctx) => registry[name] && registry[name](ctx);

  /* ==========================================================
     REVEAL — tier-scaled, restrained.
     Low tiers: the name animation is the effect.
     High tiers add a quiet flash and fine light streaks.
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

    /* divine */
    FX.flash(colors[1], 550, 0.16);
    FX.burst(p.x, p.y, { type: 'spark', count: 26, colors, speedMin: 100, speedMax: 320 });
    FX.burst(p.x, p.y, { type: 'star', count: 8, colors, speedMin: 60, speedMax: 160 });
    FX.ringBurst(p.x, p.y, { colors, count: 2, stagger: 260, grow: 300, life: 0.9 });
  };

  window.RarityFX = FX;
})();
