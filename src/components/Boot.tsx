'use client';

import { useEffect, useState, useMemo } from 'react';
import { startPreload, subscribePreload, PreloadState } from '@/lib/assetPreloader';

/**
 * Cinematic loading experience.
 * A line-art GT car draws itself in while the REAL vehicle assets stream in
 * (one-go preloader). The boot gate waits for the first assets with a cap so
 * a slow network never holds the experience hostage; remaining assets keep
 * streaming in the background (corner chip shows live progress).
 * Pure SVG + CSS so it renders instantly, before any 3D assets are ready.
 */
export default function Boot() {
  const [pct, setPct] = useState(0);
  const [done, setDone] = useState(false);
  const [msg, setMsg] = useState('Initializing showroom');
  const [pl, setPl] = useState<PreloadState | null>(null);

  useEffect(() => subscribePreload(setPl) as unknown as () => void, []);

  useEffect(() => {
    startPreload();
  }, []);

  useEffect(() => {
    const msgs = ['Loading vehicle database', 'Streaming licensed 3D assets', 'Preparing 3D environment', 'Calibrating camera rig', 'Polishing paint', 'Warming tires'];
    let p = 0;
    const int = window.setInterval(() => {
      p = Math.min(100, p + Math.random() * 16 + 7);
      setPct(p);
      // while the one-go preloader streams, surface it in the status line
      const streaming = pl && pl.total > 0 && !pl.ready;
      setMsg(streaming && pl?.current ? `Streaming ${pl.current.replace(/-/g, ' ').toUpperCase()}` : msgs[Math.min(msgs.length - 1, Math.floor((p / 100) * msgs.length))]);
      if (p >= 100) {
        window.clearInterval(int);
        window.setTimeout(() => setDone(true), 650);
      }
    }, 240);
    return () => window.clearInterval(int);
  }, [pl]);

  const dashLen = 620;
  const draw = useMemo(() => (done ? dashLen : Math.min(dashLen, (pct / 100) * dashLen)), [pct, done]);

  return (
    <div className={`boot ${done ? 'done' : ''}`} aria-hidden={done} role="status" aria-label="Loading CARVERSE">
      <div className="boot-inner">
        <div className="wordmark">
          <span className="w-car">CAR</span>
          <span className="w-verse">VERSE</span>
        </div>
        <div className="boot-tagline">The 3D Interactive Automotive Encyclopedia</div>

        {/* line-art car that draws itself */}
        <svg className="boot-car" viewBox="0 0 640 200" fill="none" aria-hidden="true">
          {/* ground line */}
          <line x1="20" y1="168" x2="620" y2="168" stroke="#2a3140" strokeWidth="1" opacity="0.5" />
          {/* body silhouette */}
          <path
            className="car-stroke main"
            stroke="#e8ecf4"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={dashLen}
            strokeDashoffset={dashLen - draw}
            d="M60 140 C70 118 92 112 120 108 C150 78 190 62 250 60 C310 58 350 70 380 96 C430 102 480 108 510 122 C540 126 560 132 564 142"
          />
          {/* roof/glass detail */}
          <path
            className="car-stroke glass"
            stroke="#7a94b8"
            strokeWidth="1.4"
            strokeDasharray={dashLen}
            strokeDashoffset={dashLen - Math.max(0, draw - 120)}
            d="M150 106 C176 80 208 68 252 66 C300 64 336 74 362 96"
          />
          {/* door seam */}
          <path
            className="car-stroke seam"
            stroke="#39414f"
            strokeWidth="1.2"
            strokeDasharray={dashLen}
            strokeDashoffset={dashLen - Math.max(0, draw - 220)}
            d="M258 64 L252 138 M330 66 L336 136"
          />
          {/* headlight tick */}
          <path
            className="car-stroke light"
            stroke="#cfe4ff"
            strokeWidth="2"
            strokeDasharray={dashLen}
            strokeDashoffset={dashLen - Math.max(0, draw - 300)}
            d="M62 122 L92 116"
          />
          {/* wheels */}
          <circle className="car-stroke" cx="160" cy="140" r="30" stroke="#c9ccd2" strokeWidth="2.4" strokeDasharray={dashLen} strokeDashoffset={dashLen - Math.max(0, draw - 320)} />
          <circle className="car-stroke" cx="160" cy="140" r="14" stroke="#5a6577" strokeWidth="1.6" strokeDasharray={dashLen} strokeDashoffset={dashLen - Math.max(0, draw - 380)} />
          <circle className="car-stroke" cx="470" cy="140" r="30" stroke="#c9ccd2" strokeWidth="2.4" strokeDasharray={dashLen} strokeDashoffset={dashLen - Math.max(0, draw - 420)} />
          <circle className="car-stroke" cx="470" cy="140" r="14" stroke="#5a6577" strokeWidth="1.6" strokeDasharray={dashLen} strokeDashoffset={dashLen - Math.max(0, draw - 480)} />
        </svg>

        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="boot-status">
          <span className="k">{pct >= 100 ? 'Entering the universe' : msg}</span>
          <span className="k pct">{Math.floor(pct)}%</span>
        </div>
      </div>
      <div className="boot-vignette" aria-hidden="true" />
    </div>
  );
}

/**
 * Corner chip — live one-go library progress after boot. Shows "n / total"
 * models cached and the car currently streaming; disappears when the whole
 * library is hot.
 */
export function PreloadChip() {
  const pl = usePreload();
  if (!pl || pl.total <= 1 || pl.ready) return null;
  return (
    <div className="preload-chip" role="status" aria-label="3D library loading">
      <span className="pc-dot" />
      <span className="pc-label">3D LIBRARY</span>
      <span className="pc-count">
        {pl.done}/{pl.total}
      </span>
      {pl.current && <span className="pc-current">{pl.current.replace(/-/g, ' ')}</span>}
    </div>
  );
}

function usePreload(): PreloadState | null {
  const [s, setS] = useState<PreloadState | null>(typeof window === 'undefined' ? null : null);
  useEffect(() => subscribePreload(setS) as unknown as () => void, []);
  return s;
}
