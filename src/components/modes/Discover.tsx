'use client';

import { CATEGORIES, categoryById, VEHICLES } from '@/data';
import { useStore } from '@/lib/store';
import { brandById } from '@/data/brands';
import { usd } from '@/lib/utils';
import { Vehicle } from '@/lib/types';

export function DiscoverGrid() {
  const store = useStore();
  return (
    <div className="cats" role="dialog" aria-label="Discover categories">
      {CATEGORIES.map((c) => (
        <button key={c.id} className="catcard" onClick={() => store.openCategory(c.id)}>
          <span className="em" aria-hidden="true">{c.emoji}</span>
          <h3>{c.label}</h3>
          <span className="d">{c.description}</span>
        </button>
      ))}
      <button className="iconbtn" style={{ position: 'fixed', top: 22, right: 22 }} onClick={() => store.setMode(null)} aria-label="Close discover">✕</button>
    </div>
  );
}

function categoryVehicles(id: string): Vehicle[] {
  const cat = categoryById(id);
  return cat ? VEHICLES.filter(cat.match) : [];
}

export function CategoryResults() {
  const store = useStore();
  const cat = categoryById(store.categoryId ?? '');
  if (!cat) return null;
  const list = categoryVehicles(cat.id);

  return (
    <div className="catres">
      <div className="k" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span>{cat.emoji} {cat.label} — {list.length} cars</span>
        <button className="ghostbtn" style={{ height: 26, padding: '0 12px' }} onClick={() => store.setMode('discover')}>
          All categories
        </button>
      </div>
      <div className="strip">
        {list.map((v) => (
          <button key={v.id} className="resrow" onClick={() => store.selectVehicle(v.id)}>
            <span className="thumb" aria-hidden="true">{v.emoji}</span>
            <span>
              <span className="nm">{brandById(v.brand)?.name} {v.model}</span>
              <span className="meta">{v.horsepower} hp · {v.acceleration}s · {usd(v.price)}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
