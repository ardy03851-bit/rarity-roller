/* ============================================================
   STORAGE — durable, self-verifying rarity collection saves.
   Strategy (defense in depth, so the browser "remembers"):
     1. localStorage  — fast primary copy, checksum-signed
     2. IndexedDB    — independent mirror, survives localStorage
                        eviction/clears of a single store
     3. Storage Persistence API — asks the browser to never
                        evict this origin's data
     4. On load: verify checksums, pick the healthiest copy,
        and re-heal whichever store is missing or corrupt.
   ============================================================ */
(() => {
  'use strict';

  const KEY = 'rarity-roller.save.v1';
  const DB_NAME = 'rarity-roller';
  const STORE = 'saves';
  const ID = 'main';
  const SALT = 'rarity-roller::v1::fx';

  /* ---------- checksum (FNV-1a) ---------- */
  function sign(payload) {
    const str = JSON.stringify(payload) + SALT;
    let h1 = 0x811c9dc5;
    let h2 = 0x01000193;
    for (let i = 0; i < str.length; i++) {
      h1 ^= str.charCodeAt(i);
      h1 = Math.imul(h1, 16777619) >>> 0;
      h2 = (h2 + Math.imul(str.charCodeAt(i) + i, 2654435761)) >>> 0;
    }
    return `${h1.toString(16)}-${h2.toString(16)}`;
  }

  function verify(wrapped) {
    if (!wrapped || typeof wrapped !== 'object') return false;
    if (!wrapped.data || typeof wrapped.data !== 'object') return false;
    return sign(wrapped.data) === wrapped.sig;
  }

  /* ---------- default save ---------- */
  function defaultSave() {
    return {
      version: 1,
      totalRolls: 0,
      counts: {},          // rarity id -> times rolled
      seen: [],            // rarity ids whose inventory card has been viewed
      bestTier: 0,        // highest tier ever rolled
      bestId: null,       // id of that rarity
      lastId: null,        // last rarity rolled
      lastAt: 0,
      history: [],        // recent rolls: [{ id, at }]
    };
  }

  /* ---------- IndexedDB (mirror) ---------- */
  function idb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('no idb'));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet() {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(ID);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbSet(wrapped) {
    const db = await idb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(wrapped, ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  /* ---------- availability probes (sandboxed iframes block storage) ---------- */
  let lsOK = true;
  try {
    localStorage.setItem('rr.probe', '1');
    localStorage.removeItem('rr.probe');
  } catch {
    lsOK = false;
  }

  let memory = null; // in-memory fallback when no storage is available

  /* ---------- persistence request ---------- */
  async function requestPersistence() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persisted().then(async (already) => {
          if (!already) await navigator.storage.persist().catch(() => {});
        });
      }
    } catch { /* not supported — fine */ }
  }

  /* ---------- read: collect candidates, verify, pick best ---------- */
  async function readSave() {
    const candidates = [];

    if (lsOK) {
      try {
        const raw = localStorage.getItem(KEY);
        if (raw) {
          const wrapped = JSON.parse(raw);
          if (verify(wrapped)) candidates.push(wrapped.data);
        }
      } catch { /* corrupted primary — ignore */ }
    }

    try {
      const wrapped = await idbGet();
      if (verify(wrapped)) candidates.push(wrapped.data);
    } catch { /* idb unavailable */ }

    if (!candidates.length) return null;

    // healthiest = valid + most total rolls
    candidates.sort((a, b) => (b.totalRolls || 0) - (a.totalRolls || 0));
    return candidates[0];
  }

  /* ---------- write: both stores, fire-and-forget ---------- */
  function writeSave(save) {
    const wrapped = { data: save, sig: sign(save), at: Date.now() };
    memory = wrapped;

    if (lsOK) {
      try {
        localStorage.setItem(KEY, JSON.stringify(wrapped));
      } catch { /* quota — mirror still holds it */ }
    }

    idbSet(wrapped).catch(() => { /* idb down — localStorage holds it */ });
  }

  /* ---------- debounce writes ---------- */
  let timer = null;
  function flush(save) {
    clearTimeout(timer);
    timer = setTimeout(() => writeSave(save), 120);
  }

  /* ============================================================
     PUBLIC API
     ============================================================ */
  const Storage = {
    async init() {
      requestPersistence();
      const save = await readSave();
      if (save) {
        // heal whichever store was missing/corrupt
        writeSave(save);
        return save;
      }
      const fresh = defaultSave();
      writeSave(fresh);
      return fresh;
    },

    /** record a rolled rarity immediately (important rolls flush sync-ish) */
    record(rarity) {
      const s = this.current;
      s.totalRolls++;
      s.counts[rarity.id] = (s.counts[rarity.id] || 0) + 1;
      s.lastId = rarity.id;
      s.lastAt = Date.now();
      if (rarity.tier > s.bestTier) {
        s.bestTier = rarity.tier;
        s.bestId = rarity.id;
      }
      s.history.unshift({ id: rarity.id, at: s.lastAt });
      if (s.history.length > 40) s.history.length = 40;
      flush(s);
      return s;
    },

    markSeen(rarityId) {
      const s = this.current;
      if (!s.seen.includes(rarityId)) {
        s.seen.push(rarityId);
        flush(s);
      }
    },

    flushNow() {
      clearTimeout(timer);
      if (this.current) writeSave(this.current);
    },

    current: null,

    /** export save as a JSON string (backup / transfer) */
    export() {
      return JSON.stringify({ data: this.current, sig: sign(this.current) }, null, 2);
    },
  };

  // ensure "this" works in record()
  Storage.record = Storage.record.bind(Storage);
  Storage.markSeen = Storage.markSeen.bind(Storage);

  /* last-chance flush when leaving the page */
  addEventListener('pagehide', () => Storage.flushNow());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') Storage.flushNow();
  });

  window.RRStorage = Storage;
})();
