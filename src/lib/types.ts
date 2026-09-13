export type BodyType = 'sedan' | 'coupe' | 'suv' | 'sports' | 'hyper' | 'gt' | 'estate' | 'hot-hatch';
export type FuelType = 'petrol' | 'diesel' | 'hybrid' | 'electric';

export interface CarColors {
  name: string;
  hex: string;
}

export interface GenerationSpec {
  code: string;
  years: string;
  engine: string;
  power: number;
  acceleration: number;
  note: string;
}

export interface Vehicle {
  id: string;
  brand: string;
  model: string;
  trim: string;
  generation: string;
  year: number;
  bodyType: BodyType;
  emoji: string;
  engine: string;
  engineSize: string;
  cylinders: number;
  horsepower: number;
  torque: number;
  transmission: string;
  driveType: 'RWD' | 'AWD' | 'FWD';
  acceleration: number; // 0-100 km/h seconds
  topSpeed: number; // km/h
  weight: number; // kg
  length: number; // mm
  width: number; // mm
  height: number; // mm
  wheelbase: number; // mm
  fuelType: FuelType;
  fuelEconomy: string;
  electricRange: number; // km, 0 = n/a
  bootCapacity: number; // litres
  seats: number;
  price: number; // USD, demo estimate
  country: string;
  description: string;
  history: string;
  funFacts: string[];
  features: string[];
  safety: string[];
  interiorFeatures: string[];
  exteriorFeatures: string[];
  variants: string[];
  colors: CarColors[];
  generationHistory: GenerationSpec[];
  awards: string[];
  sound: SoundProfile;
  // replaceable asset hooks
  model3D: string | null;
  interiorModel3D: string | null;
  engineSound: string | null;
}

export interface SoundProfile {
  base: number; // base frequency Hz
  cylinders: number;
  character: 'flat' | 'smooth' | 'growl' | 'scream' | 'buzz' | 'silence';
  electric: boolean;
}

export interface Brand {
  id: string;
  name: string;
  fullName?: string;
  country: string;
  founded: number;
  description: string;
  website: string;
  accent: string;
  env: 'metallic' | 'studio' | 'luxury' | 'dramatic' | 'angular';
  vehicles: string[]; // vehicle ids
}

export interface HistoryMilestone {
  year: string;
  title: string;
  text: string;
}
