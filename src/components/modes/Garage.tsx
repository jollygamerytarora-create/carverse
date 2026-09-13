'use client';

import { vehicleById } from '@/data';
import { brandById } from '@/data/brands';
import { useStore } from '@/lib/store';

export default function Garage() {
  const store = useStore();
  const cars = store.garage.map((id) => vehicleById(id)).filter(Boolean);

  return (
    <div className="garage-wrap" role="dialog" aria-label="My garage">
      <h2>My Garage</h2>
      <span className="k">{cars.length} saved {cars.length === 1 ? 'car' : 'cars'}</span>
      <button className="iconbtn" style={{ position: 'fixed', top: 22, right: 22 }} onClick={() => store.setMode(null)} aria-label="Close garage">✕</button>

      {cars.length === 0 ? (
        <div className="garage-empty">Your garage is empty — tap ☆ on any car to save it here</div>
      ) : (
        <div className="garage-grid">
          {cars.map((v) => (
            <div key={v!.id} className="garage-card">
              <h3>{brandById(v!.brand)?.name} {v!.model}</h3>
              <div className="meta">{v!.trim} · {v!.horsepower} hp · {v!.acceleration}s · 0–100</div>
              <div className="acts">
                <button onClick={() => { store.selectVehicle(v!.id); store.setMode(null); }}>Explore</button>
                <button onClick={() => { store.setCompare(v!.id, store.compareLeftId === v!.id ? store.compareRightId : store.compareLeftId === store.compareRightId ? 'bmw-m5' : store.compareLeftId); if (store.compareLeftId === v!.id) store.setCompare(v!.id, store.compareRightId); else store.setCompare(store.compareLeftId, v!.id); store.setMode('compare'); }}>Compare</button>
                <button onClick={() => { store.selectVehicle(v!.id); store.setMode('configure'); }}>Configure</button>
                <button onClick={() => store.toggleFavorite(v!.id)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
