'use client';

/**
 * PRIORITY ASSET STREAMER (§14 — progressive loading + caching, 2.0).
 *
 * Design goals (device-safe by construction):
 *  1. The car/brand the visitor is LOOKING at always loads first (priority lane).
 *  2. Everything else trickles in sequentially, one file at a time, with
 *     yields — never a burst of parallel sockets, never a main-thread stall.
 *  3. THREE.Cache is kept under a byte budget. Buffers beyond the budget are
 *     evicted (LRU). Compressed GLBs re-fetch instantly from the browser HTTP
 *     cache when needed again, so eviction costs nothing on real networks.
 *     This is what keeps a 680 MB fleet from becoming 680 MB of RSS.
 *  4. Fully suspendible: when the tab is hidden or the device is offline the
 *     queue pauses (battery + bandwidth friendly). Boot never blocks on it.
 */

import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import { ASSET_RECORDS } from '@/lib/assetRegistry';

THREE.Cache.enabled = true;

export type PreloadState = {
  total: number;
  done: number;
  bytes: number;
  bytesTotal: number;
  current: string;
  ready: boolean;
};

type Listener = (s: PreloadState) => void;

const state: PreloadState = { total: 0, done: 0, bytes: 0, bytesTotal: 0, current: '', ready: false };
const listeners = new Set<Listener>();
let started = false;

/** RAM budget for streamed GLB buffers (~320 MB — beyond this, LRU-evict). */
const CACHE_BUDGET = 320 * 1024 * 1024;
/** Same idea for parsed GLTF scenes held by drei's useGLTF cache. */
const PARSED_BUDGET = 12;

/** url → approximate byte size, maintained as buffers stream in. */
const cachedBytes = new Map<string, number>();
/** url → last-access tick for LRU eviction (both caches). */
const lastUse = new Map<string, number>();
let tick = 0;

function emit() {
  listeners.forEach((l) => l({ ...state }));
}

export function subscribePreload(l: Listener) {
  listeners.add(l);
  l({ ...state });
  return () => listeners.delete(l);
}

export function getPreloadState() {
  return { ...state };
}

/** Human label for the car currently streaming. */
export function preloadLabel(): string {
  return state.current;
}

/* ------------------------------------------------------------------ */
/* LRU bookkeeping                                                     */
/* ------------------------------------------------------------------ */

function touch(url: string) {
  lastUse.set(url, ++tick);
}

function evictIfNeeded() {
  let total = 0;
  cachedBytes.forEach((b) => (total += b));
  if (total <= CACHE_BUDGET) return;

  // candidates: cached arraybuffers, least-recently-used first
  const entries = [...cachedBytes.entries()].sort((a, b) => (lastUse.get(a[0]) ?? 0) - (lastUse.get(b[0]) ?? 0));
  for (const [url, size] of entries) {
    if (total <= CACHE_BUDGET) break;
    // never evict the buffer for a model that is currently mounted —
    // useGLTF's parsed copy is referenced anyway, eviction would just force
    // a pointless re-parse
    if (pinned.has(url)) continue;
    THREE.Cache.remove(url);
    cachedBytes.delete(url);
    total -= size;
  }
}

/** Parsed-scene cache trim (drei keeps every useGLTF result forever). */
export function trimParsedScenes(keepUrl?: string) {
  try {
    const entries = [...parsedSizes.entries()].sort((a, b) => (lastUse.get(a[0]) ?? 0) - (lastUse.get(b[0]) ?? 0));
    let excess = parsedSizes.size - PARSED_BUDGET;
    for (const [url] of entries) {
      if (excess <= 0) break;
      if (url === keepUrl || pinned.has(url)) continue;
      useGLTF.clear(url);
      parsedSizes.delete(url);
      excess -= 1;
    }
  } catch {
    /* cache internals unavailable — non-fatal */
  }
}

/** URLs whose buffers/parsed scenes are in active use (mounted models). */
const pinned = new Set<string>();
export function pinAsset(url: string) {
  pinned.add(url);
  touch(url);
}
export function unpinAsset(url: string) {
  pinned.delete(url);
  evictIfNeeded();
}

/** Record a parse so the parsed-scene LRU has data to work with. */
export function noteParsed(url: string, approxBytes: number) {
  parsedSizes.set(url, approxBytes);
  touch(url);
  trimParsedScenes(url);
}
const parsedSizes = new Map<string, number>();

/* ------------------------------------------------------------------ */
/* queue                                                               */
/* ------------------------------------------------------------------ */

