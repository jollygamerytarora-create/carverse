'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useStore, currentLineup, currentVehicle, currentBrandId, BRAND_IDS } from '@/lib/store';
import { brandById } from '@/data/brands';
import { vehiclesByBrand } from '@/data';
import { Vehicle } from '@/lib/types';
import { HotspotInfo } from './three/CarModel';
import BrandLogo from './BrandLogo';
import { prefersReducedMotion, priceTag, usd } from '@/lib/utils';

const Showroom = dynamic(() => import('./three/Showroom'), { ssr: false });

/* ================= hero reveal ================= */

function HeroReveal({ brandName, modelName, trim, onDone }: { brandName: string; modelName: string; trim: string; onDone: () => void }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    const timers = [
      window.setTimeout(() => setStep(1), 650),
      window.setTimeout(() => setStep(2), 1350),
      window.setTimeout(() => setStep(3), 2100),
      window.setTimeout(() => setStep(4), 2750),
      window.setTimeout(() => onDone(), 3100),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="hero-reveal" aria-hidden={step >= 4}>
      <div className={`hr-line ${step >= 1 ? 'on' : ''}`}>{brandName}</div>
      <div className={`hr-line big ${step >= 2 ? 'on' : ''}`}>{modelName}</div>
      {trim && <div className={`hr-line small ${step >= 3 ? 'on' : ''}`}>{trim}</div>}
      {step >= 3 && <div className="hr-light-sweep" />}
    </div>
  );
}

/* ================= swipe hook ================= */

function useSwipe(
  onLeft: () => void,
  onRight: () => void,
  enabled = true
) {
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const down = (e: PointerEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('.sheet, .searchov, .modal, .ai-wrap, .dock, .navrail, .topbar, input, .compare-wrap, .cats, .garage-wrap, .hist-wrap, .config-wrap, .tl-track')) return;
      start.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    };
    const up = (e: PointerEvent) => {
      if (!start.current) return;
      const dx = e.clientX - start.current.x;
      const dy = e.clientY - start.current.y;
      const dt = performance.now() - start.current.t;
      start.current = null;
      if (dt > 700 || Math.abs(dy) > Math.abs(dx) * 1.4 || Math.abs(dx) < 56) return;
      if (dx < 0) onLeft();
      else onRight();
    };
    const wheel = (e: WheelEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('.sheet, .searchov, .modal, .ai-wrap, .compare-wrap, .cats, .garage-wrap, .hist-wrap, .config-wrap, .tl-track, .sheet-body')) return;
      // horizontal trackpad swipe navigates; vertical wheel is reserved for zoom in car view
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (e.deltaX > 24) onLeft();
        else if (e.deltaX < -24) onRight();
        return;
      }
    };
    const keys = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'ArrowLeft') onRight();
      if (e.key === 'ArrowRight') onLeft();
    };
    window.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('wheel', wheel, { passive: true });
    window.addEventListener('keydown', keys);
    return () => {
      window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', keys);
    };
  }, [enabled, onLeft, onRight]);
}

/* ================= brand view ================= */

function BrandView({
  accent,
  onSelect,
}: {
  accent: string;
  onSelect: (id: string) => void;
}) {
  const store = useStore();
  const brandId = BRAND_IDS[(store.brandIndex + BRAND_IDS.length) % BRAND_IDS.length];
  const brand = brandById(brandId)!;
  const idx = store.brandIndex;
  const prev = brandById(BRAND_IDS[(idx - 1 + BRAND_IDS.length) % BRAND_IDS.length])!;
  const next = brandById(BRAND_IDS[(idx + 1) % BRAND_IDS.length])!;
  const [dir, setDir] = useState(0);
  const [tick, setTick] = useState(0);
  const lineupCount = vehiclesByBrand(brand.id).length;

  const go = useCallback((d: number) => {
    setDir(d);
    setTick((t) => t + 1);
    store.setBrand(store.brandIndex + d);
  }, [store]);

  useSwipe(
    () => go(1),
    () => go(-1),
    store.view === 'brand' && !store.mode
  );

  const select = () => {
    setDir(0);
    onSelect(brand.id);
  };

  useEffect(() => {
    setDir(0);
  }, [brand.id]);

  return (
    <div className="brandview" key={tick} aria-live="polite">
      {/* edge brand logos — depth ghosts */}
      <button className={`bv-ghost left ${dir !== 0 ? 'push' : ''}`} onClick={() => go(-1)} aria-label={`Go to ${prev.name}`}>
        <BrandLogo id={prev.id} />
        <span className="bv-ghost-name">{prev.name}</span>
      </button>
      <button className={`bv-ghost right ${dir !== 0 ? 'push' : ''}`} onClick={() => go(1)} aria-label={`Go to ${next.name}`}>
        <BrandLogo id={next.id} />
        <span className="bv-ghost-name">{next.name}</span>
      </button>

      {/* active brand logo */}
      <button
        className={`bv-logo-wrap ${dir === 1 ? 'from-left' : dir === -1 ? 'from-right' : ''}`}
        onClick={select}
        aria-label={`Explore ${brand.name} lineup`}
        style={{ color: accent }}
      >
        <BrandLogo id={brand.id} className="bv-logo" />
      </button>

      <h1 className="bv-name" key={brand.id}>{brand.name}</h1>
      {brand.fullName && <div className="bv-fullname">{brand.fullName}</div>}
      <div className="bv-meta">
        <span>{brand.country}</span>
        <i />
        <span>Founded {brand.founded}</span>
        <i />
        <span>{lineupCount} models</span>
      </div>
      <p className="bv-desc">{brand.description}</p>
      <button className="ghostbtn bv-cta" onClick={select}>
        Explore the lineup
        <span className="bv-cta-arrow">↓</span>
      </button>
    </div>
  );
}

