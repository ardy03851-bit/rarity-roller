/* ============================================================================
   RARITY CONFIG — the only file you ever need to edit.
   ============================================================================

   Every block below is one rarity. To add a rarity: copy the template
   at the bottom of this file, paste it anywhere in the list, fill it in,
   save, and reload the game. That's it. No other file needs to change —
   odds, inventory, ticker, changelog animations and the reveal engine
   all pick it up automatically.

   ── FIELD REFERENCE ────────────────────────────────────────────────────────

   id        string  required  Unique key (lowercase, no spaces). Used by the
                             save file — never change it after players start
                             collecting, or their counts for it are orphaned.
   name      string  required  Display name. Also the magic word: if it ever
                             appears in changelog text it is automatically
                             rendered with its animated gradient.
   weight    number  required  Tickets out of the shared pool. All weights are
                             summed; a rarity's odds are weight / total.
                             50000 ≈ 50%, 1000 ≈ 1%, 50 ≈ 1 in 2000.
   tier      number  required  1-9+. Scales the reveal drama (see below) and
                             the default gradient glow strength.
   colors    array   required  2-3 hex colors. The animated gradient stops for
                             the name, cards and text. [start, middle, end].
   glow      string  required  rgba() glow color, e.g. 'rgba(96,165,250,0.55)'.
   font      string  required  Any family from the Google Fonts <link> in
                             index.html (see the list in css/fonts.css). If you
                             want a font not in the list, add it to that link.
   icon      string  optional  Stage/inventory shape. One of:
                             circle, square, triangle, diamond, pentagon,
                             hexagon, octagon, star4, star5, star6, star8,
                             burst, cross, shield, chevron, crescent, droplet,
                             gem, blade, pixel, pixelstar.
                             The stage icon morphs smoothly between shapes.
   hover     string  optional  Subtle card hover/press effect. One of:
                             lift, glow, underline, tilt, sheen, pulse, scan,
                             twinkle, hue, dust. Default: 'lift'.
   speed     number  optional  Animation speed multiplier. Lower = slower,
                             grander (top rarities look good at 0.8-0.9).
   images    object  optional  Image layers, all optional:
                             { art: 'url', page: 'url', text: 'url', icon: 'url' }
                             art  = texture inside inventory cards
                             page = full-page ambient backdrop
                             text = fills the gradient name text
                             icon = replaces the shape icon in cards

   NOTE: inventory cards are always crisp squares now — shape is no longer
   configurable (removed in 1.3.0 to keep the collection looking like one
   coherent deck).

   ── TIER GUIDE (what players see) ─────────────────────────────────────────
     1-2  name animation only — quiet, elegant
     3-4  + soft flash
     5-6  + fine voxel sparks
     7-8  + more voxels, soft orbs
     9+   + shockwave rings, full choreography
   ============================================================================ */

