/* ============================================================
   APP — v2: the stage name is the game.
   Roll runs a decelerating ticker of rarity names; the last
   one lands as the huge gradient headline.
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
    statBestWrap: $('#stat-best-wrap'),
    invList: $('#inv-list'),
    tabsToggle: $('#tabs-toggle'),
    tabsMenu: $('#tabs-menu'),
    soundToggle: $('#sound-toggle'),
  };

  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const easeOutQuad = (t) => 1 - (1 - t) * (1 - t);

  let spinning = false;

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
  function setIcon(rarity) {
    els.stageIcon.innerHTML = FX.iconSVG(rarity.icon, 30);
    els.stageIcon.style.setProperty('--stage-c', rarity.colors[1] || rarity.colors[0]);
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

  function metaFor(rarity, count) {
    return `1 in ${Math.round(TOTAL_WEIGHT / rarity.weight)} · owned ${count}`;
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

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      land(target);
      return;
    }

    const TICKS = seq.length;
    const totalTime = 2700;
    for (let i = 0; i < TICKS; i++) {
      const r = seq[i];
      els.stageName.replaceChildren(FX.tick(r));
      setIcon(r);
      // quiet tick, skipping the very fastest beats so it never machine-guns
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
    els.rollBtn.classList.remove('spinning');
    els.rollBtn.disabled = false;

    // ring pulse in the rarity's color
    const pulse = document.createElement('span');
    pulse.className = 'ring-pulse';
    pulse.style.setProperty('--pulse', rarity.colors[1] || rarity.colors[0]);
    els.rollBtn.appendChild(pulse);
    setTimeout(() => pulse.remove(), 800);

    setIcon(rarity);
    setMeta(metaFor(rarity, window.RRStorage.current.counts[rarity.id]), isNew);

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
     INVENTORY
     ========================================================== */
  function renderInventory() {
    const s = window.RRStorage.current;
    const frag = document.createDocumentFragment();

    RARITIES.slice().reverse().forEach((r) => {
      const count = s.counts[r.id] || 0;
      const discovered = count > 0;
      const isNew = discovered && !s.seen.includes(r.id);
      frag.appendChild(FX.buildRow(r, { count, discovered, isNew }));
      if (isNew) window.RRStorage.markSeen(r.id);
    });

    els.invList.replaceChildren(frag);
  }

  /* ==========================================================
     TABS
     ========================================================== */
  function switchTab(name) {
    $$('.view').forEach((v) => v.classList.remove('active'));
    const view = $(`#view-${name}`);
    if (view) view.classList.add('active');

    $$('.tab-btn').forEach((b) => {
      if (b.dataset.tab === name) b.setAttribute('aria-current', 'page');
      else b.removeAttribute('aria-current');
    });

    closeMenu();
    els.app.scrollTo({ top: 0 });
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
      setIcon(best);
      setMeta(`best of ${save.totalRolls} roll${save.totalRolls === 1 ? '' : 's'}`);
    } else {
      const first = getRarity('common');
      els.stageName.replaceChildren(FX.tick(first));
      setIcon(first);
      setMeta('press roll');
    }
  })();
})();
