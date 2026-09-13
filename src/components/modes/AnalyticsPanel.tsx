'use client';

import { useState, useEffect, useRef } from 'react';
import { Vehicle } from '@/lib/types';
import { fmt, usd } from '@/lib/utils';

function Counter({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [n, setN] = useState(0);
  const raf = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 900;
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value]);
  return <>{fmt(n)}{suffix}</>;
}

function Gauge({ pct, label, value }: { pct: number; label: string; value: string }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setP(pct), 60);
    return () => window.clearTimeout(t);
  }, [pct]);
  const deg = p * 2.7; // 0..270
  return (
    <div className="gauge" aria-label={`${label}: ${value}`}>
      <svg viewBox="0 0 120 120" width="120" height="120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" strokeDasharray="235.6 314.16" strokeLinecap="round" transform="rotate(135 60 60)" />
        <circle
          cx="60" cy="60" r="50" fill="none" stroke="var(--accent)" strokeWidth="8"
          strokeDasharray={`${(deg / 270) * 235.6} 314.16`}
          strokeLinecap="round" transform="rotate(135 60 60)"
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
      </svg>
      <div className="gauge-val">{value}</div>
      <div className="k">{label}</div>
    </div>
  );
}

function Bar({ label, pct, text }: { label: string; pct: number; text: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = window.setTimeout(() => setW(pct), 80);
    return () => window.clearTimeout(t);
  }, [pct]);
  return (
    <div className="barrow">
      <span className="l">{label}</span>
      <span className="track"><span className="fill" style={{ width: `${Math.min(100, w)}%`, transform: 'none' }} /></span>
      <span className="num">{text}</span>
    </div>
  );
}

export default function AnalyticsPanel({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  return (
    <div className="analytics-wrap" role="dialog" aria-label="Vehicle analytics">
      <div className="an-head">
        <div>
          <span className="k">Analytics</span>
          <h2>{vehicle.model} <span className="an-trim">{vehicle.trim}</span></h2>
        </div>
        <button className="iconbtn" onClick={onClose} aria-label="Close analytics">✕</button>
      </div>

      <div className="an-body">
        <div className="an-section">
          <span className="k an-k">Performance</span>
          <div className="gauges">
            <Gauge pct={Math.min(100, (vehicle.horsepower / 1000) * 100)} label="Horsepower" value={`${vehicle.horsepower} hp`} />
            <Gauge pct={Math.min(100, (vehicle.torque / 1500) * 100)} label="Torque" value={`${vehicle.torque} Nm`} />
            <Gauge pct={Math.min(100, (6.5 - vehicle.acceleration) * 22)} label="0–100 km/h" value={`${vehicle.acceleration} s`} />
            <Gauge pct={Math.min(100, (vehicle.topSpeed / 350) * 100)} label="Top speed" value={`${vehicle.topSpeed} km/h`} />
          </div>
          <div className="bars">
            <Bar label="Quarter mile" pct={Math.min(100, (13.5 - vehicle.acceleration * 1.6) * 12)} text={`~${(vehicle.acceleration * 1.9).toFixed(1)} s (est.)`} />
            <Bar label="Power/weight" pct={Math.min(100, (vehicle.horsepower / (vehicle.weight / 1000)) / 7)} text={`${Math.round(vehicle.horsepower / (vehicle.weight / 1000))} hp/t`} />
            <Bar label="Top speed" pct={(vehicle.topSpeed / 350) * 100} text={`${vehicle.topSpeed} km/h`} />
          </div>
        </div>

        <div className="an-section">
          <span className="k an-k">Engine</span>
          <div className="statgrid">
            <div className="stat"><div className="v"><Counter value={vehicle.cylinders} /></div><div className="l k">Cylinders</div></div>
            <div className="stat"><div className="v">{vehicle.engineSize}</div><div className="l k">Displacement</div></div>
            <div className="stat"><div className="v">{vehicle.fuelType}</div><div className="l k">Fuel</div></div>
            <div className="stat"><div className="v">{vehicle.driveType}</div><div className="l k">Drive</div></div>
          </div>
        </div>

        <div className="an-section">
          <span className="k an-k">Dimensions</span>
          <div className="bars">
            <Bar label="Length" pct={(vehicle.length / 5300) * 100} text={`${fmt(vehicle.length)} mm`} />
            <Bar label="Width" pct={(vehicle.width / 2100) * 100} text={`${fmt(vehicle.width)} mm`} />
            <Bar label="Height" pct={(vehicle.height / 1800) * 100} text={`${fmt(vehicle.height)} mm`} />
            <Bar label="Wheelbase" pct={(vehicle.wheelbase / 3300) * 100} text={`${fmt(vehicle.wheelbase)} mm`} />
            <Bar label="Weight" pct={(vehicle.weight / 2600) * 100} text={`${fmt(vehicle.weight)} kg`} />
          </div>
        </div>

        <div className="an-section">
          <span className="k an-k">Efficiency & practicality</span>
          <div className="statgrid">
            <div className="stat"><div className="v">{vehicle.fuelEconomy}</div><div className="l k">Consumption</div></div>
            <div className="stat"><div className="v">{vehicle.electricRange > 0 ? <Counter value={vehicle.electricRange} suffix=" km" /> : '—'}</div><div className="l k">Electric range</div></div>
            <div className="stat"><div className="v"><Counter value={vehicle.bootCapacity} suffix=" L" /></div><div className="l k">Boot</div></div>
            <div className="stat"><div className="v"><Counter value={vehicle.seats} /></div><div className="l k">Seats</div></div>
            <div className="stat"><div className="v">{usd(vehicle.price)}</div><div className="l k">Demo price</div></div>
            <div className="stat"><div className="v">{vehicle.transmission}</div><div className="l k">Transmission</div></div>
          </div>
        </div>

        <p style={{ fontSize: 10, opacity: 0.55, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Figures are demo/prototype estimates — not official manufacturer data.
        </p>
      </div>
    </div>
  );
}
