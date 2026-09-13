import { Vehicle, BodyType, FuelType, CarColors, GenerationSpec, SoundProfile } from '@/lib/types';

/* ---------- shared palettes ---------- */

const P = (name: string, hex: string): CarColors => ({ name, hex });

export const PAINT = {
  white: P('Alpine White', '#e8eaee'),
  black: P('Jet Black', '#0b0d10'),
  silver: P('Glacier Silver', '#a7adb5'),
  grey: P('Nardo Grey', '#8b9097'),
  darkGrey: P('Graphite', '#3c4046'),
  blue: P('Estoril Blue', '#1f5fae'),
  darkBlue: P('Tanzanite Blue', '#101c33'),
  lightBlue: P('Yas Marina Blue', '#3f7fc4'),
  red: P('Imola Red', '#c0272d'),
  darkRed: P('Melbourne Red', '#7a1016'),
  green: P('Isle of Man Green', '#0f5c3f'),
  darkGreen: P('British Racing Green', '#0d2f22'),
  orange: P('Fire Orange', '#e05a1a'),
  yellow: P('Speed Yellow', '#f0c020'),
  gold: P('Solar Gold', '#c9a13b'),
  purple: P('Twilight Purple', '#3b2a5e'),
  bronze: P('Frozen Bronze', '#8a6a42'),
  brown: P('Mocha Brown', '#4a3428'),
  taycan: P('Frozen Berry', '#7a4a8a'),
  papaya: P('Papaya Spark', '#ff7a1a'),
  vulcan: P('Volcano Red', '#e02020'),
  bluPozzi: P('Blu Pozzi', '#123a6e'),
  rosso: P('Rosso Corsa', '#d40000'),
  giallo: P('Giallo Orion', '#f2c200'),
  verde: P('Verde Mantis', '#6fce3a'),
  arancio: P('Arancio Borealis', '#ff6a00'),
  mclaren: P('McLaren Orange', '#ff7a1a'),
  teslaRed: P('Red Multi-Coat', '#9c1a1a'),
  deepBlue: P('Deep Blue Metallic', '#1a3a5c'),
  guard: P('Guard Metallic', '#3a5c3a'),
  race: P('Race Red', '#d01818'),
  grabber: P('Grabber Blue', '#1e78c8'),
  twinTurbo: P('Bayside Blue', '#2a6ad4'),
  midnight: P('Midnight Purple', '#241a3e'),
  silverstone: P('Silverstone Grey', '#9aa0a8'),
};

/* ---------- generation helpers ---------- */

export function gens(...list: [code: string, years: string, engine: string, power: number, acc: number, note: string][]): GenerationSpec[] {
  return list.map(([code, years, engine, power, acceleration, note]) => ({ code, years, engine, power, acceleration, note }));
}

export function sounds(base: number, cylinders: number, character: SoundProfile['character'], electric = false): SoundProfile {
  return { base, cylinders, character, electric };
}

/* ---------- factory ---------- */

export interface VehicleSpec {
  id: string;
  brand: string;
  model: string;
  trim?: string;
  generation?: string;
  year?: number;
  body: BodyType;
  emoji?: string;
  engine: string;
  size: string;
  cyl: number;
  hp: number;
  tq: number;
  trans: string;
  drive: Vehicle['driveType'];
  acc: number;
  vmax: number;
  weight?: number;
  L?: number;
  W?: number;
  H?: number;
  wb?: number;
  fuel?: FuelType;
  econ?: string;
  range?: number;
  boot?: number;
  seats?: number;
  price: number;
  desc: string;
  history: string;
  facts: string[];
  feat: string[];
  safe: string[];
  inter: string[];
  ext: string[];
  variants?: string[];
  colors: CarColors[];
  genHistory?: GenerationSpec[];
  awards?: string[];
  sound: SoundProfile;
  model3D?: string | null;
}

