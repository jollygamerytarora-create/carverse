import { Vehicle, HistoryMilestone } from '@/lib/types';
import { VEHICLES_1 } from './vehicles1';
import { VEHICLES_2 } from './vehicles2';
import { EXPANDED_1 } from './expanded1';
import { EXPANDED_2 } from './expanded2';
import { EXPANDED_3 } from './expanded3';
import { EXPANDED_4 } from './expanded4';
import { EXPANDED_5 } from './expanded5';

export const VEHICLES: Vehicle[] = [...VEHICLES_1, ...VEHICLES_2, ...EXPANDED_1, ...EXPANDED_2, ...EXPANDED_3, ...EXPANDED_4, ...EXPANDED_5];

export const vehicleById = (id: string): Vehicle | undefined =>
  VEHICLES.find((v) => v.id === id);

export const vehiclesByBrand = (brandId: string): Vehicle[] =>
  VEHICLES.filter((v) => v.brand === brandId);

export const DEMO_NOTE =
  'Demo/prototype data — figures are representative estimates, not official manufacturer specifications.';

export interface CarFilter {
  brand?: string;
  bodyType?: string;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  country?: string;
  minPower?: number;
  maxPrice?: number;
  maxAcceleration?: number;
  cylinders?: number;
  minElectricRange?: number;
}

export function filterVehicles(f: CarFilter): Vehicle[] {
  return VEHICLES.filter((v) => {
    if (f.brand && v.brand !== f.brand) return false;
    if (f.bodyType && v.bodyType !== f.bodyType) return false;
    if (f.fuelType && v.fuelType !== f.fuelType) return false;
    if (f.transmission && !v.transmission.toLowerCase().includes(f.transmission.toLowerCase())) return false;
    if (f.driveType && v.driveType !== f.driveType) return false;
    if (f.country && v.country !== f.country) return false;
    if (f.minPower && v.horsepower < f.minPower) return false;
    if (f.maxPrice && v.price > f.maxPrice) return false;
    if (f.maxAcceleration && v.acceleration > f.maxAcceleration) return false;
    if (f.cylinders && v.cylinders !== f.cylinders) return false;
    if (f.minElectricRange && v.electricRange < f.minElectricRange) return false;
    return true;
  });
}

export interface Category {
  id: string;
  label: string;
  emoji: string;
  description: string;
  match: (v: Vehicle) => boolean;
}

export const CATEGORIES: Category[] = [
  { id: 'performance', label: 'Performance', emoji: '🔥', description: 'Serious pace, serious hardware', match: (v) => v.horsepower >= 600 },
  { id: 'ev', label: 'EV', emoji: '⚡', description: 'Electric power, instant torque', match: (v) => v.fuelType === 'electric' },
  { id: 'supercars', label: 'Supercars', emoji: '🏎️', description: 'Exotic mid- and rear-engine icons', match: (v) => v.price >= 150000 && v.seats <= 2 },
  { id: 'luxury', label: 'Luxury', emoji: '👑', description: 'First-class travel', match: (v) => v.price >= 120000 && v.seats >= 4 },
  { id: 'suvs', label: 'SUVs', emoji: '🚙', description: 'High-riding capability', match: (v) => v.bodyType === 'suv' },
  { id: 'affordable', label: 'Affordable', emoji: '💰', description: 'Performance on a budget', match: (v) => v.price < 75000 },
  { id: 'firstcar', label: 'First Car', emoji: '🧑‍🎓', description: 'Friendly, sensible, fun', match: (v) => v.price < 60000 && v.seats >= 4 },
  { id: 'gt', label: 'Grand Tourers', emoji: '🛣️', description: 'Cross continents in comfort', match: (v) => v.bodyType === 'gt' || (v.seats >= 4 && v.horsepower >= 500) },
  { id: 'longrange', label: 'Long Range', emoji: '🔋', description: 'Electric miles without worry', match: (v) => v.electricRange >= 500 },
  { id: 'track', label: 'Track Cars', emoji: '🏁', description: 'Straight from circuit to road', match: (v) => (v.acceleration <= 3.2 && v.seats <= 2) || v.model.includes('Dark Horse') || v.model.includes('STO') },
];

export const categoryById = (id: string): Category | undefined => CATEGORIES.find((c) => c.id === id);
