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
    tabsToggle: $('#tabs-toggle'),
    tabsMenu: $('#tabs-menu'),
    soundToggle: $('#sound-toggle'),
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

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
     ROLL — decelerating name ticker
     ========================================================== */
  function buildSequence(target, length = 22) {
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
    els.stageMeta.innerHTML = '';

    const target = rollRarity();
    const seq = buildSequence(target);

    const TICKS = seq.length;
    for (let i = 0; i < TICKS; i++) {
      const r = seq[i];
      els.stageName.replaceChildren(FX.tick(r));
      morphIcon(r);
      // quiet tick, skipping the fastest beats so it never machine-guns
      if (i < TICKS - 1 && i % 2 === 0) FX.sound.tick();
      const k = i / (TICKS - 1);            // 0 → 1
      const speed = easeOutQuad(k);          // 0 → 1, decelerating
      await wait(18 + speed * speed * 320);  // 18ms → ~338ms
    }

    land(target);
  }

  function land(rarity) {
    const before = window.RRStorage.current.counts[rarity.id] || 0;
    window.RRStorage.record(rarity);
    const isNew = before === 0;

    // landed name
    els.stageName.replaceChildren(FX.landed(rarity));
    morphIcon(rarity);
    els.rollBtn.classList.remove('spinning');
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
    els.statTotal.textContent = `${n.toLocaleString()} roll${n === 1 ? '' : 's'}`;
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
    const save = await window.RRStorage.init();
    window.RRStorage.current = save;
    updateStats();
    renderInventory();

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
