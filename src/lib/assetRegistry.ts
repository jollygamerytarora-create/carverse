/**
 * CARVERSE vehicle asset registry.
 *
 * Every 3D asset used by the site is declared here — never hard-coded in a
 * component — together with its full provenance (creator, license, source
 * URL and attribution string). A vehicle whose record has `model3D: null`
 * has NO approved asset yet; the UI must show the "model unavailable" state
 * (see §25 of the asset standard) instead of a placeholder silhouette.
 *
 * Adding a car = drop its GLB under /public/cars/<brand>/<model>/ and add a
 * record here. No component changes.
 */

export interface AssetLicense {
  /** SPDX id or short name, e.g. 'CC-BY-4.0', 'CC-BY-NC-4.0', 'Commercial' */
  type: string;
  creator: string;
  source: string;
  /** Human-readable credit line rendered by the credits panel */
  attribution: string;
  licenseURL?: string;
  /** true when CARVERSE may redistribute the file itself (public/ folder) */
  redistributable: boolean;
}

export interface VehicleAnimations {
  doors: boolean;
  hood: boolean;
  trunk: boolean;
  lights: boolean;
  /** a generic slow-turntable clip embedded in the GLB */
  spin: boolean;
}

/**
 * Kit part: where a source asset ships ONE instance of a repeated component
 * (e.g. a single wheel meant to be instanced to 4 corners) or one flank of a
 * symmetric pair (doors/mirrors), the stage duplicates them per this recipe.
 * All positions are in the asset's own authoring units (e.g. cm).
 */
export interface AssetKitPart {
  /** name (startsWith match) of the top-level group in the GLB to work on */
  source: string;
  /** reposition the source instance itself (e.g. snap the wheel to a corner) */
  keep?: { pos: [number, number, number]; yaw?: number };
  /** additional instances cloned from the source group */
  clones?: {
    pos: [number, number, number];
    /** yaw (radians) — e.g. Math.PI turns a wheel to face the opposite side */
    yaw?: number;
    /** mirror across the car's centreline (scale z = −1; three.js handles winding) */
    mirrorZ?: boolean;
  }[];
}

/**
 * Material theme: re-tints meshes whose NAME matches, for assets that ship
 * demo/clay materials (e.g. BMW's interior ships uniform #e7e7e7). First
 * matching theme wins; materials named paint are skipped (they follow the
 * body colour).
 */
export interface AssetMaterialTheme {
  /** regex source tested against mesh names */
  meshPattern: string;
  color: string;
  roughness?: number;
  metalness?: number;
}