/**
 * Compact vehicle builder. Any omitted technical field is filled with a
 * class-typical demo estimate (clearly labelled as demo data in the UI).
 */
export function makeVehicle(s: VehicleSpec): Vehicle {
  const low = s.body === 'sports' || s.body === 'hyper';
  const suv = s.body === 'suv';
  const L = s.L ?? (suv ? 4900 : low ? 4500 : 4800);
  const W = s.W ?? (suv ? 1990 : low ? 1900 : 1850);
  const H = s.H ?? (suv ? 1740 : low ? 1300 : 1440);
  const wb = s.wb ?? (suv ? 2970 : low ? 2650 : 2850);
  return {
    id: s.id,
    brand: s.brand,
    model: s.model,
    trim: s.trim ?? '',
    generation: s.generation ?? '',
    year: s.year ?? 2024,
    bodyType: s.body,
    emoji: s.emoji ?? '🚗',
    engine: s.engine,
    engineSize: s.size,
    cylinders: s.cyl,
    horsepower: s.hp,
    torque: s.tq,
    transmission: s.trans,
    driveType: s.drive,
    acceleration: s.acc,
    topSpeed: s.vmax,
    weight: s.weight ?? (suv ? 2200 : low ? 1500 : 1750),
    length: L,
    width: W,
    height: H,
    wheelbase: wb,
    fuelType: s.fuel ?? 'petrol',
    fuelEconomy: s.econ ?? '9.5 L/100 km (est.)',
    electricRange: s.range ?? 0,
    bootCapacity: s.boot ?? (suv ? 650 : low ? 200 : 480),
    seats: s.seats ?? (low ? 2 : 5),
    price: s.price,
    country: '',
    description: s.desc,
    history: s.history,
    funFacts: s.facts,
    features: s.feat,
    safety: s.safe,
    interiorFeatures: s.inter,
    exteriorFeatures: s.ext,
    variants: s.variants ?? [],
    colors: s.colors,
    generationHistory: s.genHistory ?? [],
    awards: s.awards ?? [],
    sound: s.sound,
    model3D: s.model3D ?? null,
    interiorModel3D: null,
    engineSound: null,
  };
}

/* generic content helpers — shared feature sets keep 60 entries manageable */

const ADAS = ['Adaptive cruise control', 'Lane-keeping assist', 'AEB with pedestrian detection', 'Blind-spot monitoring'];
const BASE_FEAT = ['Digital instrument cluster', 'Wireless smartphone integration', 'LED signature lighting', 'Drive-mode selection'];
const PERF_FEAT = ['Launch control', 'Adaptive dampers', 'Sport exhaust', 'Carbon-ceramic brakes (optional)'];
const LUX_INTER = ['Leather upholstery', 'Heated & ventilated front seats', 'Ambient lighting', 'Premium surround audio'];
const SPORT_INTER = ['Sport bucket seats', 'Alcantara detailing', 'Flat-bottom steering wheel', 'Aluminium pedals'];
const SUV_EXT = ['Roof rails', 'Powered tailgate', 'Privacy glass', 'All-season tyre fitment'];
const GENERIC_EXT = ['LED lighting signature', 'Privacy glass', 'Alloy wheel range', 'Powered tailgate on SUVs'];

export function standard(feats: string[] = [], inter: string[] = []): { feat: string[]; safe: string[]; inter: string[]; ext: string[] } {
  return {
    feat: [...BASE_FEAT, ...feats],
    safe: ADAS,
    inter: inter.length ? inter : LUX_INTER,
    ext: GENERIC_EXT,
  };
}

export function sporty(ext: string[] = []): { feat: string[]; safe: string[]; inter: string[]; ext: string[] } {
  return {
    feat: [...BASE_FEAT, ...PERF_FEAT],
    safe: ADAS,
    inter: SPORT_INTER,
    ext: ['Aero-enhanced bodywork', ...ext],
  };
}
