/* ============================================================
   RarityFX — feature-rich rarity effects engine
   ------------------------------------------------------------
   Public API (window.RarityFX):
     Particles
       .burst(x, y, opts)            radial burst of particles
       .fountain(x, y, opts)         continuous emitter (returns handle)
       .rain(opts)                   falling particles across the screen
       .ringBurst(x, y, opts)        expanding shockwave rings
       .rayBurst(x, y, opts)         canvas light rays
       .clear()                      remove all particles
     Particle types: spark, orb, star, confetti, ember, ring, ray, glyph
     Screen effects
       .shake(el, opts)              decaying screen shake
       .flash(color, duration)       full-screen flash
       .rays(color, x, y)            DOM conic ray burst
       .setAmbient(colors)           tint the page's ambient blobs
     DOM builders
       .vars(el, rarity)             apply rarity CSS variables
       .textSpan(rarity, text)       animated gradient text span
       .buildCard(rarity, opts)      full layered rarity card
       .buildReelItem(rarity)        slot reel chip
       .applyImages(el, rarity, slot) image support (card|page|text|art|icon)
       .iconSVG(shape, size)         basic-shape SVG icon
     Orchestration
       .playReveal(rarity, el, opts) tier-scaled reveal sequence
       .register(name, fn) / .run(name, ctx)   extensible effect registry
     Sound (procedural WebAudio, no assets)
       .sound.click() / .tick() / .whoosh() / .fanfare(tier) / .shimmer()
       .sound.toggle() / .sound.muted
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
  const MAX_PARTICLES = 700;

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

  /* particle factories per type */
  const makers = {
    spark(o) {
      return {
        type: 'spark', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed,
        g: o.gravity ?? 260, drag: 0.985, size: o.size ?? rand(1.5, 3.5),
        life: o.life ?? rand(0.4, 0.9), age: 0, color: o.color, blend: 'lighter',
      };
    },
    orb(o) {
      return {
        type: 'orb', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed * 0.7, vy: Math.sin(o.a) * o.speed * 0.7,
        g: o.gravity ?? -40, drag: 0.97, size: o.size ?? rand(4, 11),
        life: o.life ?? rand(0.8, 1.6), age: 0, color: o.color, blend: 'lighter',
      };
    },
    star(o) {
      return {
        type: 'star', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed,
        g: o.gravity ?? 160, drag: 0.99, size: o.size ?? rand(5, 12),
        life: o.life ?? rand(0.8, 1.5), age: 0, color: o.color, blend: 'lighter',
        rot: rand(0, TAU), vr: rand(-4, 4),
      };
    },
    confetti(o) {
      return {
        type: 'confetti', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed - rand(60, 200),
        g: o.gravity ?? 520, drag: 0.995, size: o.size ?? rand(4, 9),
        life: o.life ?? rand(1.2, 2.4), age: 0, color: o.color, blend: 'source-over',
        rot: rand(0, TAU), vr: rand(-9, 9), ar: rand(0.4, 1),
      };
    },
    ember(o) {
      return {
        type: 'ember', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed * 0.35, vy: Math.sin(o.a) * o.speed * 0.35,
        g: o.gravity ?? -90, drag: 0.985, size: o.size ?? rand(1.5, 3.5),
        life: o.life ?? rand(1, 2.2), age: 0, color: o.color, blend: 'lighter',
        flick: rand(0, TAU),
      };
    },
    ring(o) {
      return {
        type: 'ring', x: o.x, y: o.y,
        vx: 0, vy: 0, g: 0, drag: 1,
        size: o.size ?? 10, grow: o.grow ?? 420,
        life: o.life ?? 0.7, age: 0, color: o.color, blend: 'lighter',
      };
    },
    ray(o) {
      return {
        type: 'ray', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed, vy: Math.sin(o.a) * o.speed,
        g: 0, drag: 0.99, size: o.size ?? rand(40, 110),
        life: o.life ?? rand(0.5, 0.9), age: 0, color: o.color, blend: 'lighter',
        a: o.a,
      };
    },
    glyph(o) {
      return {
        type: 'glyph', x: o.x, y: o.y,
        vx: Math.cos(o.a) * o.speed * 0.6, vy: Math.sin(o.a) * o.speed * 0.6 - 60,
        g: o.gravity ?? -30, drag: 0.985, size: o.size ?? rand(12, 22),
        life: o.life ?? rand(0.9, 1.6), age: 0, color: o.color, blend: 'lighter',
        char: o.char || pick(['*', '+', 'x', 'o', '#']),
        rot: rand(-0.4, 0.4), vr: rand(-1.5, 1.5),
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
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.strokeStyle = p.color;
      ctx.fillStyle = p.color;
      ctx.lineWidth = 1.5;

      switch (p.type) {
        case 'spark':
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
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
          ctx.lineWidth = 2;
          drawStar(ctx, p.x, p.y, p.size * t, p.rot);
          break;
        case 'confetti':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.scale(1, Math.sin(p.age * 9 + p.rot) * 0.7 + 0.3);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
          break;
        case 'ember': {
          const flick = 0.6 + 0.4 * Math.sin(p.age * 22 + p.flick);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * flick, 0, TAU);
          ctx.fill();
          break;
        }
        case 'ring':
          ctx.lineWidth = 3 * t + 0.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size + p.grow * p.age, 0, TAU);
          ctx.stroke();
          break;
        case 'ray': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.a);
          ctx.lineWidth = 2.5 * t;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(p.size, 0);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'glyph':
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.font = `700 ${p.size}px ${p.font || 'Sora'}, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(p.char, 0, 0);
          ctx.restore();
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

  function emit(type, x, y, opts = {}) {
    const maker = makers[type];
    if (!maker || REDUCED) return;
    const count = opts.count ?? 24;
    const colors = opts.colors || ['#7dd3fc', '#c084fc'];
    for (let i = 0; i < count; i++) {
      const a = opts.angle !== undefined
        ? opts.angle + rand(-(opts.spread ?? 0.5), opts.spread ?? 0.5)
        : rand(0, TAU);
      spawn(maker({
        x, y, a,
        speed: rand(opts.speedMin ?? 120, opts.speedMax ?? 420),
        color: pick(colors),
        ...opts.particle,
      }));
    }
    kick();
  }

  FX.burst = (x, y, opts) => emit(opts.type ?? 'spark', x, y, opts);

  FX.fountain = (x, y, opts = {}) => {
    let on = true;
    const iv = setInterval(() => {
      if (!on || document.hidden) return;
      const w = opts.width ?? 30;
      emit(opts.type ?? 'ember', x + rand(-w, w), y, {
        ...opts,
        count: opts.rate ?? 3,
        angle: -Math.PI / 2,
        spread: 0.45,
      });
    }, opts.interval ?? 90);
    return { stop() { on = false; clearInterval(iv); } };
  };

  FX.rain = (opts = {}) => {
    let on = true;
    const iv = setInterval(() => {
      if (!on || document.hidden) return;
      emit(opts.type ?? 'confetti', rand(0, innerWidth), -20, {
        ...opts,
        count: opts.rate ?? 6,
        angle: Math.PI / 2,
        spread: 0.25,
      });
    }, opts.interval ?? 120);
    const to = setTimeout(() => { on = false; clearInterval(iv); }, opts.duration ?? 3000);
    return { stop() { on = false; clearInterval(iv); clearTimeout(to); } };
  };

  FX.ringBurst = (x, y, opts = {}) => {
    const colors = opts.colors || ['#7dd3fc'];
    const n = opts.count ?? 3;
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        spawn(makers.ring({ x, y, color: pick(colors), size: opts.size ?? 8, grow: opts.grow ?? 460, life: opts.life ?? 0.7 }));
        kick();
      }, i * (opts.stagger ?? 120));
    }
  };

  FX.rayBurst = (x, y, opts = {}) => {
    const colors = opts.colors || ['#7dd3fc', '#c084fc'];
    for (let i = 0; i < (opts.count ?? 14); i++) {
      spawn(makers.ray({ x, y, a: (i / (opts.count ?? 14)) * TAU, speed: rand(500, 900), color: pick(colors), size: rand(60, 140) }));
    }
    kick();
  };

  FX.clear = () => { particles = []; };

  /* ==========================================================
     SOUND — procedural WebAudio
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

    function tone(freq, { type = 'sine', dur = 0.15, vol = 0.2, delay = 0, slide = 0 } = {}) {
      if (muted || !ensure()) return;
      const t0 = ac.currentTime + delay;
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g).connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    }

    function noise({ dur = 0.4, vol = 0.2, from = 300, to = 2400, delay = 0 } = {}) {
      if (muted || !ensure()) return;
      const t0 = ac.currentTime + delay;
      const len = Math.floor(ac.sampleRate * dur);
      const buf = ac.createBuffer(1, len, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.1;
      bp.frequency.setValueAtTime(from, t0);
      bp.frequency.exponentialRampToValueAtTime(to, t0 + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(bp).connect(g).connect(master);
      src.start(t0);
      src.stop(t0 + dur);
    }

    const SCALE = [261.6, 329.6, 392.0, 523.3, 659.3, 784.0, 1046.5, 1318.5];

    return {
      unlock,
      get muted() { return muted; },
      toggle() { muted = !muted; return muted; },
      click() { tone(340, { type: 'square', dur: 0.06, vol: 0.12, slide: -160 }); },
      tick() { tone(rand(700, 900), { type: 'triangle', dur: 0.035, vol: 0.07 }); },
      whoosh() { noise({ dur: 0.5, vol: 0.16, from: 200, to: 2600 }); },
      shimmer() {
        for (let i = 0; i < 4; i++) tone(rand(1400, 2600), { type: 'sine', dur: 0.25, vol: 0.05, delay: i * 0.09 });
      },
      fanfare(tier = 1) {
        const notes = Math.min(SCALE.length, 1 + Math.ceil(tier * 0.8));
        for (let i = 0; i < notes; i++) {
          tone(SCALE[i], { type: i % 2 ? 'triangle' : 'sine', dur: 0.34, vol: 0.16, delay: i * 0.085 });
        }
        if (tier >= 5) {
          for (let i = 0; i < 3; i++) tone(SCALE[7], { type: 'sine', dur: 0.6, vol: 0.1, delay: 0.7 + i * 0.14 });
          noise({ dur: 0.8, vol: 0.08, from: 3000, to: 6000, delay: 0.15 });
        }
        if (tier >= 7) {
          noise({ dur: 1.2, vol: 0.12, from: 120, to: 90, delay: 0.1 });
          for (let i = 0; i < 5; i++) tone(SCALE[(i * 3) % 8] * 2, { type: 'triangle', dur: 0.5, vol: 0.08, delay: 1.0 + i * 0.12 });
        }
      },
    };
  })();
  FX.sound = sound;

  /* ==========================================================
     SCREEN EFFECTS
     ========================================================== */
  FX.shake = (el, { intensity = 10, duration = 500 } = {}) => {
    if (REDUCED) return;
    const t0 = performance.now();
    (function frame(t) {
      const k = 1 - (t - t0) / duration;
      if (k <= 0) { el.style.transform = ''; return; }
      const p = intensity * k * k;
      el.style.transform = `translate(${rand(-p, p)}px, ${rand(-p, p)}px)`;
      requestAnimationFrame(frame);
    })(t0);
  };

  FX.flash = (color = 'rgba(255,255,255,0.9)', duration = 300) => {
    const layer = $('#flash-layer');
    layer.style.background = color;
    layer.style.transition = 'none';
    layer.style.opacity = '0.55';
    requestAnimationFrame(() => requestAnimationFrame(() => {
      layer.style.transition = `opacity ${duration}ms ease-out`;
      layer.style.opacity = '0';
    }));
  };

  FX.rays = (color = '#7dd3fc', x = innerWidth / 2, y = innerHeight / 2) => {
    if (REDUCED) return;
    const el = document.createElement('div');
    el.className = 'fx-rays';
    el.style.setProperty('--rays-color', color);
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    $('#rays-layer').appendChild(el);
    setTimeout(() => el.remove(), 1000);
  };

  FX.setAmbient = (colors = []) => {
    const amb = $('#ambient');
    if (colors[0]) amb.style.setProperty('--amb1', colors[0]);
    if (colors[1]) amb.style.setProperty('--amb2', colors[1]);
    if (colors[2]) amb.style.setProperty('--amb3', colors[2] || colors[0]);
  };

  FX.center = (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  };

  /* ==========================================================
     BASIC-SHAPE SVG ICONS (no emojis — pure geometry)
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
    circle: (s) => `<circle cx="12" cy="12" r="8.5" fill="currentColor"/>`,
    square: (s) => `<rect x="4.5" y="4.5" width="15" height="15" rx="2.5" fill="currentColor"/>`,
    triangle: (s) => `<polygon points="${poly(3, 12, 12.8, 8.5)}" fill="currentColor"/>`,
    diamond: (s) => `<polygon points="${poly(4, 12, 12, 8.8)}" fill="currentColor"/>`,
    pentagon: (s) => `<polygon points="${poly(5, 12, 12.4, 8.6)}" fill="currentColor"/>`,
    hexagon: (s) => `<polygon points="${poly(6, 12, 12, 8.8)}" fill="currentColor"/>`,
    star4: (s) => `<polygon points="${starPoly(4, 12, 12, 9.5, 0.32)}" fill="currentColor"/>`,
    star5: (s) => `<polygon points="${starPoly(5, 12, 12.4, 9, 0.45)}" fill="currentColor"/>`,
    star6: (s) => `<polygon points="${starPoly(6, 12, 12, 9.2, 0.5)}" fill="currentColor"/>`,
    star8: (s) => `<polygon points="${starPoly(8, 12, 12, 9.4, 0.62)}" fill="currentColor"/>`,
    ring: (s) => `<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="3.4"/>`,
    burst: (s) => `<polygon points="${starPoly(12, 12, 12, 9.6, 0.66)}" fill="currentColor"/>`,
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
  };

  FX.textSpan = (rarity, text, { size } = {}) => {
    const span = document.createElement('span');
    span.className = 'rar-text';
    span.textContent = text;
    if (size) span.style.fontSize = size;
    FX.vars(span, rarity);
    return span;
  };

  /* Image support — a rarity may define images for any slot:
       rarity.images = {
         art:  'assets/patterns/stars.svg',  // texture inside the card
         card: 'url',                        // full card background
         page: 'url',                        // full-page ambient backdrop
         text: 'url',                        // fills the gradient TEXT
         icon: 'url',                        // replaces the shape icon
       } */
  FX.applyImages = (el, rarity, slot) => {
    const url = rarity.images && rarity.images[slot];
    if (!url) return false;
    if (slot === 'icon') {
      const holder = el.querySelector('.rc-icon-slot') || el;
      holder.innerHTML = `<img src="${url}" alt="" class="rc-icon" style="width:100%;height:100%;object-fit:contain">`;
    } else if (slot === 'text') {
      el.classList.add('rar-text-img');
      el.style.backgroundImage = `url(${url})`;
      el.style.backgroundSize = 'cover';
      el.style.webkitTextFillColor = 'transparent';
    } else if (slot === 'page') {
      document.getElementById('ambient').style.backgroundImage = `url(${url})`;
    } else {
      const layer = el.querySelector('.rc-art') || el;
      layer.style.backgroundImage = `url(${url})`;
      if (slot === 'card') layer.style.opacity = '0.5';
    }
    return true;
  };

  FX.buildCard = (rarity, { count, badge, sub, discovered = true, clickable = false } = {}) => {
    const card = document.createElement('article');
    card.className = `rar-card t${rarity.tier} inv-card`;
    if (!discovered) card.classList.add('undiscovered');
    card.dataset.rarity = rarity.id;
    FX.vars(card, rarity);

    card.innerHTML = `
      <span class="rc-beam" aria-hidden="true"></span>
      <span class="rc-bg" aria-hidden="true"></span>
      <span class="rc-art" aria-hidden="true"></span>
      <span class="rc-sheen" aria-hidden="true"></span>
      ${badge ? `<span class="rc-badge">NEW</span>` : ''}
      <div class="result-row">
        <span class="rc-icon-slot">${FX.iconSVG(rarity.icon, rarity.tier >= 7 ? 54 : 40)}</span>
        <div>
          <h3 class="rc-name rar-text">${discovered ? rarity.name : '???'}</h3>
          <p class="rc-meta">${sub || (count !== undefined ? `Owned: ${count}` : '')}</p>
        </div>
      </div>
    `;

    FX.applyImages(card, rarity, 'art');
    FX.applyImages(card, rarity, 'icon');
    if (clickable) card.setAttribute('role', 'button');
    return card;
  };

  FX.buildReelItem = (rarity) => {
    const item = document.createElement('div');
    item.className = 'reel-item';
    const chip = document.createElement('div');
    chip.className = 'ri-chip';
    FX.vars(chip, rarity);
    chip.innerHTML = `${FX.iconSVG(rarity.icon, 22)}<span>${rarity.name}</span>`;
    item.appendChild(chip);
    return item;
  };

  /* ==========================================================
     EFFECTS REGISTRY — extensible
     ========================================================== */
  const registry = {};
  FX.register = (name, fn) => { registry[name] = fn; };
  FX.run = (name, ctx) => registry[name] && registry[name](ctx);

  /* ==========================================================
     REVEAL ORCHESTRATION — scales with rarity tier
     ========================================================== */
  FX.playReveal = (rarity, cardEl, { silent = false } = {}) => {
    const { x, y } = FX.center(cardEl);
    const t = rarity.tier;
    const colors = rarity.colors;

    if (!silent) sound.fanfare(t);

    if (t <= 2) {
      FX.burst(x, y, { type: 'spark', count: 14, colors, speedMin: 80, speedMax: 220 });
      return;
    }

    if (t <= 4) {
      FX.burst(x, y, { type: 'orb', count: 22, colors, speedMin: 90, speedMax: 300 });
      FX.burst(x, y, { type: 'spark', count: 26, colors, speedMin: 160, speedMax: 460 });
      FX.ringBurst(x, y, { colors, count: 2 });
      FX.flash(colors[1] + '55', 350);
      return;
    }

    if (t <= 6) {
      FX.burst(x, y, { type: 'star', count: 26, colors, speedMin: 140, speedMax: 520 });
      FX.burst(x, y, { type: 'orb', count: 20, colors });
      FX.ringBurst(x, y, { colors, count: 3, stagger: 110 });
      FX.flash(colors[1] + '66', 450);
      FX.shake($('#app'), { intensity: 7, duration: 420 });
      FX.rays(colors[1], x, y);
      return;
    }

    /* top tiers: everything, at once */
    FX.rays(colors[1], x, y);
    setTimeout(() => FX.rays(colors[2] || colors[0], x, y), 260);
    FX.burst(x, y, { type: 'star', count: 34, colors, speedMin: 200, speedMax: 640 });
    FX.burst(x, y, { type: 'spark', count: 40, colors, speedMin: 260, speedMax: 760 });
    FX.burst(x, y, { type: 'orb', count: 24, colors, speedMin: 60, speedMax: 240 });
    FX.rayBurst(x, y, { colors, count: 16 });
    FX.ringBurst(x, y, { colors, count: 4, stagger: 130, grow: 620 });
    FX.flash(colors[1] + '77', 550);
    FX.shake($('#app'), { intensity: 12, duration: 650 });
    if (t >= 9) {
      FX.rain({ type: 'confetti', colors, rate: 8, interval: 130 });
      const f = FX.fountain(x, y, { type: 'glyph', colors, width: 120, rate: 2, interval: 140 });
      setTimeout(() => f.stop(), 2600);
      setTimeout(() => sound.shimmer(), 350);
    }
  };

  window.RarityFX = FX;
})();
