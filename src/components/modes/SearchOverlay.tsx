'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { VEHICLES, filterVehicles } from '@/data';
import { brandById } from '@/data/brands';
import { useStore } from '@/lib/store';
import { usd } from '@/lib/utils';

const EXAMPLES = ['M5', '911', 'electric SUV', 'V8', 'fastest BMW', '600+ hp', 'under $100k', 'Toyota'];

export default function SearchOverlay() {
  const store = useStore();
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    // structured queries
    const powerMatch = query.match(/(\d{3,4})\s*\+?\s*hp/);
    if (powerMatch) {
      return filterVehicles({ minPower: parseInt(powerMatch[1], 10) });
    }
    const priceMatch = query.match(/under\s*\$?([\d,.]+)(k)?/);
    if (priceMatch) {
      const n = parseFloat(priceMatch[1].replace(/,/g, ''));
      return filterVehicles({ maxPrice: priceMatch[2] ? n * 1000 : n });
    }
    if (query.includes('electric suv')) return filterVehicles({ fuelType: 'electric', bodyType: 'suv' });
    if (query.includes('v8')) return filterVehicles({ cylinders: 8 });
    if (query.includes('v10')) return filterVehicles({ cylinders: 10 });
    if (query.includes('v12')) return filterVehicles({ cylinders: 12 });
    if (query.includes('electric')) return filterVehicles({ fuelType: 'electric' });
    if (query.includes('manual')) return filterVehicles({ transmission: 'manual' });
    const fastestBrand = query.match(/fastest\s+(.+)/);
    if (fastestBrand) {
      const b = VEHICLES.filter((v) => v.brand.startsWith(fastestBrand[1].trim().slice(0, 4)));
      if (b.length) return b.sort((x, y) => x.acceleration - y.acceleration).slice(0, 1);
    }
    // free-text
    return VEHICLES.filter((v) => {
      const brand = brandById(v.brand);
      const hay = `${v.model} ${v.trim} ${brand?.name ?? ''} ${brand?.country ?? ''} ${v.bodyType} ${v.fuelType} ${v.engine}`.toLowerCase();
      return query.split(/\s+/).every((w) => hay.includes(w));
    });
  }, [q]);

  return (
    <div className="searchov" role="dialog" aria-label="Search cars">
      <input
        ref={inputRef}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search cars, brands, specs…"
        aria-label="Search query"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && results[0]) {
            store.selectVehicle(results[0].id);
            store.setMode(null);
          }
          if (e.key === 'Escape') store.setMode(null);
        }}
      />

      <div className="searchres">
        {results.map((v) => (
          <button
            key={v.id}
            className="resrow"
            onClick={() => {
              store.selectVehicle(v.id);
              store.setMode(null);
            }}
          >
            <span className="thumb" aria-hidden="true">{v.emoji}</span>
            <span>
              <span className="nm">{brandById(v.brand)?.name} {v.model}</span>
              <span className="meta">{v.trim} · {v.bodyType} · {v.fuelType} · {v.year}</span>
            </span>
            <span className="pw">
              <b>{v.horsepower} hp</b>
              <span>{v.acceleration}s · {usd(v.price)}</span>
            </span>
          </button>
        ))}
        {q && results.length === 0 && <div className="garage-empty">No results — try “V8”, “electric”, “600 hp”…</div>}
      </div>

      <div className="search-hint">
        {EXAMPLES.map((e) => (
          <button key={e} className="chip" style={{ cursor: 'pointer' }} onClick={() => setQ(e)}>
            {e}
          </button>
        ))}
      </div>

      <button className="iconbtn" style={{ position: 'absolute', top: 22, right: 22 }} onClick={() => store.setMode(null)} aria-label="Close search">✕</button>
    </div>
  );
}