/* ================= brand zoom transition ================= */

function BrandZoom({ brandId }: { brandId: string }) {
  const brand = brandById(brandId);
  if (!brand) return null;
  return (
    <div className="brandzoom" aria-hidden="true">
      <div className="bz-halo" style={{ background: `radial-gradient(circle at 50% 46%, ${brand.accent}33 0%, transparent 55%)` }} />
      <BrandLogo id={brand.id} style={{ color: brand.accent }} className="bz-logo" />
      <div className="bz-name">{brand.name}</div>
    </div>
  );
}

/* ================= car HUD ================= */

function CarHud({ vehicle, accent }: { vehicle: Vehicle; accent: string }) {
  const store = useStore();
  const fav = store.garage.includes(vehicle.id);
  return (
    <>
      <div className="hudcar">
        <div className="k brand">{brandById(vehicle.brand)?.name ?? vehicle.brand}</div>
        <h1 key={vehicle.id}>{vehicle.model}</h1>
        {vehicle.trim && <span className="trim">{vehicle.trim}</span>}
        <div className="hudprice" title="Demo price — indicative USD & INR">
          <span className="p-usd">{usd(vehicle.price)}</span>
          <span className="p-inr">{priceTag(vehicle.price).split(' · ')[1]}</span>
        </div>
        <div className="hudspec">
          <div className="spec"><div className="v">{vehicle.horsepower}<small>HP</small></div><div className="k">Power</div></div>
          <div className="spec"><div className="v">{vehicle.torque}<small>NM</small></div><div className="k">Torque</div></div>
          <div className="spec"><div className="v">{vehicle.acceleration}<small>SEC</small></div><div className="k">0–100</div></div>
          <div className="spec"><div className="v">{vehicle.topSpeed}<small>KM/H</small></div><div className="k">Top speed</div></div>
        </div>
      </div>
      <div className="hudyear"><div className="y">{vehicle.year}</div></div>
      <div className="hudbrand-hint">
        <div className="row"><b>←/→</b> or drag to switch</div>
        <div className="row">Drag scene to orbit · Scroll to zoom</div>
        <div className="row">Click the car to inspect hotspots</div>
      </div>
      <button
        className={`iconbtn fav ${fav ? 'active' : ''}`}
        style={{ position: 'absolute', right: 24, top: 76 }}
        onClick={() => store.toggleFavorite(vehicle.id)}
        aria-label={fav ? 'Remove from My Garage' : 'Save to My Garage'}
      >
        {fav ? '★' : '☆'}
      </button>
    </>
  );
}

/* ================= car mode dock ================= */

const MODES: { id: NonNullable<import('@/lib/store').Mode>; label: string }[] = [
  { id: 'info', label: 'Info' },
  { id: 'funfact', label: 'Fun Fact' },
  { id: 'interior', label: 'Interior' },
  { id: 'sound', label: 'Sound' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'compare', label: 'Compare' },
  { id: 'configure', label: 'Configure' },
  { id: '360', label: '360°' },
];

function ModeDock() {
  const store = useStore();
  if (store.view !== 'car' || ['search', 'discover', 'garage', 'history', 'catresults', 'compare'].includes(store.mode ?? '')) return null;
  return (
    <nav className="dock" aria-label="Vehicle modes">
      {MODES.map((m) => (
        <button
          key={m.id}
          className={`dockbtn ${store.mode === m.id ? 'on' : ''}`}
          onClick={() => store.setMode(store.mode === m.id ? null : m.id)}
        >
          {m.label}
        </button>
      ))}
    </nav>
  );
}

