# Changelog

## 1.1.0 — 2026-11-16 — Redesign

- The whole interface was stripped back to one idea: **the name is the game**. The reel window, chips, result cards, stat panels, ambient blobs and arcade effects are gone — the screen is now a huge rarity name, a thin roll button, and quiet type everywhere else.
- The roll is a **decelerating ticker**: rarity names flick through in their own typefaces and gradients, slowing down until the result lands as the headline. No blur, no whoosh, no bounce.
- Reveal effects were rewritten to be restrained. Common and Uncommon get the name animation alone; Rare through Mythic add a quiet flash and fine light streaks; only **Divine** earns a full choreography. Screen shake, confetti, glyphs and fanfares are gone.
- Sound is now warm and quiet: soft ticker blips and slow pad chords on reveal. No click effects on buttons and menus.
- Inventory became a clean typographic list with counts and odds. Changelog entries flattened into editorial rules — the animated rarity names stay exactly as they were.

## 1.0.0 — 2026-11-16 — Initial release

- The core loop is live: tap **ROLL**, watch the slot reel spin, and collect whatever the RNG gods grant you. Nine rarities to discover, from Common all the way up to Divine.
- Every rarity owns a hand-tuned look: its own flowing multi-stop gradient, its own typeface from a 30+ family font library, its own basic-shape icon, and its own reveal choreography that scales with tier.
- The RarityFX engine ships with a full particle system (sparks, orbs, stars, confetti, embers, shockwave rings, light rays, glyphs), screen shake, full-screen flashes, conic ray bursts, ambient page tinting, and procedural WebAudio sound.
- Your collection is saved durably: checksum-signed to localStorage and mirrored to IndexedDB, with automatic healing if one copy goes missing.
- Tap the arrow on the right edge of the screen to open the tab menu and jump between Roll, Inventory, and this changelog.
- Exotic and Celestial cards show off the engine's image layer support.

## License

MIT