const RARITY_CONFIG = [

  /* ── COMMON ─────────────────────────────────────────────────────────── */
  {
    id: 'common',
    name: 'Common',
    weight: 50000,
    tier: 1,
    colors: ['#9aa3ad', '#64748b', '#aeb6c2'],
    glow: 'rgba(154,163,173,0.4)',
    font: 'Space Grotesk',
    icon: 'circle',
    hover: 'lift',
    speed: 1.4,
  },

  /* ── UNCOMMON ───────────────────────────────────────────────────────── */
  {
    id: 'uncommon',
    name: 'Uncommon',
    weight: 25000,
    tier: 2,
    colors: ['#4ade80', '#16a34a', '#86efac'],
    glow: 'rgba(74,222,128,0.45)',
    font: 'Chakra Petch',
    icon: 'triangle',
    hover: 'glow',
    speed: 1.25,
  },
  /* ── FROSTBORN — new in 1.5.0 ────────────────────────────────────── */
  {
    id: 'frostborn',
    name: 'Frostborn',
    weight: 16000,
    tier: 2,
    colors: ['#bae6fd', '#38bdf8', '#e0f2fe'],
    glow: 'rgba(186,230,253,0.45)',
    font: 'Josefin Sans',
    icon: 'octagon',
    hover: 'glow',
    speed: 1.2,
},

  /* ── RARE ───────────────────────────────────────────────────────────── */
  {
    id: 'rare',
    name: 'Rare',
    weight: 12000,
    tier: 3,
    colors: ['#60a5fa', '#2563eb', '#93c5fd'],
    glow: 'rgba(96,165,250,0.55)',
    font: 'Michroma',
    icon: 'diamond',
    hover: 'underline',
  },

  /* ── CORRUPTED — new in 1.3.0 ───────────────────────────────────────── */
  {
    id: 'corrupted',
    name: 'Corrupted',
    weight: 9000,
    tier: 3,
    colors: ['#86efac', '#166534', '#a3e635'],
    glow: 'rgba(134,239,172,0.45)',
    font: 'Major Mono Display',
    icon: 'pixel',
    hover: 'scan',
    speed: 1.15,
  },

  /* ── EPIC ───────────────────────────────────────────────────────────── */
  {
    id: 'epic',
    name: 'Epic',
    weight: 7000,
    tier: 4,
    colors: ['#c084fc', '#7c3aed', '#e9d5ff'],
    glow: 'rgba(192,132,252,0.55)',
    font: 'Syne',
    icon: 'pentagon',
    hover: 'tilt',
  },

  /* ── ANCIENT ─────────────────────────────────────────────────────────── */
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
  },
  /* ── MOLTEN — new in 1.5.0 ────────────────────────────────────── */
  {
    id: 'molten',
    name: 'Molten',
    weight: 3700,
    tier: 4,
    colors: ['#fb923c', '#dc2626', '#fecaca'],
    glow: 'rgba(251,146,60,0.5)',
    font: 'Alfa Slab One',
    icon: 'blade',
    hover: 'sheen',
    },

  /* ── ETHEREAL — new in 1.3.0 ────────────────────────────────────────── */
  {
    id: 'ethereal',
    name: 'Ethereal',
    weight: 3400,
    tier: 4,
    colors: ['#e2e8f0', '#94a3b8', '#cbd5e1'],
    glow: 'rgba(226,232,240,0.5)',
    font: 'Cormorant Garamond',
    icon: 'droplet',
    hover: 'twinkle',
    speed: 1.05,
  },

  /* ── LEGENDARY ──────────────────────────────────────────────────────── */
  {
    id: 'legendary',
    name: 'Legendary',
    weight: 3000,
    tier: 5,
    colors: ['#fbbf24', '#f97316', '#fde68a'],
    glow: 'rgba(251,191,36,0.6)',
    font: 'Cinzel',
    icon: 'star5',
    hover: 'sheen',
  },

  /* ── FABLED ──────────────────────────────────────────────────────────── */
  {
    id: 'fabled',
    name: 'Fabled',
    weight: 2400,
    tier: 5,
    colors: ['#2dd4bf', '#0d9488', '#99f6e4'],
    glow: 'rgba(45,212,191,0.55)',
    font: 'Fraunces',
    icon: 'star6',
    hover: 'pulse',
    speed: 0.95,
  },

  /* ── QUANTUM — new in 1.3.0 ─────────────────────────────────────────── */
  {
    id: 'quantum',
    name: 'Quantum',
    weight: 1600,
    tier: 5,
    colors: ['#22d3ee', '#e879f9', '#a5f3fc'],
    glow: 'rgba(232,121,249,0.55)',
    font: 'Bungee',
    icon: 'gem',
    hover: 'sheen',
  },
  /* ── STATIC — new in 1.5.0 ────────────────────────────────────── */
  {
    id: 'static',
    name: 'Static',
    weight: 2000,
    tier: 5,
    colors: ['#e5e7eb', '#6b7280', '#f3f4f6'],
    glow: 'rgba(229,231,235,0.5)',
    font: 'Rubik Mono One',
    icon: 'square',
    hover: 'scan',
    speed: 1.1,
},

  /* ── MYTHIC ─────────────────────────────────────────────────────────── */
  {
    id: 'mythic',
    name: 'Mythic',
    weight: 1200,
    tier: 6,
    colors: ['#f472b6', '#e11d48', '#fda4af'],
    glow: 'rgba(244,114,182,0.6)',
    font: 'Grenze Gotisch',
    icon: 'hexagon',
    hover: 'pulse',
  },

  /* ── NEON — new in 1.3.0 ────────────────────────────────────────────── */
  {
    id: 'neon',
    name: 'Neon',
    weight: 900,
    tier: 6,
    colors: ['#f0abfc', '#d946ef', '#fbcfe8'],
    glow: 'rgba(240,171,252,0.6)',
    font: 'Zen Dots',
    icon: 'blade',
    hover: 'hue',
    speed: 1.1,
  },
  /* ── ECLIPSED — new in 1.5.0 ────────────────────────────────────── */
  {
    id: 'eclipsed',
    name: 'Eclipsed',
    weight: 800,
    tier: 6,
    colors: ['#f59e0b', '#0b1120', '#334155'],
    glow: 'rgba(245,158,11,0.5)',
    font: 'Creepster',
    icon: 'crescent',
    hover: 'dust',
    speed: 0.95,
},

  /* ── VOID — new in 1.3.0 ────────────────────────────────────────────── */
  {
    id: 'void',
    name: 'Void',
    weight: 600,
    tier: 6,
    colors: ['#c4b5fd', '#1e1b4b', '#8b5cf6'],
    glow: 'rgba(139,92,246,0.6)',
    font: 'Anton',
    icon: 'pixelstar',
    hover: 'dust',
    speed: 0.9,
  },

  /* ── EXOTIC ─────────────────────────────────────────────────────────── */
  {
    id: 'exotic',
    name: 'Exotic',
    weight: 450,
    tier: 7,
    colors: ['#22d3ee', '#06b6d4', '#a5f3fc'],
    glow: 'rgba(34,211,238,0.6)',
    font: 'Audiowide',
    icon: 'chevron',
    hover: 'scan',
    images: { art: 'assets/patterns/grid.svg' },
  },

  /* ── RADIANT ─────────────────────────────────────────────────────────── */
  {
    id: 'radiant',
    name: 'Radiant',
    weight: 500,
    tier: 7,
    colors: ['#fff7d6', '#f59e0b', '#ffe9a8'],
    glow: 'rgba(245,158,11,0.6)',
    font: 'Righteous',
    icon: 'burst',
    hover: 'pulse',
    speed: 0.9,
  },

  /* ── CELESTIAL ──────────────────────────────────────────────────────── */
  {
    id: 'celestial',
    name: 'Celestial',
    weight: 350,
    tier: 8,
    colors: ['#e0e7ff', '#8b5cf6', '#c4b5fd'],
    glow: 'rgba(139,92,246,0.65)',
    font: 'Syncopate',
    icon: 'star4',
    hover: 'twinkle',
    images: { art: 'assets/patterns/stars.svg' },
  },
  /* ── HALLOWED — new in 1.5.0 ────────────────────────────────────── */
  {
    id: 'hallowed',
    name: 'Hallowed',
    weight: 240,
    tier: 8,
    colors: ['#fef3c7', '#fde68a', '#fffbeb'],
    glow: 'rgba(254,243,199,0.6)',
    font: 'Poiret One',
    icon: 'cross',
    hover: 'twinkle',
    speed: 0.85,
},

  /* ── PRISMATIC — new in 1.3.0 ───────────────────────────────────────── */
  {
    id: 'prismatic',
    name: 'Prismatic',
    weight: 220,
    tier: 8,
    colors: ['#f0abfc', '#67e8f9', '#fde047'],
    glow: 'rgba(240,171,252,0.65)',
    font: 'Playfair Display',
    icon: 'pixelstar',
    hover: 'hue',
    speed: 0.85,
  },

  /* ── DIVINE ─────────────────────────────────────────────────────────── */
  {
    id: 'divine',
    name: 'Divine',
    weight: 50,
    tier: 9,
    colors: ['#ff5f6d', '#ffc371', '#7ee8fa'],
    glow: 'rgba(255,191,105,0.7)',
    font: 'Monoton',
    icon: 'star8',
    hover: 'hue',
    speed: 0.9,
  },
  /* ── OMEGA — new in 1.5.0 ────────────────────────────────────── */
  {
    id: 'omega',
    name: 'Omega',
    weight: 25,
    tier: 9,
    colors: ['#ff5f6d', '#ffc371', '#ffffff'],
    glow: 'rgba(255,95,109,0.7)',
    font: 'Orbitron',
    icon: 'star8',
    hover: 'hue',
    speed: 0.9,
},

  /* ============================================================================
     TEMPLATE — copy everything between the lines, paste above, edit:

     {
       id: 'myrarity',            // unique, lowercase, no spaces
       name: 'MyRarity',          // display name (also the changelog magic word)
       weight: 1000,              // tickets out of the pool (1000 ≈ 1%)
       tier: 5,                   // 1-9+, scales the reveal
       colors: ['#ff6b6b', '#c92a2a', '#ffc9c9'],  // gradient stops
       glow: 'rgba(255,107,107,0.55)',
       font: 'Bebas Neue',        // any family from css/fonts.css
       icon: 'burst',             // optional: stage shape (see list above)
       hover: 'sheen',            // optional: card hover effect
       speed: 1,                  // optional: animation speed (lower = slower)
       images: {                  // optional: image layers
         art: 'assets/patterns/stars.svg',
       },
     },
     ============================================================================ */
];
