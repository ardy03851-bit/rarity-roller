/* ============================================================
   CHANGELOG — data-driven, newest first.
   Any mention of a rarity name inside note text is
   automatically re-rendered with that rarity's animated
   gradient text. **bold** markers are supported.
   ============================================================ */

const CHANGELOG = [
  {
    version: '1.3.0',
    date: '2026-11-16',
    tag: 'Pixel perfect',
    notes: [
      'The collection is now a **square deck**: card shapes were removed from the config and every card is a crisp square — the inventory reads as one coherent set instead of a mixed bag.',
      'The rolling ticker **always wears the rarity** now: every name that flicks past is drawn in that rarity\'s own typeface and live gradient, not just the landed one.',
      'Six new rarities joined the pool: **Corrupted**, **Ethereal**, **Quantum**, **Neon**, **Void** and **Prismatic** — eighteen rarities from Common to Divine.',
      'Reveal bursts are now made of **spinning voxel pixels** that tumble and shrink as they fade — the game\'s signature particle.',
      'A quiet **ambient voxel field** drifts behind the stage: faint pixels rising through the dark, giving the screen depth without stealing attention.',
      'The roll button\'s landing pulse is now a **voxel ring** — a square outline that twists into a diamond as it expands.',
      'New icon shapes for the morphing stage icon: gem, blade, pixel and pixelstar.',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-11-16',
    tag: 'Voxel update',
    notes: [
      'Switching tabs now **breaks the screen into 3D pixels**: every pixel of the current view lifts off, tumbles through space and re-settles as a pixel of the next view. Slow on purpose, and best experienced with sound on.',
      'All animations now run even with the system **Reduce Motion** setting enabled — the effects are the game, so they were tuned gentle instead of disabled.',
      'The inventory returned as a grid of cards, and every rarity now has its own **subtle hover effect**: Legendary sweeps a sheen, Exotic runs a scanline, Celestial twinkles, Ancient breathes rising dust, and more. Cards also have per-rarity **shapes** — hexagons, chamfered cuts, pills.',
      'Rarity configuration moved into **its own file** (`js/rarities.config.js`). Adding a rarity is now just pasting a block into that file — no other edits needed. See RARITIES-GUIDE.md in the repository for the full manual.',
      'Three new rarities joined the pool: **Ancient**, **Fabled** and **Radiant** — pushing the pool to twelve.',
      'The icon above the name now **morphs** between shapes as the ticker runs — circle to diamond to star, with the color melting between them.',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-11-16',
    tag: 'Redesign',
    notes: [
      'The whole interface was stripped back to one idea: **the name is the game**. The reel window, chips, result cards, stat panels, ambient blobs and arcade effects are gone — the screen is now a huge rarity name, a thin roll button, and quiet type everywhere else.',
      'The roll is a **decelerating ticker**: rarity names flick through in their own typefaces and gradients, slowing down until the result lands as the headline. No blur, no whoosh, no bounce.',
      'Reveal effects were rewritten to be restrained. Common and Uncommon get the name animation alone; Rare through Mythic add a quiet flash and fine light streaks; only **Divine** earns a full choreography. Screen shake, confetti, glyphs and fanfares are gone.',
      'Sound is now warm and quiet: soft ticker blips and slow pad chords on reveal. No click effects on buttons and menus.',
      'Inventory became a clean typographic list with counts and odds. Changelog entries flattened into editorial rules — the animated rarity names you know from **Legendary** and **Celestial** stay exactly as they were.',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-16',
    tag: 'Initial release',
    notes: [
      'The core loop is live: tap **ROLL**, watch the slot reel spin, and collect whatever the RNG gods grant you. Nine rarities to discover, from Common all the way up to Divine.',
      'Every rarity owns a hand-tuned look: its own flowing multi-stop gradient, its own typeface from a **30+ family font library**, its own basic-shape icon, and its own reveal choreography that scales with tier.',
      'The **RarityFX engine** ships with a full particle system (sparks, orbs, stars, confetti, embers, shockwave rings, light rays, glyphs), screen shake, full-screen flashes, conic ray bursts, ambient page tinting, and procedural WebAudio sound — no audio files needed.',
      'Your collection is saved durably: checksum-signed to **localStorage** and mirrored to **IndexedDB**, with automatic healing if one copy goes missing, plus a storage-persistence request so the browser avoids evicting your data.',
      'Tap the arrow on the right edge of the screen to open the tab menu and jump between **Roll**, **Inventory**, and this changelog. Rarity names you see in these notes are animated with their in-game rarity styles.',
      'Exotic and Celestial cards show off the engine\'s **image layer support** — any rarity can define images for the card art, the page backdrop, or even the gradient text fill.',
    ],
  },
];

/* ============================================================
   RENDERER
   ============================================================ */
(() => {
  'use strict';

  const NAME_TO_RARITY = {};
  RARITIES.forEach((r) => { NAME_TO_RARITY[r.name.toLowerCase()] = r; });
  const NAME_RE = new RegExp(
    `\\b(${Object.keys(NAME_TO_RARITY).join('|')})\\b`,
    'gi'
  );

  const ESC = {
    '&': '&' + 'amp;',
    '<': '&' + 'lt;',
    '>': '&' + 'gt;',
    '"': '&' + 'quot;',
  };

  function escapeHtml(s) {
    return s.replace(/[&<>"]/g, (c) => ESC[c]);
  }

  /** convert a plain note string to HTML with bold + rarity animations */
  function parseNote(text) {
    let html = escapeHtml(text);
    // **bold**
    html = html.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
    // rarity names → animated gradient spans
    html = html.replace(NAME_RE, (match) => {
      const r = NAME_TO_RARITY[match.toLowerCase()];
      return `<span class="rar-text" data-rarity="${r.id}" style="--r1:${r.colors[0]};--r2:${r.colors[1]};--r3:${r.colors[2]};--rglow:${r.glow};--fx-font:'${r.font}',var(--font-body)">${match}</span>`;
    });
    return html;
  }

  function renderChangelog(el) {
    const wrap = document.createDocumentFragment();

    // CHANGELOG is stored newest-first; render as-is
    CHANGELOG.forEach((entry) => {
      const article = document.createElement('article');
      article.className = 'cl-entry';
      article.innerHTML = `
        <div class="cl-head">
          <span class="cl-version">v${entry.version}</span>
          <span class="cl-tag">${escapeHtml(entry.tag)}</span>
          <span class="cl-date">${entry.date}</span>
        </div>
        <ul class="cl-notes" role="list">
          ${entry.notes.map((n) => `<li>${parseNote(n)}</li>`).join('')}
        </ul>
      `;
      wrap.appendChild(article);
    });

    el.appendChild(wrap);
  }

  document.addEventListener('DOMContentLoaded', () => {
    renderChangelog(document.getElementById('changelog'));
  });

  window.renderChangelog = renderChangelog;
})();
