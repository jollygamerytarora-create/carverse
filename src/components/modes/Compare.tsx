'use client';

import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { VEHICLES, vehicleById } from '@/data';
import { brandById } from '@/data/brands';
import { useStore } from '@/lib/store';
import { usd, inr, vividPaintOf } from '@/lib/utils';
import { Vehicle } from '@/lib/types';

const Showroom = dynamic(() => import('@/components/three/Showroom'), { ssr: false });

interface Row {
  label: string;
  a: string;
  b: string;
  win: 'a' | 'b' | null;
}

/* ---------------- setup screen (choose the two cars FIRST) ---------------- */

function SetupScreen({
  pending,
  onPick,
  onStart,
  onClose,
}: {
  pending: { a: string | null; b: string | null };
  onPick: (slot: 'a' | 'b', id: string) => void;
  onStart: () => void;
  onClose: () => void;
}) {
  const [picking, setPicking] = useState<null | 'a' | 'b'>(null);
  const [query, setQuery] = useState('');

  const a = pending.a ? vehicleById(pending.a) ?? null : null;
  const b = pending.b ? vehicleById(pending.b) ?? null : null;
  const ready = !!a && !!b;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const exclude = picking === 'a' ? pending.b : pending.a;
    return VEHICLES.filter((v) => v.id !== exclude).filter((v) =>
      q ? `${brandById(v.brand)?.name ?? ''} ${v.model} ${v.trim} ${v.bodyType}`.toLowerCase().includes(q) : true
    );
  }, [query, picking, pending]);

  const slotCard = (slot: 'a' | 'b', v: Vehicle | null) => (
    <button className={`slotcard ${picking === slot ? 'sel' : ''}`} onClick={() => { setPicking(slot); setQuery(''); }}>
      <span className="k">{slot === 'a' ? 'Car A' : 'Car B'}</span>
      {v ? (
        <>
          <span className="brand">{brandById(v.brand)?.name}</span>
          <span className="model">{v.model}{v.trim ? ` ${v.trim}` : ''}</span>
          <span className="specs">{v.horsepower} hp · {v.acceleration}s · {inr(v.price)}</span>
          <span className="change">Change ▲</span>
        </>
      ) : (
        <>
          <span className="empty-mark">＋</span>
          <span className="empty-label">Choose a car</span>
        </>
      )}
    </button>
  );

  return (
    <div className="cmp-setup">
      <div className="cmp-setup-head">
        <div>
          <span className="k">Compare</span>
          <h2>Choose two cars</h2>
        </div>
        <button className="sheet-close" onClick={onClose} aria-label="Exit compare">✕</button>
      </div>

      <div className="cmp-slots">
        {slotCard('a', a)}
        <span className="vs">VS</span>
        {slotCard('b', b)}
      </div>

      <button className="startbtn" disabled={!ready} onClick={onStart}>
        {ready ? 'Start comparison →' : 'Select both cars to continue'}
      </button>

      {picking && (
        <div className="modal" onClick={() => { setPicking(null); setQuery(''); }}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h3>Select {picking === 'a' ? 'first' : 'second'} car</h3>
            <input
              className="pick-search"
              placeholder="Search 70+ cars — “M5”, “Porsche”, “electric”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="picklist" style={{ maxHeight: '46vh', overflowY: 'auto', marginTop: 14 }}>
              {results.map((v) => (
                <button
                  key={v.id}
                  className="pickrow"
                  onClick={() => {
                    onPick(picking, v.id);
                    setPicking(null);
                    setQuery('');
                  }}
                >
                  <span className="n">{brandById(v.brand)?.name} {v.model}{v.trim ? ` ${v.trim}` : ''}</span>
                  <span className="s">{v.horsepower} hp · {v.acceleration}s · {inr(v.price)}</span>
                </button>
              ))}
              {!results.length && <div className="kk" style={{ padding: '18px 4px' }}>No matches</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------- comparison view ---------------- */

export default function Compare() {
  const store = useStore();
  const [step, setStep] = useState<'pick' | 'show'>('pick');
  // slot A pre-fills with the car the user was just viewing; slot B starts
  // empty so the decision of WHAT to compare is always the user's
  const [pending, setPending] = useState<{ a: string | null; b: string | null }>({ a: store.lastCarId ?? null, b: null });
  const [picking, setPicking] = useState<null | 'left' | 'right'>(null);
  const [query, setQuery] = useState('');

  const left = vehicleById(store.compareLeftId)!;
  const right = vehicleById(store.compareRightId)!;

  const rows: Row[] = useMemo(() => {
    const num = (x: number, y: number, lowerWins = true): 'a' | 'b' | null => {
      if (x === y) return null;
      if (lowerWins) return x < y ? 'a' : 'b';
      return x > y ? 'a' : 'b';
    };
    return [
      { label: 'Power', a: `${left.horsepower} hp`, b: `${right.horsepower} hp`, win: num(left.horsepower, right.horsepower, false) },
      { label: 'Torque', a: `${left.torque} Nm`, b: `${right.torque} Nm`, win: num(left.torque, right.torque, false) },
      { label: '0–100 km/h', a: `${left.acceleration} s`, b: `${right.acceleration} s`, win: num(left.acceleration, right.acceleration) },
      { label: 'Top speed', a: `${left.topSpeed} km/h`, b: `${right.topSpeed} km/h`, win: num(left.topSpeed, right.topSpeed, false) },
      { label: 'Weight', a: `${left.weight} kg`, b: `${right.weight} kg`, win: num(left.weight, right.weight) },
      { label: 'Engine', a: left.engine, b: right.engine, win: null },
      { label: 'Drive', a: left.driveType, b: right.driveType, win: null },
      { label: 'Fuel economy', a: left.fuelEconomy, b: right.fuelEconomy, win: null },
      { label: 'Length', a: `${left.length} mm`, b: `${right.length} mm`, win: null },
      { label: 'Boot space', a: `${left.bootCapacity} L`, b: `${right.bootCapacity} L`, win: num(left.bootCapacity, right.bootCapacity, false) },
      { label: 'Seats', a: `${left.seats}`, b: `${right.seats}`, win: null },
      { label: 'Price (demo)', a: `${usd(left.price)} · ${inr(left.price)}`, b: `${usd(right.price)} · ${inr(right.price)}`, win: num(left.price, right.price) },
    ];
  }, [left, right]);

  const winA = rows.filter((r) => r.win === 'a').length;
  const winB = rows.filter((r) => r.win === 'b').length;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const exclude = picking === 'left' ? store.compareRightId : store.compareLeftId;
    return VEHICLES.filter((v) => v.id !== exclude).filter((v) =>
      q ? `${brandById(v.brand)?.name ?? ''} ${v.model} ${v.trim} ${v.bodyType}`.toLowerCase().includes(q) : true
    );
  }, [query, picking, store.compareLeftId, store.compareRightId]);

  if (step === 'pick') {
    return (
      <div className="compare-wrap">
        <SetupScreen
          pending={pending}
          onPick={(slot, id) => setPending((p) => ({ ...p, [slot]: id }))}
          onClose={() => store.setMode(null)}
          onStart={() => {
            if (pending.a && pending.b) {
              store.setCompare(pending.a, pending.b);
              setStep('show');
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className="compare-wrap">
      <div className="compare-head">
        <button className="ghostbtn" onClick={() => setPicking('left')}>▲ {brandById(left.brand)?.name} {left.model}</button>
        <span className="vs">VS</span>
        <button className="ghostbtn" onClick={() => setPicking('right')}>▲ {brandById(right.brand)?.name} {right.model}</button>
        <button className="ghostbtn" onClick={() => setStep('pick')} aria-label="Back to car selection" style={{ marginLeft: 4 }}>⇄ Cars</button>
        <button className="iconbtn" onClick={() => store.setMode(null)} aria-label="Exit compare" style={{ marginLeft: 8 }}>✕</button>
      </div>

      <div style={{ height: '38vh', minHeight: 240 }}>
        <Showroom
          cars={[
            { vehicle: left, paint: vividPaintOf(left), offset: [-3.4, 0, -0.6] as [number, number, number], rotY: 0.45, enterFrom: -8, hotspots: false, useGltf: true },
            { vehicle: right, paint: vividPaintOf(right), offset: [3.4, 0, -0.6] as [number, number, number], rotY: -0.45, enterFrom: 8, hotspots: false, useGltf: true },
          ]}
          envAccent="#e8b64a"
          autoRotate={false}
          dim={false}
          zoom={false}
          dist={12.5}
        />
      </div>

      <div className="compare-cols">
        <div className="cmpcol">
          <div className="k">{winA} wins</div>
          <h3 style={{ color: 'var(--accent)' }}>{left.model}</h3>
          <div className="sub">{brandById(left.brand)?.name}</div>
          {rows.map((r) => (
            <div className="cmprow" key={r.label}>
              <div className="l kk">{r.label}</div>
              <div className={`val ${r.win === 'a' ? 'win' : ''}`} style={{ textAlign: 'right', gridColumn: '1 / 2' }}>{r.a}</div>
              <div />
              <div />
            </div>
          ))}
        </div>
        <div className="cmpcol">
          <div className="k">{winB} wins</div>
          <h3 style={{ color: 'var(--accent)' }}>{right.model}</h3>
          <div className="sub">{brandById(right.brand)?.name}</div>
          {rows.map((r) => (
            <div className="cmprow" key={r.label}>
              <div className="l kk">{r.label}</div>
              <div />
              <div className={`val ${r.win === 'b' ? 'win' : ''}`} style={{ gridColumn: '3 / 4' }}>{r.b}</div>
              <div />
            </div>
          ))}
        </div>
      </div>

      {picking && (
        <div className="modal" onClick={() => { setPicking(null); setQuery(''); }}>
          <div className="box" onClick={(e) => e.stopPropagation()}>
            <h3>Select {picking === 'left' ? 'first' : 'second'} car</h3>
            <input
              className="pick-search"
              placeholder="Search 70+ cars — “M5”, “Porsche”, “electric”…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            <div className="picklist" style={{ maxHeight: '46vh', overflowY: 'auto', marginTop: 14 }}>
              {results.map((v) => (
                <button
                  key={v.id}
                  className="pickrow"
                  onClick={() => {
                    if (picking === 'left') store.setCompare(v.id, store.compareRightId);
                    else store.setCompare(store.compareLeftId, v.id);
                    setPicking(null);
                    setQuery('');
                  }}
                >
                  <span className="n">{brandById(v.brand)?.name} {v.model}{v.trim ? ` ${v.trim}` : ''}</span>
                  <span className="s">{v.horsepower} hp · {v.acceleration}s · {inr(v.price)}</span>
                </button>
              ))}
              {!results.length && <div className="kk" style={{ padding: '18px 4px' }}>No matches</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
