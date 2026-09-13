import { create } from 'zustand';
import { Vehicle } from '@/lib/types';
import { VEHICLES, vehicleById, vehiclesByBrand } from '@/data';
import { pushFavorite, removeFavorite } from '@/lib/cloud';
import type { CvUser } from '@/lib/auth';

/** The signed-in user whose garage mirrors to Supabase. Set by CarverseApp on
 *  session restore; null = guest (garage stays device-local). */
let cloudUser: CvUser | null = null;
export function setCloudUser(u: CvUser | null) {
  cloudUser = u;
}
export function getCloudUser(): CvUser | null {
  return cloudUser;
}

export type View = 'brand' | 'car';
export type Mode =
  | null
  | 'info'
  | 'funfact'
  | 'sound'
  | 'analytics'
  | 'compare'
  | 'configure'
  | '360'
  | 'interior'
  | 'search'
  | 'discover'
  | 'catresults'
  | 'garage'
  | 'requests'
  | 'history'
  | 'brandpage';

interface CarverseState {
  view: View;
  brandIndex: number;
  carIndex: number;
  mode: Mode;
  categoryId: string | null;
  compareLeftId: string;
  compareRightId: string;
  garage: string[];
  selectedColorIndex: number;
  aiOpen: boolean;
  soundOn: boolean;
  lastCarId: string | null;
  configurator: { wheel: number; interior: number; trim: number; pack: number };
  interiorView: 'cockpit' | 'dash' | 'driver' | 'rear';
  setInteriorView: (v: 'cockpit' | 'dash' | 'driver' | 'rear') => void;
  creditsOpen: boolean;
  setCreditsOpen: (open: boolean) => void;

  setBrand: (i: number) => void;
  nextBrand: () => void;
  prevBrand: () => void;
  setCar: (i: number) => void;
  nextCar: () => void;
  prevCar: () => void;
  setMode: (m: Mode) => void;
  openBrand: (id: string) => void;
  selectVehicle: (id: string) => void;
  openCategory: (id: string) => void;
  toggleFavorite: (id: string) => void;
  setColorIndex: (i: number) => void;
  setAiOpen: (open: boolean) => void;
  setSoundOn: (on: boolean) => void;
  setCompare: (leftId: string, rightId: string) => void;
  setConfigOption: (key: 'wheel' | 'interior' | 'trim' | 'pack', i: number) => void;
  reset: () => void;
}

export const useStore = create<CarverseState>((set, get) => ({
  view: 'brand',
  brandIndex: 0,
  carIndex: 0,
  mode: null,
  categoryId: null,
  compareLeftId: 'bmw-m5',
  compareRightId: 'mercedes-amggt',
  garage: [],
  selectedColorIndex: 0,
  aiOpen: false,
  soundOn: true,
  lastCarId: null,
  configurator: { wheel: 0, interior: 0, trim: 0, pack: 0 },
  interiorView: 'cockpit',
  setInteriorView: (v) => set({ interiorView: v }),
  creditsOpen: false,
  setCreditsOpen: (open) => set({ creditsOpen: open }),

  setBrand: (i) =>
    set((s) => ({
      brandIndex: (i + BRAND_COUNT) % BRAND_COUNT,
      carIndex: 0,
      mode: null,
      categoryId: null,
    })),
  nextBrand: () => get().setBrand(get().brandIndex + 1),
  prevBrand: () => get().setBrand(get().brandIndex - 1),

  setCar: (i) =>
    set((s) => {
      const n = currentLineup().length;
      return {
        carIndex: (i + n) % n,
        mode: null,
        selectedColorIndex: 0,
        configurator: { wheel: 0, interior: 0, trim: 0, pack: 0 },
        lastCarId: currentLineup()[(i + n) % n]?.id ?? s.lastCarId,
      };
    }),
  nextCar: () => get().setCar(get().carIndex + 1),
  prevCar: () => get().setCar(get().carIndex - 1),

  setMode: (m) => set({ mode: m }),

  openBrand: (id) =>
    set(() => {
      const idx = BRAND_IDS.indexOf(id);
      return { view: 'car', brandIndex: idx >= 0 ? idx : 0, carIndex: 0, mode: null, categoryId: null };
    }),

  selectVehicle: (id) =>
    set(() => {
      const v = vehicleById(id);
      if (!v) return {};
      const idx = BRAND_IDS.indexOf(v.brand);
      const lineup = vehiclesByBrand(v.brand);
      return {
        view: 'car',
        brandIndex: idx >= 0 ? idx : 0,
        carIndex: Math.max(0, lineup.findIndex((x) => x.id === id)),
        mode: null,
        categoryId: null,
        selectedColorIndex: 0,
        configurator: { wheel: 0, interior: 0, trim: 0, pack: 0 },
      };
    }),

  openCategory: (id) => set({ categoryId: id, mode: 'catresults' }),

  toggleFavorite: (id) =>
    set((s) => {
      const has = s.garage.includes(id);
      // mirror to the signed-in user's private garage (RLS-isolated); guests stay local
      if (cloudUser) {
        if (has) void removeFavorite(cloudUser.id, id);
        else void pushFavorite(cloudUser.id, id);
      }
      return { garage: has ? s.garage.filter((g) => g !== id) : [...s.garage, id] };
    }),

  setColorIndex: (i) => set({ selectedColorIndex: i }),
  setAiOpen: (open) => set({ aiOpen: open }),
  setSoundOn: (on) => set({ soundOn: on }),
  setCompare: (leftId, rightId) => set({ compareLeftId: leftId, compareRightId: rightId }),

  setConfigOption: (key, i) => set((s) => ({ configurator: { ...s.configurator, [key]: i } })),

  reset: () => set({ view: 'brand', mode: null, categoryId: null }),
}));

// ---- module-level helpers (kept outside state to avoid stale closures) ----
export const BRAND_IDS = ['bmw', 'mercedes', 'porsche', 'audi', 'ferrari', 'lamborghini', 'mclaren', 'toyota', 'nissan', 'tesla', 'ford', 'maruti', 'tata', 'mahindra', 'rolls'];
export const BRAND_COUNT = BRAND_IDS.length;

export function currentBrandId(): string {
  const { brandIndex } = useStore.getState();
  return BRAND_IDS[(brandIndex + BRAND_COUNT) % BRAND_COUNT];
}

export function currentLineup(): Vehicle[] {
  return vehiclesByBrand(currentBrandId());
}

export function currentVehicle(): Vehicle {
  const state = useStore.getState();
  const lineup = currentLineup();
  const idx = (state.carIndex + lineup.length) % Math.max(1, lineup.length);
  return lineup[idx] ?? VEHICLES[0];
}

// debug handle (harmless in production, invaluable for diagnosing UI state)
if (typeof window !== 'undefined') {
  (window as unknown as { __cv: typeof useStore }).__cv = useStore;
}
