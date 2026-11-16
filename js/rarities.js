/* ============================================================
   RARITY SYSTEM — resolves RARITY_CONFIG (js/rarities.config.js)
   with safe defaults, so a partial config entry still looks
   intentional. Edit the config file, never this one.
   ============================================================ */

/* RARITY_CONFIG is declared in js/rarities.config.js and is in the
   shared global lexical scope of classic scripts */
const RARITIES = (typeof RARITY_CONFIG !== 'undefined' ? RARITY_CONFIG : []).map((r, i) => ({
  id: r.id || `rarity-${i}`,
  name: r.name || r.id || 'Unknown',
  weight: Math.max(1, r.weight || 1000),
  tier: Math.min(12, Math.max(1, r.tier || 1)),
  colors: (r.colors && r.colors.length ? r.colors : ['#9aa3ad', '#64748b', '#aeb6c2']).slice(0, 3),
  glow: r.glow || 'rgba(154,163,173,0.4)',
  font: r.font || 'Sora',
  icon: r.icon || 'circle',
  hover: r.hover || 'lift',
  speed: r.speed || 1,
  images: r.images || null,
}));

const TOTAL_WEIGHT = RARITIES.reduce((s, r) => s + r.weight, 0);

/* ---------- helpers ---------- */
function getRarity(id) {
  return RARITIES.find((r) => r.id === id);
}

function rarityOdds(r) {
  const one = Math.round(TOTAL_WEIGHT / r.weight);
  return `1 in ${one.toLocaleString()}`;
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
