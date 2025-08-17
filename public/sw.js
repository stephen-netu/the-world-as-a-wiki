/*
  Minimal, fast Service Worker for the Living Codex
  - Versioned caches
  - NavigationPreload
  - Stale-while-revalidate for static assets
  - Network-first for HTML navigations
  - Draft channel scaffolding (IndexedDB) for future overlay
*/
/* eslint-disable no-restricted-globals */

const VERSION = 'v1';
const ASSET_CACHE = `CACHE_${VERSION}_assets`;
const PAGE_CACHE = `CACHE_${VERSION}_pages`;
// --- Lightweight SW metrics (in-memory only) ---
let __swFirstFetchMarked = false;
const __swMetrics = {
  fetchCount: 0,
  lastFetchMs: 0,
  totalFetchMs: 0,
};

function markFirstFetch() {
  if (!__swFirstFetchMarked) {
    try { performance.mark('sw:firstFetch'); } catch {}
    __swFirstFetchMarked = true;
  }
}

async function timedFetch(run) {
  const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const res = await run();
  const t1 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
  const dt = Math.max(0, t1 - t0);
  __swMetrics.fetchCount += 1;
  __swMetrics.lastFetchMs = dt;
  __swMetrics.totalFetchMs += dt;
  return res;
}

self.addEventListener('install', (event) => {
  // Precache nothing by default; keep install fast
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.includes(VERSION)).map(k => caches.delete(k)));
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    if ('navigationPreload' in self.registration) {
      try { await self.registration.navigationPreload.enable(); } catch {}
    }
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => !k.includes(VERSION)).map(k => caches.delete(k)));
    await self.clients.claim();
    // Notify clients of activation (for optional logging/UI)
    try {
      const all = await self.clients.matchAll({ includeUncontrolled: true });
      all.forEach(c => c.postMessage({ type: 'sw:activated', payload: { version: VERSION } }));
    } catch {}
  })());
});

// Simple routers
const isAsset = (url) => /\.(css|js|mjs|png|jpg|jpeg|gif|svg|webp|woff2?)$/i.test(url.pathname);
const isHTMLRequest = (request) => request.mode === 'navigate' || (request.headers.get('accept') || '').includes('text/html');

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Crawler bypass (very light heuristic). Adjust in app if needed.
  const ua = req.headers.get('user-agent') || '';
  const isBot = /bot|crawler|spider|crawling/i.test(ua);
  if (isBot) return; // let network handle normally

  // Assets: stale-while-revalidate
  if (isAsset(url)) {
    event.respondWith((async () => {
      markFirstFetch();
      const cache = await caches.open(ASSET_CACHE);
      const cached = await cache.match(req);
      const fetchPromise = timedFetch(async () => {
        const res = await fetch(req);
        cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })());
    return;
  }

  // HTML: network-first with cache fallback and NavigationPreload
  if (isHTMLRequest(req)) {
    event.respondWith((async () => {
      markFirstFetch();
      try {
        const preload = await event.preloadResponse;
        if (preload) return preload;
        const fresh = await timedFetch(async () => fetch(req));
        const cache = await caches.open(PAGE_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (e) {
        const cache = await caches.open(PAGE_CACHE);
        const cached = await cache.match(req);
        if (cached) return cached;
        return new Response('<!doctype html><meta charset="utf-8"><title>Offline</title><h1>Offline</h1><p>No cached copy available.</p>', { headers: { 'Content-Type': 'text/html' } });
      }
    })());
  }
});

// --- Draft overlay scaffolding (IndexedDB) ---
// Minimal IDB helpers
function idbOpen(dbName, version = 1) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(dbName, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'slug' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutDraft(draft) {
  const db = await idbOpen('lc-drafts', 1);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readwrite');
    tx.objectStore('drafts').put(draft);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGetDraft(slug) {
  const db = await idbOpen('lc-drafts', 1);
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', 'readonly');
    const req = tx.objectStore('drafts').get(slug);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  if (type === 'save-draft' && payload && payload.slug) {
    // payload: { slug, markdown, updatedAt }
    idbPutDraft(payload).catch(() => {});
  }
  if (type === 'clear-draft' && payload && payload.slug) {
    idbOpen('lc-drafts', 1).then((db) => {
      const tx = db.transaction('drafts', 'readwrite');
      tx.objectStore('drafts').delete(payload.slug);
    }).catch(() => {});
  }
  // --- Update banner contract & metrics ---
  if (type === 'sw:skipWaiting') {
    // Only call after explicit user confirmation in the page.
    // Page should then reload when it gets 'sw:activated' from the new SW.
    try { self.skipWaiting(); } catch {}
    try { event.source && event.source.postMessage({ type: 'sw:skipping' }); } catch {}
  }
  if (type === 'sw:getVersion') {
    try { event.source && event.source.postMessage({ type: 'sw:version', payload: { version: VERSION } }); } catch {}
  }
  if (type === 'sw:metrics:get') {
    const avg = __swMetrics.fetchCount ? (__swMetrics.totalFetchMs / __swMetrics.fetchCount) : 0;
    try {
      event.source && event.source.postMessage({
        type: 'sw:metrics',
        payload: { ...__swMetrics, avgFetchMs: avg }
      });
    } catch {}
  }
});

// NOTE: Draft HTML injection will be wired in a later step to ensure
// zero-regression to initial performance. This skeleton prioritizes
// speed and correctness for caching/navigation.
