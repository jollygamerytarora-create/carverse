'use client';

/**
 * ONE-GO ASSET STREAMER (§14 — progressive loading + caching).
 *
 * Streams every registered vehicle asset over the network at boot with a real
 * byte-level progress signal (consumed by the Boot screen / HUD chip). The
 * bytes land in THREE.Cache — three's FileLoader caches the ARRAYBUFFER
 * (not a parsed scene) — so useGLTF later parses ONLY the car you actually
 * visit, straight from cache: zero re-download, no boot-time parse storm,
 * bounded memory (one parsed model at a time, GC'd when you leave the car).
 *
 * Earlier revisions parsed each GLB at boot, which retained every model's
 * scene graph + textures simultaneously and made the whole site laggy once
 * the library grew to 70+ assets.
 */

import * as THREE from 'three';
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
    // FileLoader.load(url, onLoad, onProgress, onError)
    loader.load(
      url,
      () => resolve(),
      (evt) => onBytes(evt.loaded, evt.total || 0),
      (err) => reject(err)
    );
  });
}

export function startPreload() {
  if (started || typeof window === 'undefined') return;
  started = true;

  const list = urls();
  state.total = list.length;
  state.ready = list.length === 0;
  emit();
  if (!list.length) return;

  // sequential downloads: early cars arrive fast, the progress bar behaves
  // like a stream, and we never burst 70+ parallel sockets
  (async () => {
    for (const item of list) {
      state.current = item.label;
      emit();
      let fileLoaded = 0;
      try {
        await streamOne(item.url, (loaded, total) => {
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
      // yield to the main thread so streaming never competes with interaction
      await new Promise((r) => setTimeout(r, 60));
    }
    state.ready = true;
    state.current = '';
    emit();
  })();
}
