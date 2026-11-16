# Rarity Roller

A minimalist iPad-optimised RNG game. Tap **ROLL**, watch a slot-machine reel spin, and collect random rarities — from **Common** all the way to **Divine** (1 in 2000 rolls). That's the whole loop.

The gameplay is deliberately simple; the presentation is not. Every rarity owns a hand-crafted animated gradient, its own typeface from a 30+ family Google Fonts library, a basic-shape icon, and a tier-scaled reveal choreography built on the in-house **RarityFX** effects engine.

Play the [GitHub Pages build](https://ardy03851-bit.github.io/rarity-roller/).

## Features

- **Slot-machine roll loop** — CSS-eased reel with motion blur, per-item ticks, and a bounce landing
- **9 rarities** — Common, Uncommon, Rare, Epic, Legendary, Mythic, Exotic, Celestial, Divine — with cryptographically fair weighted odds (`crypto.getRandomValues`)
- **RarityFX engine** — canvas particle system (sparks, orbs, stars, confetti, embers, shockwave rings, light rays, glyphs), screen shake, flashes, conic ray bursts, ambient page tinting, procedural WebAudio sound
- **Animated gradient text** — rarity names inside the changelog are rendered with their in-game gradient animations
- **Durable saves** — checksum-signed to localStorage, mirrored to IndexedDB, auto-healing, plus a storage-persistence request so the browser avoids evicting your collection
- **Slide-out tab menu** — Roll / Inventory / Changelog, one tap away from the arrow on the right edge
- **Image layer support** — rarities can define images for card art, page backdrop, icon, or text fill
- **iPad first** — safe-area aware, 46px+ touch targets, both orientations, no hover dependence, reduced-motion support

## Project structure

```
index.html            the whole game UI (one HTML file)
css/
  base.css            design tokens + reset
  fonts.css           font registry (30+ families via Google Fonts)
  rarity.css          rarity visual system: gradients, beams, tiers, keyframes
  ui.css              layout: slot, roll button, tabs, inventory, changelog
js/
  engine.js           RarityFX effects engine (particles, sound, DOM builders)
  rarities.js         rarity definitions + weighted RNG
  storage.js         durable save system (localStorage + IndexedDB mirror)
  changelog.js        changelog data + rarity-aware text renderer
  app.js              game loop, reel, tabs, inventory
assets/patterns/     SVG textures used by rarity image layers
```

## Adding a rarity

Open `js/rarities.js` and append to `RARITIES`:

```js
{
  id: 'mythic2',
  name: 'Mythic2',
  weight: 400,          // tickets out of 100,000
  tier: 7,              // 1-9, scales reveal effects
  colors: ['#f472b6', '#e11d48', '#fda4af'],
  glow: 'rgba(244,114,182,0.6)',
  font: 'Grenze Gotisch',  // any family from the Google Fonts link in index.html
  icon: 'hexagon',         // circle|square|triangle|diamond|pentagon|hexagon|ring|star4|star5|star6|star8|burst
  speed: 0.9,            // gradient animation speed (lower = slower/grander)
  images: {               // optional image slots
    art:  'assets/patterns/stars.svg', // card texture
    card: 'url',   // full card background
    page: 'url',   // page ambient backdrop
    text: 'url',   // gradient text fill
    icon: 'url',   // replaces the shape icon
  },
}
```

To use a new font, add the family to the Google Fonts `<link>` in `index.html` first.

## Changelog format

Edit `CHANGELOG` in `js/changelog.js` (and keep `CHANGELOG.md` in sync). Any word matching a rarity name is automatically animated with that rarity's gradient, e.g. writing "added a new **Legendary** trail effect" makes *Legendary* glow gold. `**bold**` markers are supported.

## Storage details

Saves are written to localStorage and IndexedDB simultaneously, each wrapped with an FNV-1a checksum. On load, both copies are verified and the healthiest one wins; a missing or corrupt store is re-healed from the survivor. `navigator.storage.persist()` is requested so the browser treats the data as durable.

## License

MIT
