/* ============================================================
   RARITY DEFINITIONS
   Each rarity owns: weight (1 in 100,000), tier (effect scale),
   gradient colors, glow color, its own typeface from the font
   library, a basic-shape icon, optional image slots, and odds.
   ============================================================ */

const RARITIES = [
  {
    id: 'common',
    name: 'Common',
    weight: 50000,
    tier: 1,
    colors: ['#9aa3ad', '#64748b', '#aeb6c2'],
    glow: 'rgba(154,163,173,0.4)',
    font: 'Space Grotesk',
    icon: 'circle',
    speed: 1.4,
  },
  {
    id: 'uncommon',
    name: 'Uncommon',
    weight: 25000,
    tier: 2,
    colors: ['#4ade80', '#16a34a', '#86efac'],
    glow: 'rgba(74,222,128,0.45)',
    font: 'Chakra Petch',
    icon: 'triangle',
    speed: 1.25,
  },
  {
    id: 'rare',
    name: 'Rare',
    weight: 12000,
    tier: 3,
    colors: ['#60a5fa', '#2563eb', '#93c5fd'],
    glow: 'rgba(96,165,250,0.55)',
    font: 'Michroma',
    icon: 'diamond',
  },
  {
    id: 'epic',
    name: 'Epic',
    weight: 7000,
    tier: 4,
    colors: ['#c084fc', '#7c3aed', '#e9d5ff'],
    glow: 'rgba(192,132,252,0.55)',
    font: 'Syne',
    icon: 'pentagon',
  },
  {
    id: 'legendary',
    name: 'Legendary',
    weight: 3000,
    tier: 5,
    colors: ['#fbbf24', '#f97316', '#fde68a'],
    glow: 'rgba(251,191,36,0.6)',
    font: 'Cinzel',
    icon: 'star5',
  },
  {
    id: 'mythic',
    name: 'Mythic',
    weight: 1800,
    tier: 6,
    colors: ['#f472b6', '#e11d48', '#fda4af'],
    glow: 'rgba(244,114,182,0.6)',
    font: 'Grenze Gotisch',
    icon: 'hexagon',
  },
  {
    id: 'exotic',
    name: 'Exotic',
    weight: 800,
    tier: 7,
    colors: ['#22d3ee', '#06b6d4', '#a5f3fc'],
    glow: 'rgba(34,211,238,0.6)',
    font: 'Audiowide',
    icon: 'ring',
    images: { art: 'assets/patterns/grid.svg' },
  },
  {
    id: 'celestial',
    name: 'Celestial',
    weight: 350,
    tier: 8,
    colors: ['#e0e7ff', '#8b5cf6', '#c4b5fd'],
    glow: 'rgba(139,92,246,0.65)',
    font: 'Syncopate',
    icon: 'star4',
    images: { art: 'assets/patterns/stars.svg' },
  },
  {
    id: 'divine',
    name: 'Divine',
    weight: 50,
    tier: 9,
    colors: ['#ff5f6d', '#ffc371', '#7ee8fa'],
    glow: 'rgba(255,191,105,0.7)',
    font: 'Monoton',
    icon: 'star8',
  },
];

const TOTAL_WEIGHT = RARITIES.reduce((s, r) => s + r.weight, 0); // 100,000

/* ---------- helpers ---------- */
function getRarity(id) {
  return RARITIES.find((r) => r.id === id);
}

function rarityOdds(r) {
  const pct = (r.weight / TOTAL_WEIGHT) * 100;
  if (pct >= 1) return `1 in ${Math.round(TOTAL_WEIGHT / r.weight)} rolls (~${pct.toFixed(1)}%)`;
  return `1 in ${Math.round(TOTAL_WEIGHT / r.weight)} rolls (${pct.toFixed(2)}%)`;
}

/* Cryptographically fair weighted pick */
function rollRarity() {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  const roll = (buf[0] * 4294967296 + buf[1]) / 18446744073709551616; // [0,1)
  let target = roll * TOTAL_WEIGHT;
  for (const r of RARITIES) {
    target -= r.weight;
    if (target < 0) return r;
  }
  return RARITIES[0];
}
