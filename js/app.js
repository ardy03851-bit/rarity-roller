/* ============================================================
   APP — v1.2: morphing stage icon, voxel tab transitions,
   card inventory with per-rarity hover effects.
   ============================================================ */
(() => {
  'use strict';

  const FX = window.RarityFX;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const els = {
    app: $('#app'),
    stageIcon: $('#stage-icon'),
    stageName: $('#stage-name'),
    stageMeta: $('#stage-meta'),
    rollBtn: $('#roll-btn'),
    statTotal: $('#stat-total'),
    statBest: $('#stat-best'),
    invGrid: $('#inv-grid'),
    stylesList: $('#styles-list'),
    toast: $('#toast'),
    tabsToggle: $('#tabs-toggle'),
    tabsMenu: $('#tabs-menu'),
    soundToggle: $('#sound-toggle'),
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  let spinning = false;
  let transitioning = false;
  let stageIconEl = null;

  /* ==========================================================
     AUDIO UNLOCK (first gesture, iPad Safari requirement)
     ========================================================== */
  document.addEventListener('pointerdown', () => FX.sound.unlock(), { once: true, capture: true });

  els.soundToggle.addEventListener('click', () => {
    const muted = FX.sound.toggle();
    els.soundToggle.classList.toggle('muted', muted);
    els.soundToggle.setAttribute('aria-pressed', String(!muted));
  });

  /* ==========================================================
     STAGE
     ========================================================== */
  function initStageIcon(rarity) {
    stageIconEl = FX.stageIcon(rarity);
    els.stageIcon.replaceChildren(stageIconEl);
  }

  function morphIcon(rarity) {
    if (stageIconEl) stageIconEl.morphTo(rarity);
  }

  function setMeta(text, isNew) {
    els.stageMeta.innerHTML = '';
    if (isNew) {
      const tag = document.createElement('span');
      tag.className = 'new-tag';
      tag.textContent = 'New';
      tag.style.setProperty('--r2', els.stageName.style.getPropertyValue('--r2'));
      els.stageMeta.appendChild(tag);
    }
    if (text) {
      const s = document.createElement('span');
      s.textContent = text;
      els.stageMeta.appendChild(s);
    }
  }

  /* ==========================================================
     ROLL — reel-style decelerating ticker
     Names sweep up through the stage like a physical reel:
     fast phase flows, slow phase settles, and a held beat of
     stillness right before the landing sells the near-miss.
     ========================================================== */
  function buildSequence(target, length = 26) {
    const seq = [];
    for (let i = 0; i < length; i++) seq.push(rollRarity());
    seq[length - 1] = target;
    return seq;
  }

  async function roll() {
    if (spinning) return;
    spinning = true;
    els.rollBtn.disabled = true;
    els.rollBtn.classList.add('spinning');
    document.body.classList.add('spinning');
    els.stageMeta.innerHTML = '';

    const target = rollRarity();
    const seq = buildSequence(target);

    const TICKS = seq.length;
    for (let i = 0; i < TICKS; i++) {
      const r = seq[i];
      const tick = FX.tick(r);
      const k = i / (TICKS - 1);              // 0 → 1
      const d = 62 + Math.pow(k, 3.4) * 330;   // 62ms → ~392ms, slow only at the end
      tick.style.setProperty('--d', `${d}ms`);
      els.stageName.replaceChildren(tick);
      morphIcon(r);
      // quiet tick, skipping the fastest beats so it never machine-guns
      if (d > 90 && i % 2 === 0) FX.sound.tick();
      await wait(d);
    }

    // the held breath: the result is already on the line — let it sit
    await wait(340);
    land(target);
  }

  function land(rarity) {
    const before = window.RRStorage.current.counts[rarity.id] || 0;
    window.RRStorage.record(rarity);
    const isNew = before === 0;

    // landed name — unveiled as the pixel veil dissolves
    FX.dissolve(rarity.colors[1] || rarity.colors[0]);
    els.stageName.replaceChildren(FX.landed(rarity));
    morphIcon(rarity);
    els.rollBtn.classList.remove('spinning');
    document.body.classList.remove('spinning');
    els.rollBtn.disabled = false;

    // ring pulse in the rarity's color
    const pulse = document.createElement('span');
    pulse.className = 'ring-pulse';
    pulse.style.setProperty('--pulse', rarity.colors[1] || rarity.colors[0]);
    els.rollBtn.appendChild(pulse);
    setTimeout(() => pulse.remove(), 800);

    setMeta(
      `1 in ${Math.round(TOTAL_WEIGHT / rarity.weight).toLocaleString()} · owned ${window.RRStorage.current.counts[rarity.id]}`,
      isNew
    );

    // style unlocks are achievement-based: re-check after every roll
    syncUnlocks(false);

    const rect = els.stageName.getBoundingClientRect();
    FX.playReveal(rarity, els.stageName, {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });

    spinning = false;
    updateStats();
    renderInventory();
  }

  els.rollBtn.addEventListener('click', roll);

  /* ==========================================================
     STATS
     ========================================================== */
  function updateStats() {
    const s = window.RRStorage.current;
    const n = s.totalRolls;
    els.statTotal.textContent = n.toLocaleString();
    const best = s.bestId ? getRarity(s.bestId) : null;
    if (best) {
      els.statBest.replaceChildren(FX.textSpan(best, best.name));
    } else {
      els.statBest.textContent = '—';
    }
  }

  /* ==========================================================
     INVENTORY — card grid with per-rarity hover effects
     ========================================================== */
  function renderInventory() {
    const s = window.RRStorage.current;
    const frag = document.createDocumentFragment();

    RARITIES.slice().reverse().forEach((r) => {
      const count = s.counts[r.id] || 0;
      const discovered = count > 0;
      const isNew = discovered && !s.seen.includes(r.id);
      frag.appendChild(FX.buildCard(r, { count, discovered, isNew }));
      if (isNew) window.RRStorage.markSeen(r.id);
    });

    els.invGrid.replaceChildren(frag);
  }

  /* ==========================================================
     BUTTON STYLES — the 3D pedestal shop
     ========================================================== */
  let shopLoopOn = false;
  let shopCanvases = [];

  function getStyle(id) {
    return RR_STYLES.find((st) => st.id === id) || RR_STYLES[0];
  }

  function applyStyle(style) {
    const rgb = window.RRPedestal.hexToRgb(style.accent);
    document.documentElement.style.setProperty('--btn-accent-rgb', rgb.join(','));
    /* the button itself wears the style's silhouette */
    els.rollBtn.className = 'roll-btn bs-' + style.id;
  }

  function toast(text, accent) {
    els.toast.textContent = text;
    els.toast.style.setProperty('--btn-accent-rgb', accent || '201,201,212');
    els.toast.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => els.toast.classList.remove('show'), 3200);
  }

  /* check unlock conditions; toast any new ones */
  function syncUnlocks(quiet = true) {
    const s = window.RRStorage.current;
    let changed = false;
    for (const st of RR_STYLES) {
      if (s.unlockedStyles.includes(st.id)) continue;
      if (st.unlock(s)) {
        window.RRStorage.unlockStyle(st.id);
        changed = true;
        if (!quiet) {
          toast(`Button style unlocked — ${st.name}`, window.RRPedestal.hexToRgb(st.accent).join(','));
          FX.sound.reveal(5);
        }
      }
    }
    if (changed) renderShop();
  }

  function renderShop() {
    const s = window.RRStorage.current;
    els.stylesList.replaceChildren();
    shopCanvases = [];

    for (const st of RR_STYLES) {
      const unlocked = s.unlockedStyles.includes(st.id);
      const active = s.activeStyle === st.id;
      const item = document.createElement('article');
      item.className = 'style-item' + (unlocked ? '' : ' locked') + (active ? ' active' : '');
      item.style.setProperty('--acc', st.accent);
      item.style.setProperty('--acc-rgb', window.RRPedestal.hexToRgb(st.accent).join(','));
      item.style.setProperty('--acc-hex', st.accent);

      const ped = document.createElement('div');
      ped.className = 'pedestal-wrap';
      const canvas = document.createElement('canvas');
      const SIZE = 210;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
      canvas.style.width = `${SIZE}px`;
      canvas.style.height = `${SIZE}px`;
      ped.appendChild(canvas);
      item.appendChild(ped);
      shopCanvases.push({ canvas, style: st, locked: !unlocked, dpr });

      const info = document.createElement('div');
      info.className = 'style-info';
      info.innerHTML = `
        <h3>${st.name}</h3>
        <p class="style-desc">${st.desc}</p>
      `;

      if (active) {
        const badge = document.createElement('span');
        badge.className = 'style-state active-badge';
        badge.textContent = 'Active';
        info.appendChild(badge);
      } else if (unlocked) {
        const btn = document.createElement('button');
        btn.className = 'style-state style-activate';
        btn.textContent = 'Activate';
        btn.addEventListener('click', () => {
          window.RRStorage.setActiveStyle(st.id);
          applyStyle(st);
          renderShop();
        });
        info.appendChild(btn);
      } else {
        const p = st.progress(s);
        const req = document.createElement('div');
        req.className = 'style-req';
        req.innerHTML = `
          <span class="style-req-label">${p.cur} / ${p.goal} ${p.label}</span>
          <span class="style-progress"><i style="width:${Math.round((p.cur / p.goal) * 100)}%"></i></span>
        `;
        info.appendChild(req);
      }
      item.appendChild(info);
      els.stylesList.appendChild(item);
    }

    startShopLoop();
  }

  function startShopLoop() {
    if (shopLoopOn) return;
    shopLoopOn = true;
    const loop = (ts) => {
      if (!document.querySelector('#view-styles.active')) {
        shopLoopOn = false;
        return; // stop when the shop isn't on screen
      }
      const t = ts / 1000;
      for (const c of shopCanvases) {
        const ctx = c.canvas.getContext('2d');
        ctx.setTransform(c.dpr, 0, 0, c.dpr, 0, 0);
        window.RRPedestal.drawPedestal(ctx, 210, c.style.palette, t, c.locked, c.style.accent, c.style.btn);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  /* ==========================================================
     TABS — voxel disintegration transition
     ========================================================== */
  async function switchTab(name) {
    const from = $('.view.active');
    const to = $(`#view-${name}`);
    if (!to || to === from) { closeMenu(); return; }
    if (transitioning) { closeMenu(); return; }
    transitioning = true;

    // update tab highlight + aria immediately
    $$('.tab-btn').forEach((b) => {
      if (b.dataset.tab === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });
    closeMenu();

    // the screen breaks into 3D pixels and rebuilds as the new view
    const ok = await FX.voxelTransition(from, to);

    if (!ok) {
      // graceful fallback: plain swap
      from.classList.remove('active');
      to.classList.add('active');
    }

    els.app.scrollTo({ top: 0 });
    transitioning = false;
    if (name === 'styles') startShopLoop();
  }

  function openMenu() {
    els.tabsMenu.classList.add('open');
    els.tabsToggle.classList.add('open');
    els.tabsToggle.setAttribute('aria-expanded', 'true');
    els.tabsMenu.setAttribute('aria-hidden', 'false');
  }

  function closeMenu() {
    els.tabsMenu.classList.remove('open');
    els.tabsToggle.classList.remove('open');
    els.tabsToggle.setAttribute('aria-expanded', 'false');
    els.tabsMenu.setAttribute('aria-hidden', 'true');
  }

  els.tabsToggle.addEventListener('click', () => {
    els.tabsMenu.classList.contains('open') ? closeMenu() : openMenu();
  });

  $$('.tab-btn').forEach((b) => {
    b.addEventListener('click', () => switchTab(b.dataset.tab));
  });

  document.addEventListener('pointerdown', (e) => {
    if (els.tabsMenu.classList.contains('open') &&
        !els.tabsMenu.contains(e.target) &&
        !els.tabsToggle.contains(e.target)) {
      closeMenu();
    }
  });

  /* ==========================================================
     BOOT
     ========================================================== */
  (async () => {
    FX.ambient();
    const save = await window.RRStorage.init();
    window.RRStorage.current = save;
    updateStats();
    renderInventory();
    renderShop();

    // equip the saved button style + backfill achievements earned before
    // the styles system existed (quietly)
    syncUnlocks(true);
    applyStyle(getStyle(save.activeStyle));

    // resting stage: your best find, or a quiet invitation
    const best = save.bestId ? getRarity(save.bestId) : null;
    if (best && save.totalRolls > 0) {
      els.stageName.replaceChildren(FX.landed(best));
      initStageIcon(best);
      setMeta(`best of ${save.totalRolls} roll${save.totalRolls === 1 ? '' : 's'}`);
    } else {
      const first = getRarity('common');
      els.stageName.replaceChildren(FX.tick(first));
      initStageIcon(first);
      setMeta('press roll');
    }
  })();
})();
