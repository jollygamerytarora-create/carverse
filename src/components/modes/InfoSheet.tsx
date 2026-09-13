'use client';

import { useState } from 'react';
import { Vehicle } from '@/lib/types';
import { DEMO_NOTE } from '@/data';
import { brandById } from '@/data/brands';
import { usd } from '@/lib/utils';

export default function InfoSheet({ vehicle }: { vehicle: Vehicle }) {
  const [gen, setGen] = useState(vehicle.generationHistory.length - 1);
  const brand = brandById(vehicle.brand);
  const g = vehicle.generationHistory[gen] ?? vehicle.generationHistory[vehicle.generationHistory.length - 1];

  return (
    <aside className="sheet" role="dialog" aria-modal="false" aria-label={`${vehicle.model} information`}>
      <div className="sheet-head">
        <div>
          <span className="k">Information</span>
          <h2>{vehicle.model} {vehicle.trim}</h2>
        </div>
        <button className="sheet-close" aria-label="Close info">✕</button>
      </div>
      <div className="sheet-body">
        <div className="sect">
          <span className="k">Overview</span>
          <h3>
            {brand?.name} {vehicle.model} · {vehicle.generation} · {vehicle.year}
          </h3>
          <p>{vehicle.description}</p>
        </div>

        <div className="sect">
          <span className="k">History</span>
          <p>{vehicle.history}</p>
        </div>

        <div className="sect">
          <span className="k">Generation timeline</span>
          <div className="timeline">
            <div className="axis" />
            <div className="tl-track" role="listbox" aria-label="Generations">
              {vehicle.generationHistory.map((gg, i) => (
                <button key={gg.code} className={`tlnode ${i === gen ? 'on' : ''}`} role="option" aria-selected={i === gen} onClick={() => setGen(i)}>
                  <div className="yr">{gg.years.split('–')[0]}</div>
                  <div className="cd">{gg.code}</div>
                  <div className="dot" />
                </button>
              ))}
            </div>
          </div>
          {g && (
            <>
              <div className="genspec">
                <div className="stat"><div className="v">{g.power} <small>HP</small></div><div className="l k">Power</div></div>
                <div className="stat"><div className="v">{g.acceleration} <small>S</small></div><div className="l k">0–100</div></div>
                <div className="stat"><div className="v">{g.engine}</div><div className="l k">Engine</div></div>
              </div>
              <p style={{ marginTop: 10 }}>{g.note}</p>
            </>
          )}
        </div>

        <div className="sect">
          <span className="k">Engine & performance</span>
          <p>{vehicle.engine} · {vehicle.transmission} · {vehicle.driveType}</p>
        </div>

        <div className="sect">
          <span className="k">Technology</span>
          <div className="chips">{vehicle.features.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </div>

        <div className="sect">
          <span className="k">Safety</span>
          <div className="chips">{vehicle.safety.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </div>

        <div className="sect">
          <span className="k">Interior</span>
          <div className="chips">{vehicle.interiorFeatures.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </div>

        <div className="sect">
          <span className="k">Exterior</span>
          <div className="chips">{vehicle.exteriorFeatures.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </div>

        <div className="sect">
          <span className="k">Variants</span>
          <div className="chips">{vehicle.variants.map((f) => <span key={f} className="chip hl">{f}</span>)}</div>
        </div>

        <div className="sect">
          <span className="k">Pricing & production</span>
          <p>
            From ~{usd(vehicle.price)} (demo estimate). {brand?.name} — {brand?.country}, founded {brand?.founded}.
          </p>
        </div>

        <div className="sect">
          <span className="k">Awards</span>
          <div className="chips">{vehicle.awards.map((f) => <span key={f} className="chip">{f}</span>)}</div>
        </div>

        <div className="sect">
          <span className="k">Data</span>
          <p style={{ fontSize: 11, opacity: 0.7 }}>{DEMO_NOTE}</p>
        </div>
      </div>
    </aside>
  );
}