export interface VehicleAsset {
  /** absolute or /public-relative path of the exterior GLB */
  model3D: string | null;
  interiorModel3D: string | null;
  engineSound: string | null;
  thumbnail?: string;
  license: AssetLicense;
  animations: VehicleAnimations;
  /** yaw (radians) applied so the car faces the stage's default direction */
  rotationY?: number;
  /** optional extra uniform scale applied after box-normalisation */
  scale?: number;
  /** instancing/mirroring recipes executed before normalisation */
  kitParts?: AssetKitPart[];
  /** mesh names to hide on load (e.g. nested demo liners that poke through the outer skin) */
  hiddenMeshes?: string[];
  /** realistic re-theming for demo/clay materials (interiors, trim) */
  materialThemes?: AssetMaterialTheme[];
  /**
   * Meshes that form the BODY PAINT even though their material isn't named
   * "paint" (e.g. BMW's main shell shares the general clay material).
   * Regex tested against mesh names.
   */
  bodyPaintMeshPattern?: string;
  /**
   * Materials that carry BODY PAINT even though their name isn't "paint"
   * (artist catch-alls like "grille_neon" or "Material" that actually hold
   * the shell panels). Regex tested against MATERIAL names; combined with
   * the default /(^|_)paint\b/ rule, never replaces it.
   */
  paintMaterialPattern?: string;
  /**
   * Materials that are NEVER body paint for this asset even when the paint
   * pass would otherwise classify their meshes as body skin (artist wheels
   * or glass hiding under anonymous names). Regex tested against MATERIAL
   * names; stronger than paintMaterialPattern.
   */
  excludeMaterialPattern?: string;
  /**
   * Axis fix for assets authored Z-up (the car stands on its nose in world
   * space). 'z-up' rotates -90° about X so the author's +Z becomes up.
   * Detected by scripts/probe_upaxis.py (worldY > 1.25 × max(worldX, worldZ)).
   */
  axisFix?: 'z-up';
  /**
   * Prune meshes sitting above this height along the asset's ORIGINAL up
   * axis (authoring units) — removes stacked duplicate variant shells that
   * some uploads ship (e.g. bmw-m5 floats a 106-mesh second variant at z>2).
   */
  hideBeyondOriginalAxis?: number;
  /**
   * Mirror of hideBeyondOriginalAxis: prune meshes sitting BELOW this height
   * along the asset's ORIGINAL up axis (authoring units) — removes
   * disconnected debris strips some uploads ship (e.g. rolls-spectre floats
   * a front-clip strip at z < -2.35, separated from the intact body).
   */
  hideBelowOriginalAxis?: number;
  /**
   * Asset ships WITHOUT wheel geometry (e.g. bmw-m5 artist upload omits all
   * four corners). The stage appends a procedural wheel kit — dark tires +
   * metallic alloys — in normalised stage space, so the car reads complete.
   */
  wheelKit?: boolean;
  /** free-text QC note shown in the credits panel */
  qcNote?: string;
}

/**
 * Licenses in active use. Each entry documents one third-party asset family.
 */
export const LICENSE_BMW_G05: AssetLicense = {
  type: 'CC-BY-4.0',
  creator: 'BMW AG (bmwcarit/digital-car-3d)',
  source: 'https://github.com/bmwcarit/digital-car-3d',
  attribution: 'BMW X5 (G05) 3D model © BMW AG, licensed under CC BY 4.0 — modified (parts merged, repacked to GLB, wheel kit instanced to four corners, doors/mirrors mirrored for the opposite flank) by CARVERSE.',
  licenseURL: 'https://creativecommons.org/licenses/by/4.0/',
  redistributable: true,
};

