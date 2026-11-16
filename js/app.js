/* ============================================================
   APP — game loop, slot reel, tabs, inventory, stats
   ============================================================ */
(() => {
  'use strict';

  const FX = window.RarityFX;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];

  const els = {
    app: $('#app'),
    reel: $('#reel'),
    slotWindow: $('#slot-window'),
    slotFrame: $('#slot-frame'),
    rollBtn: $('#roll-btn'),
    rollHint: $('#roll-hint'),
    resultSlot: $('#result-slot'),
    statTotal: $('#stat-total'),
    statBest: $('#stat-best'),
    invGrid: $('#inv-grid'),
    tabsToggle: $('#tabs-toggle'),
    tabsMenu: $('#tabs-menu'),
    soundToggle: $('#sound-toggle'),
  };

  const SPIN_MS = 2900;
  const EASING = 'cubic-bezier(0.14, 0.82, 0.18, 1)';
  let spinning = false;
  let tickIndex = -1;
  let tickRAF = 0;

  /* ==========================================================
     AUDIO UNLOCK (first gesture, iPad Safari requirement)
     ========================================================== */
  document.addEventListener('pointerdown', () => FX.sound.unlock(), { once: true, capture: true });

  els.soundToggle.addEventListener('click', () => {
    const muted = FX.sound.toggle();
    els.soundToggle.classList.toggle('muted', muted);
    els.soundToggle.setAttribute('aria-pressed', String(!muted));
    if (!muted) FX.sound.click();
  });

  /* ==========================================================
     SLOT REEL
     ========================================================== */
  function buildReel(target) {
    const items = [];
    const length = 31;
    for (let i = 0; i < length; i++) {
      items.push(rollRarity());
    }
    items[length - 2] = target; // lands in the center row
    items[length - 1] = target; // fills the row below

    els.reel.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach((r) => frag.appendChild(FX.buildReelItem(r)));
    els.reel.appendChild(frag);
    return items;
  }

  function reelItemHeight() {
    const first = els.reel.firstElementChild;
    return first ? first.getBoundingClientRect().height : 108;
  }

  /* center-row index while the CSS transition runs */
  function tickWatcher() {
    const wr = els.slotWindow.getBoundingClientRect();
    const centerY = wr.top + wr.height / 2;
    const children = els.reel.children;
    for (let i = 0; i < children.length; i++) {
      const r = children[i].getBoundingClientRect();
      if (r.top <= centerY && r.bottom >= centerY) {
        if (i !== tickIndex) {
          tickIndex = i;
          FX.sound.tick();
        }
        break;
      }
    }
    tickRAF = requestAnimationFrame(tickWatcher);
  }

  function spin(target, onLand) {
    const items = buildReel(target);
    const H = reelItemHeight();
    const visible = 3;

    // reset transform without transition
    els.reel.style.transition = 'none';
    els.reel.style.transform = 'translateY(0px)';
    els.reel.classList.add('spinning', 'fast');
    void els.reel.offsetHeight; // reflow

    // distance: land so that items[length-2] sits in the center row.
    // item k is centered when its top (k*H - distance) equals the center
    // row offset (Math.floor(visible/2) * H), so distance = (k - center)*H.
    const center = Math.floor(visible / 2);
    const finalIndex = items.length - 2 - center;
    const distance = Math.max(0, finalIndex) * H;

    requestAnimationFrame(() => {
      els.reel.style.transition = `transform ${SPIN_MS}ms ${EASING}`;
      els.reel.style.transform = `translateY(-${distance}px)`;
    });

    tickIndex = -1;
    tickRAF = requestAnimationFrame(tickWatcher);

    // ease the blur out as the reel slows
    setTimeout(() => els.reel.classList.remove('fast'), SPIN_MS * 0.62);

    const done = () => {
      els.reel.classList.remove('spinning');
      cancelAnimationFrame(tickRAF);
      onLand(target);
    };
    els.reel.addEventListener('transitionend', function handler(e) {
      if (e.propertyName !== 'transform') return;
      els.reel.removeEventListener('transitionend', handler);
      done();
    });
    // safety net in case transitionend never fires
    setTimeout(() => { if (spinning) done(); }, SPIN_MS + 600);
  }

  /* ==========================================================
     ROLL
     ========================================================== */
  function updateStats() {
    const s = window.RRStorage.current;
    els.statTotal.textContent = s.totalRolls.toLocaleString();
    const best = s.bestId ? getRarity(s.bestId) : null;
    if (best) {
      const span = FX.textSpan(best, best.name, { size: 'inherit' });
      span.style.fontSize = 'var(--text-base)';
      els.statBest.replaceChildren(span);
    } else {
      els.statBest.textContent = '—';
    }
  }

  function showResult(rarity, isNew) {
    const count = window.RRStorage.current.counts[rarity.id] || 0;
    const card = FX.buildCard(rarity, {
      badge: isNew,
      sub: `Owned: ${count} · ${rarityOdds(rarity)}`,
      discovered: true,
    });
    card.classList.add('result-card');
    els.resultSlot.replaceChildren(card);

    // let the pop-in animation land before the full reveal
    setTimeout(() => {
      FX.playReveal(rarity, card);
      FX.setAmbient(rarity.colors);
      els.slotFrame.style.setProperty('--marker-c', rarity.colors[1]);
      const landed = els.reel.children[els.reel.children.length - 2];
      if (landed) landed.classList.add('landed');
    }, 140);
  }

  function roll() {
    if (spinning) return;
    spinning = true;
    els.rollBtn.disabled = true;
    els.rollHint.textContent = 'Spinning...';
    els.resultSlot.replaceChildren();
    $$('.reel-item.landed', els.reel).forEach((el) => el.classList.remove('landed'));
    els.slotFrame.style.removeProperty('--marker-c');

    FX.sound.click();
    FX.sound.whoosh();
    const target = rollRarity();

    spin(target, (rarity) => {
      if (!spinning) return; // safety net already fired
      spinning = false;
      els.rollBtn.disabled = false;
      els.rollHint.textContent = 'Tap roll to spin the reel';

      const before = window.RRStorage.current.counts[rarity.id] || 0;
      window.RRStorage.record(rarity);
      const isNew = before === 0;
      showResult(rarity, isNew);
      updateStats();
      renderInventory();
    });
  }

  els.rollBtn.addEventListener('click', roll);

  /* ==========================================================
     INVENTORY
     ========================================================== */
  function renderInventory() {
    const s = window.RRStorage.current;
    const frag = document.createDocumentFragment();

    RARITIES.slice().reverse().forEach((r) => {
      const count = s.counts[r.id] || 0;
      const discovered = count > 0;
      const showBadge = discovered && !s.seen.includes(r.id);
      const card = FX.buildCard(r, {
        count,
        badge: showBadge,
        sub: discovered ? `Owned: ${count} · ${rarityOdds(r)}` : 'Not yet discovered',
        discovered,
        clickable: true,
      });

      if (showBadge) window.RRStorage.markSeen(r.id);

      card.addEventListener('click', () => {
        FX.sound.click();
        FX.playReveal(r, card, { silent: true });
        if (r.tier < 3) FX.sound.shimmer();
      });

      frag.appendChild(card);
    });

    els.invGrid.replaceChildren(frag);
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
    FX.sound.click();
    els.tabsMenu.classList.contains('open') ? closeMenu() : openMenu();
  });

  $$('.tab-btn').forEach((b) => {
    b.addEventListener('click', () => {
      FX.sound.click();
      switchTab(b.dataset.tab);
    });
  });

  // close when tapping outside the menu
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

    // idle state: reel shows a preview strip
    const preview = [getRarity('common'), getRarity('rare'), getRarity('legendary')];
    els.reel.innerHTML = '';
    const frag = document.createDocumentFragment();
    preview.forEach((r) => frag.appendChild(FX.buildReelItem(r)));
    els.reel.appendChild(frag);

    // tint the page with the last rolled rarity
    const last = save.lastId ? getRarity(save.lastId) : null;
    if (last) FX.setAmbient(last.colors);

    // brief welcome shimmer
    FX.setAmbient(last ? last.colors : ['#2563eb', '#7c3aed', '#0ea5e9']);
  })();

  /* keep the canvas sized correctly through orientation changes */
  addEventListener('orientationchange', () => setTimeout(() => {}, 300));
})();
