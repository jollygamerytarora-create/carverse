'use client';

import { useState, useEffect } from 'react';
import { Vehicle } from '@/lib/types';

export default function FunFactOverlay({ vehicle, onClose }: { vehicle: Vehicle; onClose: () => void }) {
  const [i, setI] = useState(0);
  useEffect(() => setI(0), [vehicle.id]);
  const fact = vehicle.funFacts[i % vehicle.funFacts.length];
  const num = String(i + 1).padStart(2, '0');

  return (
    <div className="funfact-wrap" role="dialog" aria-label="Fun fact">
      <div className="funfact-card" key={`${vehicle.id}-${i}`}>
        <span className="k idx">Fun fact #{num}</span>
        <p>{fact}</p>
        <div className="fact-foot">
          <span className="kk">{vehicle.brand.toUpperCase()} · {vehicle.model.toUpperCase()}</span>
          <button className="ghostbtn" onClick={() => setI((v) => v + 1)}>
            Next fact →
          </button>
        </div>
      </div>
      <button className="iconbtn" style={{ position: 'absolute', top: 84, right: 28 }} onClick={onClose} aria-label="Close fun fact">✕</button>
    </div>
  );
}