/* ================= main World ================= */

export default function World() {
  const store = useStore();
  const [heroDone, setHeroDone] = useState(true);
  const [heroBrand, setHeroBrand] = useState<string | null>(null);
  const [hotspot, setHotspot] = useState<HotspotInfo | null>(null);
  const [transition, setTransition] = useState<null | { dir: number }>(null);
  const [preset360, setPreset360] = useState<'front' | 'side' | 'rear' | 'top' | null>(null);
  const interiorView = useStore((s) => s.interiorView);
  const setInteriorView = useStore((s) => s.setInteriorView);
  const [zoomBrand, setZoomBrand] = useState<string | null>(null);

  const selectBrand = useCallback(
    (id: string) => {
      if (zoomBrand) return;
      setZoomBrand(id);
      window.setTimeout(() => store.openBrand(id), 1500);
      window.setTimeout(() => setZoomBrand(null), 2150);
    },
    [zoomBrand, store]
  );

  const brand = brandById(BRAND_IDS[(store.brandIndex + BRAND_IDS.length) % BRAND_IDS.length])!;
  const lineup = currentLineup();
  const vehicle = currentVehicle();
  const isCarView = store.view === 'car';
  const reduced = useMemo(() => prefersReducedMotion(), []);

  // hero reveal when entering a brand's lineup (not on every car swipe)
  useEffect(() => {
    if (isCarView && heroBrand !== brand.id) {
      setHeroBrand(brand.id);
      if (!reduced) {
        setHeroDone(false);
        const t = window.setTimeout(() => setHeroDone(true), 3100);
        return () => window.clearTimeout(t);
      }
      setHeroDone(true);
    }
    if (!isCarView) setHeroDone(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCarView, brand.id]);

  // hotspot auto-dismiss
  useEffect(() => {
    if (!hotspot) return;
    const t = window.setTimeout(() => setHotspot(null), 2600);
    return () => window.clearTimeout(t);
  }, [hotspot]);

  // navigation with transition
  const go = useCallback(
    (dir: number) => {
      if (transition) return;
      setTransition({ dir });
      window.setTimeout(() => {
        if (dir > 0) store.nextCar();
        else store.prevCar();
        setHotspot(null);
        window.setTimeout(() => setTransition(null), 60);
      }, 280);
    },
    [transition, store]
  );

  useSwipe(
    () => go(1),
    () => go(-1),
    isCarView && !store.mode && !zoomBrand
  );

  // live paint
  const paint = vehicle.colors[store.selectedColorIndex]?.hex ?? '#7a828c';

  // ---------- showroom configs per mode ----------
  // pick the most vivid available colour so the hero never disappears into the dark set
  // favours saturated mid-luminance paints (blues, greens, reds) over whites/yellows
  const vividPaint = (v: Vehicle): string => {
    const vividness = (hex: string) => {
      const c = hex.replace('#', '');
      const r = parseInt(c.slice(0, 2), 16) / 255;
      const g = parseInt(c.slice(2, 4), 16) / 255;
      const b = parseInt(c.slice(4, 6), 16) / 255;
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const sat = max === 0 ? 0 : (max - min) / max;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      return sat * 0.85 + (1 - Math.min(1, Math.abs(lum - 0.45) * 2)) * 0.3;
    };
    return v.colors.reduce((best, c) => (vividness(c.hex) > vividness(best) ? c.hex : best), v.colors[0]?.hex ?? '#7a828c');
  };
  const displayPaint = isCarView ? paint : vividPaint(vehicle);

  let cars: import('./three/Showroom').CarConfig[] = [];

  if (!isCarView) {
    // brand view: ghost silhouettes of prev / current / next brand hero cars
    const ghostOf = (bid: string): Vehicle | undefined => {
      const b = brandById(bid);
      return b ? lineupOf(b.id)[0] : undefined;
    };
    cars = [
      ...(ghostOf(BRAND_IDS[(store.brandIndex - 1 + BRAND_IDS.length) % BRAND_IDS.length])
        ? [{ vehicle: ghostOf(BRAND_IDS[(store.brandIndex - 1 + BRAND_IDS.length) % BRAND_IDS.length])!, ghost: true, offset: [-17, 0, -3] as [number, number, number], rotY: 0.35, enterFrom: 0, useGltf: false }]
        : []),
      ...(lineup[0]
        ? [{ vehicle: lineup[0], paint: vividPaint(lineup[0]), accent: brand.accent, lightsOn: true, hotspots: false, enterFrom: 0, useGltf: true }]
        : []),
      ...(ghostOf(BRAND_IDS[(store.brandIndex + 1) % BRAND_IDS.length])
        ? [{ vehicle: ghostOf(BRAND_IDS[(store.brandIndex + 1) % BRAND_IDS.length])!, ghost: true, offset: [17, 0, -3] as [number, number, number], rotY: -0.35, enterFrom: 0, useGltf: false }]
        : []),
    ];
  } else if (store.mode === 'compare') {
    cars = []; // compare mode renders its own canvas
  } else if (store.mode === 'interior') {
    cars = [{ vehicle, paint: displayPaint, accent: brand.accent, lightsOn: true, hotspots: true, enterFrom: 0, useGltf: false }];
  } else if (store.mode === 'configure') {
    cars = [{ vehicle, paint, accent: brand.accent, lightsOn: heroDone, hotspots: false, enterFrom: 0, wheelStyle: CONFIG_WHEELS[store.configurator.wheel] ?? undefined }];
  } else if (transition) {
    cars = [{ vehicle, paint: displayPaint, accent: brand.accent, lightsOn: heroDone, hotspots: !transition, enterFrom: transition.dir * 9, exitTo: undefined, useGltf: true }];
  } else {
    cars = [{ vehicle, paint: displayPaint, accent: brand.accent, lightsOn: heroDone, hotspots: true, enterFrom: 0, useGltf: true }];
  }

  const in360 = store.mode === '360';
  const dim = !!store.mode && store.mode !== 'interior' && !in360 && store.mode !== 'configure';
  const envAccent = brand.accent;

  const showMainCanvas = store.mode !== 'compare';

  return (
    <>
      {showMainCanvas && (
        <Showroom
          cars={cars}
          envAccent={envAccent}
          autoRotate={!hotspot && (!store.mode || (in360 && !preset360)) && heroDone && !transition}
          interior={store.mode === 'interior'}
          interiorView={store.mode === 'interior' ? interiorView : null}
          preset={in360 ? preset360 : null}
          dim={dim}
          framing={!isCarView ? 'brand' : 'car'}
          quality={typeof window !== 'undefined' && window.innerWidth < 760 ? 'low' : 'high'}
        />
      )}

      {store.mode === 'interior' && (
        <div className="p360bar intbar" role="toolbar" aria-label="Interior views">
          {(
            [
              ['cockpit', 'Cockpit'],
              ['dash', 'Dash'],
              ['driver', 'Driver Seat'],
              ['rear', 'Rear Seats'],
            ] as const
          ).map(([id, label]) => (
            <button key={id} className={`dockbtn ${interiorView === id ? 'on' : ''}`} onClick={() => setInteriorView(id)}>
              {label}
            </button>
          ))}
        </div>
      )}

      {in360 && (
        <div className="p360bar" role="toolbar" aria-label="360 degree view presets">
          {(['front', 'side', 'rear', 'top'] as const).map((p) => (
            <button key={p} className={`dockbtn ${preset360 === p ? 'on' : ''}`} onClick={() => setPreset360(p)}>
              {p}
            </button>
          ))}
          <button className="dockbtn" onClick={() => setPreset360(null)}>
            orbit
          </button>
          <button className="iconbtn" style={{ width: 32, height: 32, marginLeft: 6 }} onClick={() => store.setMode(null)} aria-label="Exit 360 mode">
            ✕
          </button>
        </div>
      )}

      {isCarView && (
        <>
          {!heroDone && (
            <HeroReveal brandName={brand.name.toUpperCase()} modelName={vehicle.model} trim={vehicle.trim} onDone={() => setHeroDone(true)} />
          )}
          {heroDone && !store.mode && !transition && <CarHud vehicle={vehicle} accent={brand.accent} />}
          {hotspot && (
            <div className="hot-label" style={{ left: '50%', top: '28%' }} role="status">
              {hotspot.label}
            </div>
          )}
          <button className="swipe-arrow prev" style={{ left: 22 }} onClick={() => go(-1)} aria-label="Previous car">‹</button>
          <button className="swipe-arrow next" style={{ right: 22 }} onClick={() => go(1)} aria-label="Next car">›</button>
        </>
      )}

      {!isCarView && !store.mode && <BrandView accent={brand.accent} onSelect={selectBrand} />}
      {zoomBrand && <BrandZoom brandId={zoomBrand} />}

      <ModeDock />
    </>
  );
}

// helper for ghost cars
function lineupOf(brandId: string): Vehicle[] {
  return vehiclesByBrand(brandId);
}

// wheel style names used by the configurator — kept in sync with Configurator.tsx
const CONFIG_WHEELS = ['classic-5', 'double-spoke', 'monoblock', 'turbine', 'aero', 'cross-spoke'];
