import { Vehicle } from '@/lib/types';

/**
 * Design DNA — per-vehicle styling cues so each model's 3D silhouette and
 * details resemble its real-world counterpart. Everything is optional;
 * the CarModel falls back to body-type defaults when a cue is absent.
 *
 * This is a curated table for ~70 vehicles. New cars work without an entry
 * (generic defaults apply), and adding a row instantly restyles that car.
 */

export type Grille = 'kidney' | 'panamericana' | 'singleframe' | 'slats' | 'mesh' | 'closed' | 'none';
export type LightShape = 'angel-eye' | 'starlight' | 'four-dot' | 'matrix' | 'slim-strip' | 'round' | 'boomerang' | 'blade' | 'y-shape';
export type SpoilerKind = 'lip' | 'ducktail' | 'wing' | 'swan-neck' | 'active' | 'none';
export type WheelStyle = 'double-spoke' | 'monoblock' | 'turbine' | 'y-spoke' | 'mesh' | 'aero' | 'classic-5' | 'cross-spoke';
export type ExhaustKind = 'quad' | 'dual-round' | 'dual-oval' | 'quad-center' | 'hidden' | 'none';

export interface CarDNA {
  /** paint-darkened roof (black-out) as on performance variants */
  blackRoof?: boolean;
  exhaust: ExhaustKind;
  grille: Grille;
  lights: LightShape;
  mirrors?: 'sleek' | 'winged' | 'cameras';
  /** 0–1, how muscular the arch flares are */
  muscle?: number;
  spoiler: SpoilerKind;
  stripes?: 'none' | 'centre' | 'dual';
  wheelStyle: WheelStyle;
}

const DEFAULTS: CarDNA = {
  exhaust: 'dual-round',
  grille: 'slats',
  lights: 'slim-strip',
  spoiler: 'none',
  wheelStyle: 'classic-5',
};

