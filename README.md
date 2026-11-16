# Rarity Roller

A minimalist iPad-optimised RNG game. Tap **Roll**, watch rarity names flick past in a decelerating ticker, and collect what lands — from **Common** all the way to **Divine** (1 in 2000 rolls). That's the whole loop.

The interface is deliberately monochrome and quiet: one huge gradient headline, a thin circular roll button, small type everywhere else. All color comes from the rarities themselves — each owns a hand-crafted animated gradient and its own typeface from a 30+ family Google Fonts library, and reveal effects are restrained, scaling from "just the name" for Common to a full choreography for **Divine**.

Play the [GitHub Pages build](https://ardy03851-bit.github.io/rarity-roller/).

## Features

- **Decelerating name ticker** — the roll itself: rarity names cycle in their own fonts and gradients, slowing down until the result lands as the headline
- **9 rarities** — Common, Uncommon, Rare, Epic, Legendary, Mythic, Exotic, Celestial, Divine — with cryptographically fair weighted odds (`crypto.getRandomValues`)
- **RarityFX engine** — canvas particle system (sparks, orbs, stars, shockwave rings), soft flashes, warm procedural WebAudio sound, and an extensible effect registry
- **Animated gradient text** — the signature look, also used inside the changelog, where rarity names carry their in-game animations
- **Durable saves** — checksum-signed to localStorage, mirrored to IndexedDB, auto-healing, plus a storage-persistence request so the browser avoids evicting your collection
- **Slide-out tab menu** — Roll / Inventory / Changelog, one tap away from the arrow on the right edge
- **Image layer support** — rarities can define images for art, page backdrop, icon, or text fill
- **iPad first** — safe-area aware, big touch targets, both orientations, no hover dependence, reduced-motion support

## Project structure

```
index.html              the whole game UI (one HTML file)
css/
  base.css              design tokens + reset
  fonts.css             font registry (30+ families via Google Fonts)
  rarity.css             rarity visual system: gradients, ticker, cards, hover effects
  ui.css                 layout: stage, roll button, tabs, inventory, changelog
js/
  engine.js             RarityFX effects engine (morphing icons, voxel transitions,
                        particles, sound, DOM builders)
  rarities.config.js    THE rarity config — the only file you edit to add rarities
  rarities.js            resolves the config + weighted RNG
  storage.js             durable save system (localStorage + IndexedDB mirror)
  changelog.js           changelog data + rarity-aware text renderer
  styles.js              button styles: unlocks, silhouettes + the 3D pedestal shop
  app.js                 game loop, ticker, tabs, inventory, styles shop
assets/patterns/       SVG textures available to rarity image layers
RARITIES-GUIDE.md      the full rarity manual (every field, every option)
```

## Adding a rarity

All rarity configuration lives in **one file**: [`js/rarities.config.js`](js/rarities.config.js). To add a rarity, paste the template block (included at the bottom of that file) into the list, edit the values, save, reload — no other file needs to change. Every field (weights, tiers, gradient colors, per-rarity fonts, morphing shape icons, card shapes, hover effects, image layers) is documented inline and in the full manual: [`RARITIES-GUIDE.md`](RARITIES-GUIDE.md).

The 12 shipped rarities: Common, Uncommon, Rare, Epic, Ancient, Legendary, Fabled, Mythic, Exotic, Radiant, Celestial, Divine.

## Adding a button style

Button styles live in one list in [`js/styles.js`](js/styles.js): `id`, `name`, short description, a 3-color pixel palette for the pedestal, an `accent` for the roll button, a `btn` silhouette (`circle`, `circle-double`, `squircle`, `square`, `circle-dashed`, `circle-thick`, `circle-prism`), and an `unlock`/`progress` pair checked against the save after every roll. Paste a new block into `RR_STYLES`, reload — the shop, unlock toast and button silhouette pick it up automatically.

## Changelog format

Edit `CHANGELOG` in `js/changelog.js` (and keep `CHANGELOG.md` in sync). Any word matching a rarity name is automatically animated with that rarity's gradient, e.g. writing "added a new **Legendary** trail effect" makes *Legendary* glow gold. `**bold**` markers are supported.

## Storage details

Saves are written to localStorage and IndexedDB simultaneously, each wrapped with an FNV-1a checksum. On load, both copies are verified and the healthiest one wins; a missing or corrupt store is re-healed from the survivor. `navigator.storage.persist()` is requested so the browser treats the data as durable.

## License

MIT
