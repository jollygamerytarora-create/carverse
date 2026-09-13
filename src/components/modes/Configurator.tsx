'use client';

import { useMemo, useState } from 'react';
import { Vehicle } from '@/lib/types';
import { useStore } from '@/lib/store';
import { usd, inr } from '@/lib/utils';

/**
 * Live configurator. Paint, wheels, interior, trim and packages are priced
 * and persist per-car (localStorage). Paint + wheel style render live on the
 * 3D model via the store; the rest feed the saved configuration summary.
 * Option prices are demo estimates, not official price lists.
 */

const WHEELS = [
  { name: 'Standard 19"', add: 0, style: 'classic-5' },
  { name: 'Sport 20" Double-Spoke', add: 1200, style: 'double-spoke' },
  { name: 'Forged 21" Monoblock', add: 3400, style: 'monoblock' },
  { name: 'Track 21" Turbine Black', add: 4200, style: 'turbine' },
  { name: 'Aero 20" (EV Efficient)', add: 1900, style: 'aero' },
  { name: 'Cross-Spoke 20"', add: 2400, style: 'cross-spoke' },
];
const INTERIORS = [
  { name: 'Leather', add: 0 },
  { name: 'Sport Leather', add: 1800 },
  { name: 'Alcantara / Carbon', add: 2600 },
  { name: 'Vegan (Technical Fabric)', add: 900 },
  { name: 'Merino Extended', add: 3900 },
];
const TRIMS = [
  { name: 'Standard', add: 0 },
  { name: 'Sport Trim', add: 2200 },
  { name: 'Carbon Pack', add: 5100 },
  { name: 'Performance Pack', add: 7400 },
];
const PACKS = [
  { name: 'None', add: 0 },
  { name: 'Aero Package', add: 2900 },
  { name: 'Black Trim Package', add: 1600 },
  { name: 'Ceramic Brakes', add: 3800 },
  { name: 'Night Vision + Driver Assist Pro', add: 2400 },
];

export default function Configurator({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const store = useStore();
  const [saved, setSaved] = useState(false);
  const color = vehicle.colors[store.selectedColorIndex] ?? vehicle.colors[0];
  const cfg = store.configurator;

  const wheel = WHEELS[cfg.wheel] ?? WHEELS[0];
  const interior = INTERIORS[cfg.interior] ?? INTERIORS[0];
  const trim = TRIMS[cfg.trim] ?? TRIMS[0];
  const pack = PACKS[cfg.pack] ?? PACKS[0];

  const total = useMemo(
    () => vehicle.price + wheel.add + interior.add + trim.add + pack.add,
    [vehicle.price, wheel, interior, trim, pack]
  );

  const save = () => {
    const key = `cv-config-${vehicle.id}`;
    localStorage.setItem(key, JSON.stringify({ color: color.name, wheel: wheel.name, interior: interior.name, trim: trim.name, pack: pack.name, total }));
    if (!store.garage.includes(vehicle.id)) store.toggleFavorite(vehicle.id);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const renderOpts = (list: { name: string; add: number }[], key: 'wheel' | 'interior' | 'trim' | 'pack') => (
    <div className="optbtns">
      {list.map((o, i) => (
        <button key={o.name} className={`optbtn ${cfg[key] === i ? 'on' : ''}`} onClick={() => store.setConfigOption(key, i)}>
          {o.name}
          {o.add > 0 && <em>+{usd(o.add)}</em>}
        </button>
      ))}
    </div>
  );

  return (
    <aside className="config-wrap" role="dialog" aria-label={`Configure ${vehicle.model}`}>
      <div className="sheet-head">
        <div>
          <span className="k">Configure</span>
          <h2>Your {vehicle.model}</h2>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Close configurator">
          ✕
        </button>
      </div>

      <div className="sheet-body">
        <div className="grp">
          <span className="k">Paint — {color.name}</span>
          <div className="swatches">
            {vehicle.colors.map((c, i) => (
              <button
                key={c.name}
                className={`swatch ${i === store.selectedColorIndex ? 'on' : ''}`}
                style={{ background: c.hex }}
                onClick={() => store.setColorIndex(i)}
                aria-label={`Paint: ${c.name}`}
                title={c.name}
              />
            ))}
          </div>
        </div>

        <div className="grp">
          <span className="k">Wheels — {wheel.name}</span>
          {renderOpts(WHEELS, 'wheel')}
        </div>

        <div className="grp">
          <span className="k">Interior</span>
          {renderOpts(INTERIORS, 'interior')}
        </div>

        <div className="grp">
          <span className="k">Trim</span>
          {renderOpts(TRIMS, 'trim')}
        </div>

        <div className="grp">
          <span className="k">Package</span>
          {renderOpts(PACKS, 'pack')}
        </div>

        <p style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Paint and wheel style render live on the 3D model. Interior, trim and package options are demo-estimated pricing.
        </p>
      </div>

      <div className="config-foot">
        <div className="sum">
          {usd(total)}
          <small>{inr(total)} · {color.name} · {wheel.name} · {interior.name}{trim.add ? ` · ${trim.name}` : ''}{pack.add ? ` · ${pack.name}` : ''}</small>
        </div>
        <button className="ghostbtn" onClick={save}>{saved ? 'Saved ✓' : 'Save config'}</button>
      </div>
    </aside>
  );
}