type Job = { url: string; label: string; priority: number };
const queue: Job[] = [];
const queuedUrls = new Set<string>();
let draining = false;
let hidden = false;
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    hidden = document.hidden;
  });
}

function urls(): { url: string; label: string; bytes: number }[] {
  const out: { url: string; label: string; bytes: number }[] = [];
  for (const [id, a] of Object.entries(ASSET_RECORDS)) {
    if (a.model3D) {
      const rec = a as { _meta?: { bytes?: number } };
      out.push({ url: a.model3D, label: id, bytes: rec._meta?.bytes ?? 0 });
    }
    if (a.interiorModel3D) out.push({ url: a.interiorModel3D, label: `${id} interior`, bytes: 0 });
  }
  return out;
}

/**
 * Stream one file into THREE.Cache via FileLoader (arraybuffer) WITHOUT
 * parsing. FileLoader reports chunk-level progress and caches the buffer on
 * success, so a later GLTFLoader/useGLTF load of the same URL resolves from
 * cache with no network traffic.
 */
function streamOne(url: string, onBytes: (loaded: number, total: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const loader = new THREE.FileLoader();
    loader.setResponseType('arraybuffer');
    const cached = THREE.Cache.get(url);
    if (cached) {
      resolve();
      return;
    }
    loader.load(
      url,
      (data) => {
        const buf = data as ArrayBuffer;
        cachedBytes.set(url, buf.byteLength);
        touch(url);
        evictIfNeeded();
        resolve();
      },
      (evt) => onBytes(evt.loaded, evt.total || 0),
      (err) => reject(err),
    );
  });
}

/** Enqueue a URL at the front of the line (e.g. the car being visited). */
export function prioritizeAsset(url: string, label = 'vehicle') {
  if (!url || THREE.Cache.get(url) || queuedUrls.has(url)) {
    touch(url);
    return;
  }
  queue.unshift({ url, label, priority: 0 });
  queuedUrls.add(url);
  void drain();
}

function drain() {
  if (draining) return;
  draining = true;
  (async () => {
    while (queue.length) {
      // pause the whole pipeline while the tab is hidden or offline
      if (hidden || (typeof navigator !== 'undefined' && navigator.onLine === false)) {
        await new Promise((r) => setTimeout(r, 1500));
        continue;
      }
      const job = queue.shift()!;
      queuedUrls.delete(job.url);
      state.current = job.label;
      emit();
      let fileLoaded = 0;
      try {
        await streamOne(job.url, (loaded, total) => {
          state.bytes += Math.max(0, loaded - fileLoaded);
          fileLoaded = loaded;
          if (total) state.bytesTotal = Math.max(state.bytesTotal, total);
          emit();
        });
        state.done += 1;
      } catch {
        state.done += 1; // a failed asset never blocks the experience (§25)
      }
      emit();
      // yield so streaming never competes with interaction
      await new Promise((r) => setTimeout(r, 90));
    }
    state.ready = true;
    state.current = '';
    emit();
    draining = false;
  })();
}

export function startPreload() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const list = urls();
  // Low-tier devices (phones, ≤4 GB RAM, ≤4 cores): stream only a small
  // starter set (~60 MB) at boot. Everything else loads on visit through the
  // priority lane — no multi-hundred-MB background drain on mobile data or
  // constrained memory.
  const lowTier =
    (navigator as { deviceMemory?: number }).deviceMemory !== undefined && (navigator as { deviceMemory?: number }).deviceMemory! <= 4;
  const cores = navigator.hardwareConcurrency ?? 8;
  const isPhone = window.innerWidth < 760;
  const backgroundOnly = isPhone || lowTier || cores <= 4;

  const starter = backgroundOnly
    ? list.slice().sort((a, b) => a.bytes - b.bytes).reduce<typeof list>((acc, item) => {
        const accBytes = acc.reduce((s, x) => s + x.bytes, 0);
        if (accBytes < 60 * 1024 * 1024 && item.bytes <= 12 * 1024 * 1024) acc.push(item);
        return acc;
      }, [])
    : list;

  state.total = starter.length;
  state.ready = starter.length === 0;
  emit();
  if (!starter.length) return;

  // background lane: ordered small→large so visible progress accumulates
  // quickly; the priority lane (prioritizeAsset) cuts ahead.
  starter
    .slice()
    .sort((a, b) => a.bytes - b.bytes)
    .forEach((item) => {
      if (queuedUrls.has(item.url)) return;
      queuedUrls.add(item.url);
      queue.push({ url: item.url, label: item.label, priority: 1 });
    });
  void drain();
}
