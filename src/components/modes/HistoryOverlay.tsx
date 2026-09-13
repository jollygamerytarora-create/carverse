'use client';

import { HISTORY_MILESTONES } from '@/data/history';
import { useStore } from '@/lib/store';

export default function HistoryOverlay() {
  const store = useStore();
  return (
    <div className="hist-wrap" role="dialog" aria-label="Automotive history">
      <h2>Automotive History</h2>
      <span className="k">Milestones that shaped the car universe</span>
      <button className="iconbtn" style={{ position: 'fixed', top: 22, right: 22 }} onClick={() => store.setMode(null)} aria-label="Close history">✕</button>
      <div className="hist-line">
        {HISTORY_MILESTONES.map((m) => (
          <div className="hist-item" key={m.year}>
            <div className="yr">{m.year}</div>
            <h3>{m.title}</h3>
            <p>{m.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