const T: Record<string, Partial<CarDNA>> = {
  /* BMW */
  'bmw-m5': { grille: 'kidney', lights: 'angel-eye', spoiler: 'lip', wheelStyle: 'double-spoke', exhaust: 'quad', muscle: 0.5, blackRoof: true },
  'bmw-m5-e34': { grille: 'kidney', lights: 'angel-eye', spoiler: 'none', wheelStyle: 'classic-5', exhaust: 'dual-round' },
  'bmw-m3': { grille: 'kidney', lights: 'angel-eye', spoiler: 'lip', wheelStyle: 'double-spoke', exhaust: 'quad', muscle: 0.5, blackRoof: true },
  'bmw-m4': { grille: 'kidney', lights: 'angel-eye', spoiler: 'ducktail', wheelStyle: 'double-spoke', exhaust: 'quad', muscle: 0.55, blackRoof: true },
  'bmw-m2': { grille: 'kidney', lights: 'angel-eye', spoiler: 'lip', wheelStyle: 'double-spoke', exhaust: 'quad', muscle: 0.6 },
  'bmw-x5': { grille: 'kidney', lights: 'angel-eye', spoiler: 'none', wheelStyle: 'turbine', exhaust: 'dual-round', muscle: 0.35 },
  'bmw-x3': { grille: 'kidney', lights: 'angel-eye', spoiler: 'none', wheelStyle: 'turbine', exhaust: 'dual-oval' },
  'bmw-i5': { grille: 'closed', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none', mirrors: 'cameras' },
  'bmw-i4': { grille: 'closed', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'aero', exhaust: 'none' },
  'bmw-i7': { grille: 'closed', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none', mirrors: 'cameras' },
  'bmw-8series': { grille: 'kidney', lights: 'angel-eye', spoiler: 'lip', wheelStyle: 'double-spoke', exhaust: 'quad' },
  'bmw-z4': { grille: 'kidney', lights: 'angel-eye', spoiler: 'lip', wheelStyle: 'double-spoke', exhaust: 'dual-oval' },

  /* Mercedes */
  'mercedes-amggt': { grille: 'panamericana', lights: 'slim-strip', spoiler: 'active', wheelStyle: 'monoblock', exhaust: 'dual-round', muscle: 0.6 },
  'mercedes-sclass': { grille: 'slats', lights: 'starlight', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'hidden' },
  'mercedes-c63': { grille: 'panamericana', lights: 'starlight', spoiler: 'lip', wheelStyle: 'monoblock', exhaust: 'quad', muscle: 0.5 },
  'mercedes-e53': { grille: 'panamericana', lights: 'starlight', spoiler: 'lip', wheelStyle: 'monoblock', exhaust: 'dual-round' },
  'mercedes-g63': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'dual-round', muscle: 0.4 },
  'mercedes-maybach': { grille: 'slats', lights: 'starlight', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'hidden' },
  'mercedes-eqe': { grille: 'closed', lights: 'starlight', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none', mirrors: 'cameras' },
  'mercedes-eqs': { grille: 'closed', lights: 'starlight', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none', mirrors: 'cameras' },
  'mercedes-gle': { grille: 'slats', lights: 'starlight', spoiler: 'none', wheelStyle: 'turbine', exhaust: 'hidden' },
  'mercedes-amg-sl': { grille: 'panamericana', lights: 'starlight', spoiler: 'lip', wheelStyle: 'monoblock', exhaust: 'quad' },

  /* Porsche */
  'porsche-911': { grille: 'none', lights: 'round', spoiler: 'active', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.4 },
  'porsche-911-gt3': { grille: 'none', lights: 'round', spoiler: 'swan-neck', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.5 },
  'porsche-911-turbo': { grille: 'none', lights: 'round', spoiler: 'active', wheelStyle: 'classic-5', exhaust: 'dual-oval', muscle: 0.55 },
  'porsche-911-carrera': { grille: 'none', lights: 'round', spoiler: 'active', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.4 },
  'porsche-718-cayman': { grille: 'none', lights: 'round', spoiler: 'wing', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.45 },
  'porsche-taycan': { grille: 'closed', lights: 'four-dot', spoiler: 'active', wheelStyle: 'aero', exhaust: 'none' },
  'porsche-taycan-turbo': { grille: 'closed', lights: 'four-dot', spoiler: 'active', wheelStyle: 'aero', exhaust: 'none' },
  'porsche-panamera': { grille: 'slats', lights: 'four-dot', spoiler: 'active', wheelStyle: 'monoblock', exhaust: 'dual-oval' },
  'porsche-macan-ev': { grille: 'closed', lights: 'four-dot', spoiler: 'lip', wheelStyle: 'aero', exhaust: 'none' },
  'porsche-cayenne': { grille: 'slats', lights: 'four-dot', spoiler: 'lip', wheelStyle: 'monoblock', exhaust: 'dual-oval' },
  'porsche-918': { grille: 'none', lights: 'round', spoiler: 'active', wheelStyle: 'turbine', exhaust: 'dual-oval', muscle: 0.5 },

  /* Audi */
  'audi-rs6': { grille: 'singleframe', lights: 'matrix', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'dual-oval', muscle: 0.5 },
  'audi-r8': { grille: 'singleframe', lights: 'matrix', spoiler: 'wing', wheelStyle: 'y-spoke', exhaust: 'quad', muscle: 0.55 },
  'audi-rs3': { grille: 'singleframe', lights: 'matrix', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'dual-oval' },
  'audi-rs7': { grille: 'singleframe', lights: 'matrix', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'dual-oval', muscle: 0.45 },
  'audi-rsq8': { grille: 'singleframe', lights: 'matrix', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'dual-oval' },
  'audi-e-tron-gt': { grille: 'closed', lights: 'matrix', spoiler: 'active', wheelStyle: 'aero', exhaust: 'none' },
  'audi-q8-e-tron': { grille: 'closed', lights: 'matrix', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none', mirrors: 'cameras' },
  'audi-rs5': { grille: 'singleframe', lights: 'matrix', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'dual-oval' },

  /* Ferrari */
  'ferrari-296gtb': { grille: 'mesh', lights: 'blade', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-round', muscle: 0.55 },
  'ferrari-sf90': { grille: 'mesh', lights: 'slim-strip', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-round', muscle: 0.6 },
  'ferrari-purosangue': { grille: 'mesh', lights: 'blade', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'quad', muscle: 0.4 },
  'ferrari-roma': { grille: 'mesh', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'classic-5', exhaust: 'quad' },
  'ferrari-812': { grille: 'mesh', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'classic-5', exhaust: 'quad', muscle: 0.6 },
  'ferrari-daytona': { grille: 'mesh', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.6 },

  /* Lamborghini */
  'lambo-huracan': { grille: 'mesh', lights: 'y-shape', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-oval', muscle: 0.65 },
  'lambo-revuelto': { grille: 'mesh', lights: 'y-shape', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-oval', muscle: 0.7 },
  'lambo-urus': { grille: 'mesh', lights: 'y-shape', spoiler: 'lip', wheelStyle: 'monoblock', exhaust: 'quad', muscle: 0.4 },
  'lambo-temerario': { grille: 'mesh', lights: 'y-shape', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-oval', muscle: 0.65 },

  /* McLaren */
  'mclaren-750s': { grille: 'mesh', lights: 'boomerang', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-round', muscle: 0.6 },
  'mclaren-750s-spider': { grille: 'mesh', lights: 'boomerang', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-round', muscle: 0.6 },
  'mclaren-artura': { grille: 'mesh', lights: 'boomerang', spoiler: 'active', wheelStyle: 'y-spoke', exhaust: 'dual-round', muscle: 0.55 },
  'mclaren-gts': { grille: 'mesh', lights: 'boomerang', spoiler: 'lip', wheelStyle: 'y-spoke', exhaust: 'dual-round' },

  /* Toyota */
  'toyota-supra': { grille: 'mesh', lights: 'slim-strip', spoiler: 'ducktail', wheelStyle: 'double-spoke', exhaust: 'dual-round', muscle: 0.5 },
  'toyota-gr-supra': { grille: 'mesh', lights: 'slim-strip', spoiler: 'ducktail', wheelStyle: 'double-spoke', exhaust: 'dual-round', muscle: 0.5 },
  'toyota-gr-yaris': { grille: 'mesh', lights: 'slim-strip', spoiler: 'wing', wheelStyle: 'double-spoke', exhaust: 'dual-round', muscle: 0.5 },
  'toyota-gr86': { grille: 'mesh', lights: 'slim-strip', spoiler: 'ducktail', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.4 },
  'toyota-camry': { grille: 'slats', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'turbine', exhaust: 'hidden' },
  'toyota-landcruiser': { grille: 'slats', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'hidden', muscle: 0.3 },

  /* Nissan */
  'nissan-gtr': { grille: 'mesh', lights: 'boomerang', spoiler: 'wing', wheelStyle: 'double-spoke', exhaust: 'quad', muscle: 0.6 },
  'nissan-gtr-r34': { grille: 'slats', lights: 'round', spoiler: 'wing', wheelStyle: 'classic-5', exhaust: 'quad', muscle: 0.5 },
  'nissan-z': { grille: 'mesh', lights: 'slim-strip', spoiler: 'ducktail', wheelStyle: 'classic-5', exhaust: 'dual-round', muscle: 0.5 },
  'nissan-ariya': { grille: 'closed', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none' },
  'nissan-leaf': { grille: 'closed', lights: 'boomerang', spoiler: 'lip', wheelStyle: 'aero', exhaust: 'none' },

  /* Tesla */
  'tesla-models': { grille: 'closed', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'aero', exhaust: 'none' },
  'tesla-model3': { grille: 'closed', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none' },
  'tesla-model-y': { grille: 'closed', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'aero', exhaust: 'none' },
  'tesla-cybertruck': { grille: 'closed', lights: 'blade', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none' },
  'tesla-roadster-2': { grille: 'closed', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'turbine', exhaust: 'none' },

  /* Ford */
  'ford-mustang': { grille: 'mesh', lights: 'slim-strip', spoiler: 'ducktail', wheelStyle: 'turbine', exhaust: 'quad', muscle: 0.6, stripes: 'dual' },
  'ford-mustang-gtd': { grille: 'mesh', lights: 'slim-strip', spoiler: 'swan-neck', wheelStyle: 'monoblock', exhaust: 'quad-center', muscle: 0.7, stripes: 'centre' },
  'ford-gt': { grille: 'mesh', lights: 'slim-strip', spoiler: 'active', wheelStyle: 'monoblock', exhaust: 'dual-round', muscle: 0.6 },
  'ford-bronco': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'dual-oval', muscle: 0.35 },
  'ford-focus-st': { grille: 'mesh', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'double-spoke', exhaust: 'dual-round' },
  'ford-f150': { grille: 'slats', lights: 'blade', spoiler: 'none', wheelStyle: 'turbine', exhaust: 'none' },

  /* Maruti Suzuki */
  'maruti-swift': { grille: 'slats', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'classic-5', exhaust: 'hidden' },
  'maruti-baleno': { grille: 'slats', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'classic-5', exhaust: 'hidden' },
  'maruti-dzire': { grille: 'slats', lights: 'slim-strip', spoiler: 'none', wheelStyle: 'classic-5', exhaust: 'hidden' },
  'maruti-fronx': { grille: 'slats', lights: 'slim-strip', spoiler: 'lip', wheelStyle: 'classic-5', exhaust: 'hidden' },

  /* Tata */
  'tata-nexon': { grille: 'slats', lights: 'y-shape', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'hidden', muscle: 0.35 },
  'tata-punch': { grille: 'slats', lights: 'y-shape', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'hidden', muscle: 0.3 },
  'tata-harrier': { grille: 'slats', lights: 'y-shape', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'hidden', muscle: 0.4 },
  'tata-nexon-ev': { grille: 'closed', lights: 'y-shape', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none' },

  /* Mahindra */
  'mahindra-thar': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'dual-round', muscle: 0.5 },
  'mahindra-xuv700': { grille: 'slats', lights: 'blade', spoiler: 'none', wheelStyle: 'turbine', exhaust: 'dual-round', muscle: 0.35 },
  'mahindra-scorpio-n': { grille: 'slats', lights: 'blade', spoiler: 'none', wheelStyle: 'cross-spoke', exhaust: 'dual-round', muscle: 0.4 },
  'mahindra-be6': { grille: 'closed', lights: 'blade', spoiler: 'none', wheelStyle: 'aero', exhaust: 'none' },

  /* Rolls-Royce */
  'rolls-phantom': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'hidden', muscle: 0.2 },
  'rolls-ghost': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'hidden' },
  'rolls-cullinan': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'hidden', muscle: 0.25 },
  'rolls-spectre': { grille: 'closed', lights: 'round', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'none' },
  'rolls-wraith': { grille: 'slats', lights: 'round', spoiler: 'none', wheelStyle: 'monoblock', exhaust: 'hidden', muscle: 0.15 },
};

export function dnaFor(v: Vehicle): CarDNA {
  return { ...DEFAULTS, ...(T[v.id] ?? {}) };
}