export const ASSET_RECORDS: Record<string, VehicleAsset> = {
  /*
   * ✅ 3D READY — authentic manufacturer geometry (BMW official CC-BY repo),
   * exact vehicle + generation match, doors/hood/tailgate present as separate
   * groups for hinge animation, full interior contained in the same GLB.
   * Built by scripts/fetch_g05.py + scripts/build_g05_glb.py.
   */
  'bmw-x5': {
    model3D: '/cars/bmw/x5-g05/car.glb',
    interiorModel3D: null, // full interior is contained in car.glb
    engineSound: null, // falls back to the labelled synthesis engine
    license: LICENSE_BMW_G05,
    animations: { doors: true, hood: true, trunk: true, lights: false, spin: false },
    rotationY: Math.PI / 2, // source nose points -X; our stage faces +Z
    scale: 1,
    /*
     * BMW ships one wheel kit and left-flank doors/mirrors only — the demo
     * engine instances/mirrors them at runtime. These recipes do the same in
     * our stage (source units: cm; axles at x −3 / 294.5, track ±84.5).
     */
    kitParts: [
      {
        source: 'G_Wheels_O_G05_Wheels',
        keep: { pos: [-3, 0, 84.5] }, // original kit → front-left corner
        clones: [
          { pos: [-3, 0, -84.5], yaw: Math.PI }, // front-right (yaw flips outboard face)
          { pos: [294.5, 0, 84.5] }, // rear-left
          { pos: [294.5, 0, -84.5], yaw: Math.PI }, // rear-right
        ],
      },
      {
        // front doors + side mirrors — mirrored to the right flank
        source: 'G_Doors_O_G05_Doors_F',
        clones: [{ pos: [0, 0, 0], mirrorZ: true }],
      },
      {
        source: 'G_Doors_O_G05_Doors_B',
        clones: [{ pos: [0, 0, 0], mirrorZ: true }],
      },
    ],
    /*
     * BMW authors the hood as three stacked shells: the outermost skin
     * carries the under-hood material and the bay filler shares its top
     * plane — both read as a dark patch over the true paint skin 0.4 cm
     * below. The paint skin fully covers the hood, so the two dark shells
     * are hidden. QC'd visually 2026-09.
     */
    hiddenMeshes: ['001_Hood_paint', '003_Hood_void'],
    /*
     * BMW ships the whole cabin in one demo clay material (#e7e7e7). These
     * recipes theme it like a real X5 Sensafin/leather cabin. Ordered —
     * first match wins. QC'd visually 2026-09.
     */
    materialThemes: [
      { meshPattern: 'Dashboard', color: '#17181c', roughness: 0.8 },
      { meshPattern: 'SteeringWheel', color: '#232323', roughness: 0.6 },
      { meshPattern: 'Seats', color: '#5f4632', roughness: 0.66 },
      { meshPattern: 'Interior_Color', color: '#202227', roughness: 0.75 },
      { meshPattern: 'Interior_none|Interior_common', color: '#2a2d31', roughness: 0.82 },
      { meshPattern: 'Tailgate_U_interior|Tailgate_D_interior|Tailgate_[UD]_paint$', color: '#232529', roughness: 0.8 },
    ],
    /*
     * BMW's unibody shell (001_Exterior_paint) shares the general clay
     * material instead of the paint-named one the doors/tailgate skins use —
     * without this it stays demo-white under configurator colours.
     */
    bodyPaintMeshPattern: 'Exterior_paint$',
    qcNote: undefined,
  },

  /*
   * Every other vehicle keeps model3D: null until its authentic asset is
   * acquired. Each of those shows its OWN "model unavailable" state (never a
   * global block) while all data experiences stay live. To promote a car to
   * 3D READY: drop its GLB under /cars/<brand>/<model>/ and add a record
   * here — see /public/cars/README.md. No component changes needed.
   */
};

/* ---------- lookup helpers (data-driven, no component hard-codes) ---------- */

import { GENERATED_RECORDS } from './generatedAssetRecords';

/**
 * Resolve a vehicle's asset: hand-curated records first, then auto-registered
 * acquired assets (scripts/sync_registry.js scans /public/cars/ at build).
 */
export const vehicleAssetFor = (vehicleId: string): VehicleAsset | undefined => ASSET_RECORDS[vehicleId] ?? GENERATED_RECORDS[vehicleId];

/** True only when the vehicle passes the §27 QC bar (own asset, licensed). */
export const is3DReady = (vehicleId: string): boolean => {
  const a = ASSET_RECORDS[vehicleId];
  return !!a && !!a.model3D && !a.qcNote;
};

/* ---------- camera preset definitions (§12) ---------- */

export interface CameraPreset {
  id: string;
  label: string;
  /** spherical angles + target used by the Showroom CameraRig */
  theta: number;
  phi: number;
  dist: number;
  target?: [number, number, number];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  { id: 'front34', label: 'FRONT ¾', theta: 0.62, phi: 1.34, dist: 7.2 },
  { id: 'side', label: 'SIDE', theta: Math.PI / 2, phi: 1.4, dist: 8 },
  { id: 'rear34', label: 'REAR ¾', theta: Math.PI - 0.62, phi: 1.34, dist: 7.2 },
  { id: 'front', label: 'FRONT', theta: 0, phi: 1.42, dist: 7 },
  { id: 'rear', label: 'REAR', theta: Math.PI, phi: 1.42, dist: 7 },
  { id: 'top', label: 'TOP', theta: 0.8, phi: 0.5, dist: 8 },
  { id: 'wheels', label: 'WHEELS', theta: 1.05, phi: 1.5, dist: 3.6, target: [1.6, 0.55, 0.6] },
  { id: 'headlights', label: 'LIGHTS', theta: 0.28, phi: 1.44, dist: 3.4, target: [0, 0.95, 2.2] },
];
