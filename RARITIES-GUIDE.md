# The Rarity Manual — everything you can do

This is the complete guide to configuring rarities in **Rarity Roller**. All rarity configuration lives in **one file**: [`js/rarities.config.js`](js/rarities.config.js). You never need to touch `index.html`, the CSS, or the engine to add or change rarities — the entire game (odds, ticker, inventory, changelog animations, reveal effects, saves) reads from that file.

---

## Quick start: add a rarity in 60 seconds

1. Open `js/rarities.config.js`
2. Scroll to the template at the bottom (it's commented out, ready to copy)
3. Copy the block, paste it anywhere inside the `RARITY_CONFIG` list
4. Edit the values, save, reload the game

Done. The new rarity immediately:

- Appears in the roll ticker and can be rolled
- Gets its own card in your inventory with its hover effect
- Animates inside changelog text whenever its name appears
- Is saved durably like every other rarity
- Has its odds computed automatically against the shared pool

---

## Every field, explained

A rarity block looks like this:

```js
{
  id: 'ancient',
  name: 'Ancient',
  weight: 4200,
  tier: 4,
  colors: ['#d6a97c', '#8a6d3b', '#e8d5b0'],
  glow: 'rgba(214,169,124,0.5)',
  font: 'MedievalSharp',
  icon: 'shield',
  hover: 'dust',
  speed: 0.95,
  images: { art: 'assets/patterns/stars.svg' },
},
```

### `id` — required
The unique internal key. Lowercase, no spaces. This is what the save file uses to count your rolls — **never change it after release**, or existing collections lose that count.

### `name` — required
The display name. This is also a **magic word**: if the name ever appears in changelog text, it is automatically rendered with its animated gradient. Write "the new **Fabled** effect" in a changelog note and *Fabled* glows teal in place.

### `weight` — required
Tickets in the shared pool. All weights are summed, and each rarity's odds are `weight / total`. With the current 121,870 total:

| weight | odds (approx.) |
| --- | --- |
| 50000 | 1 in 2 |
| 10000 | 1 in 12 |
| 1000 | 1 in 122 |
| 50 | 1 in 2,437 |

Use the `tier` for the drama and `weight` for the actual rarity — they're independent.

### `tier` — required, 1–12
Scales the reveal choreography and the default glow strength:

| tier | reveal |
| --- | --- |
| 1–2 | name animation only — quiet, elegant |
| 3–4 | soft flash |
| 5–6 | flash + spinning voxel pixels |
| 7–8 | more voxels + soft orbs |
| 9+ | shockwave rings, full choreography |

### `colors` — required
2–3 hex colors: `[start, middle, end]` of the animated gradient. Used for the name text, the inventory card accents, the glow, and the roll-button pulse. Two colors work fine; three gives the gradient more range. Tip: keep one stop noticeably lighter for good text legibility.

### `glow` — required
An `rgba()` color for the glow around the name and cards. Usually the middle color at 40–70% opacity.

### `font` — required
Any family from the Google Fonts link in `index.html` (32 families loaded — see the list in `css/fonts.css`). Want a font that isn't loaded? Add it to the fonts `<link>` in `index.html`, then reference it here. The font shows up in the ticker, the landed headline, and the inventory card name.

### `icon` — optional (default: `circle`)
The shape shown above the stage name and on inventory cards. **The stage icon morphs smoothly** between shapes as the ticker runs. Choose one:

`circle` `square` `triangle` `diamond` `pentagon` `hexagon` `octagon` `star4` `star5` `star6` `star8` `burst` `cross` `shield` `chevron` `crescent` `droplet` `gem` `blade` `pixel` `pixelstar`

### Card shape — fixed
Inventory cards are always crisp squares now (removed in 1.3.0 to keep the collection looking like one coherent deck). The `shape` field is no longer used.

### `hover` — optional (default: `lift`)
The subtle effect when a finger or mouse rests on the inventory card. Works on touch too, not just hover:

| value | effect |
| --- | --- |
| `lift` | quiet rise + tinted edge |
| `glow` | soft halo grows |
| `underline` | gradient rule slides under the name |
| `tilt` | gentle 3D lean |
| `sheen` | one slow sweep of light |
| `pulse` | breathing glow |
| `scan` | thin scanline travels the card |
| `twinkle` | tiny stars fade in and out |
| `dust` | pixels drift upward |
| `hue` | colors cycle the spectrum |

### `speed` — optional (default: `1`)
Animation speed multiplier. Lower = slower and grander. Top rarities look good at `0.8`–`0.9`.

### `images` — optional
Image layers, all optional:

```js
images: {
  art:  'assets/patterns/stars.svg', // texture inside inventory cards
  page: 'url',                        // full-page ambient backdrop
  text: 'url',                        // fills the gradient name text
  icon: 'url',                        // replaces the shape icon in cards
}
```

Two ready-made textures ship in `assets/patterns/` (`stars.svg`, `grid.svg`) — drop any SVG or image in there and reference it.

---

## Rules of thumb

- **Partial entries are fine.** Anything you omit falls back to a tasteful default — the config resolver fills in the blanks, so a minimal block still looks intentional.
- **Keep ids stable.** Rename `name` freely; never rename `id`.
- **Total odds are automatic.** Adding rarities dilutes existing ones — that's the fun.
- **Changelog is data too.** New update? Add an entry to the `CHANGELOG` array in `js/changelog.js` (and mirror it in `CHANGELOG.md`). Any rarity name in your text animates automatically.
- **Test with DevTools.** `RARITIES` in the console shows the fully-resolved config, `rollRarity()` runs the odds, and `RarityFX.playReveal(RARITIES[0], document.body)` previews a reveal.

## The 18 shipped rarities

| rarity | tier | odds | font | icon | hover |
| --- | --- | --- | --- | --- | --- |
| Common | 1 | 1 in 2 | Space Grotesk | circle | lift |
| Uncommon | 2 | 1 in 5 | Chakra Petch | triangle | glow |
| Rare | 3 | 1 in 10 | Michroma | diamond | underline |
| Corrupted | 3 | 1 in 14 | Major Mono Display | pixel | scan |
| Epic | 4 | 1 in 17 | Syne | pentagon | tilt |
| Ancient | 4 | 1 in 29 | MedievalSharp | shield | dust |
| Ethereal | 4 | 1 in 36 | Cormorant Garamond | droplet | twinkle |
| Legendary | 5 | 1 in 41 | Cinzel | star5 | sheen |
| Fabled | 5 | 1 in 51 | Fraunces | star6 | pulse |
| Quantum | 5 | 1 in 76 | Bungee | gem | sheen |
| Mythic | 6 | 1 in 102 | Grenze Gotisch | hexagon | pulse |
| Neon | 6 | 1 in 135 | Zen Dots | blade | hue |
| Void | 6 | 1 in 203 | Anton | pixelstar | dust |
| Exotic | 7 | 1 in 271 | Audiowide | chevron | scan |
| Radiant | 7 | 1 in 244 | Righteous | burst | pulse |
| Celestial | 8 | 1 in 348 | Syncopate | star4 | twinkle |
| Prismatic | 8 | 1 in 554 | Playfair Display | pixelstar | hue |
| Divine | 9 | 1 in 2,437 | Monoton | star8 | hue |
