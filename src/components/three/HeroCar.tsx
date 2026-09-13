'use client';

/**
 * HERO VEHICLE STAGE — renders the registered 3D asset for the active vehicle.
 *
 * Architecture (per the CARVERSE asset standard):
 *  - Assets come ONLY from `src/lib/assetRegistry.ts` (data-driven; no
 *    component hard-codes a car).
 *  - Every loaded GLB is normalised to a real-car footprint (~4.6 m long)
 *    and sits on the floor plane regardless of authoring scale.
 *  - Paint is re-themed per colour selection with a clearcoat PBR finish.
 *  - Embedded animation clips are played; missing interactions are disabled
 *    upstream rather than faked (§10).
 *  - Vehicles with no registered asset show the §25 "model unavailable"
 *    state — never a placeholder silhouette.
 */

import { Suspense, useEffect, useMemo, useRef, Component, ReactNode } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { pinAsset, unpinAsset, noteParsed } from '@/lib/assetPreloader';
import { useGLTF, Html } from '@react-three/drei';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Vehicle } from '@/lib/types';
import { vehicleAssetFor, VehicleAsset, AssetKitPart } from '@/lib/assetRegistry';
import CarModel from './CarModel';

/* ---------------- automotive paint (§5–6) ---------------- */

/*
 * UNIVERSAL PAINT — multi-language matching + geometry.
 * Sketchfab artists name things in their own language: "Carro_Pintura" (PT
 * car paint), "carrosserie" (FR), "vernice" (IT), or nothing at all
 * ("Object_N"). Names alone can therefore never cover the fleet, so the
 * pass classifies meshes in tiers, OR'd per mesh:
 *   1. paint-named MATERIALS in any supported language
 *   2. registry-declared catch-alls (per-asset recipes)
 *   3. body-panel MESH names (multi-language)
 *   4. GEOMETRY — meshes that reach the car's flank band / roof band and
 *      are not glass, lamps, wheels, interior or underbody are body skin,
 *      whatever they're called.
 * Lamps (emissive) and transparent glass never follow the paint; wheels —
 * named or geometric — get a dark-alloy material clone so they stay dark
 * even when the artist shared the body material instance with them.
 */

const CV_PAINT_MAT_RE = /(^|_)paint\b|(^|_)lack(?!ier)|carrocer|carrosser|pintura|vernice|peinture|body_?colou?r|karosser/i;
const CV_BODY_MESH_RE = /\b(body|shell|carroceria|carrocería|carrosserie|door|porta|hood|bonnet|capo|fender|paralama|wing|bumper|parachoque|quarter|roof|teto|trunk|mala|tailgate|porton|portamalas|boot|panel|skirt|estribo|mirror|espelho|spoiler|diffuser|difusor|sill|arch|hardtop)\b/i;
const CV_NONBODY_MESH_RE = /glass|vidro|window|windscreen|windshield|para.?brisa|light|lamp|farol|faro|lanterna|stoplight|taillight|headlight|refletor|reflector|indicator|chrome|cromado|cromo|grill|kühlergrill|calandre|grade|grelha|parrilla|badge|emblem|logo|tire|tyre|pneu|reifen|pneumatico|neumatico|goma|wheel|roda|llanta|rueda|interior|interno|seat|banco|dash|console|screen|cluster|radio|fabric|leather|couro|carpet|tapete|exhaust|escape|pipe|muffler|suspension|axle|eixo|disc|brake|freio|caliper|pinza|underbody|chassis|chassi|frame|undercarriage|engine|motor|radiator|radiador|intercool|plastic|plastico/i;
const CV_WHEEL_MESH_RE = /wheel|rim|tyre|tire|pneu|reifen|pneumatico|neumatico|roda|llanta|calota|hubcap|alloy/i;

/*
 * Material-NAME signals that a surface is never body paint — many uploads
 * leave meshes anonymous but name their materials (PT "Carro_Farol", DE
 * "Felge"/"Scheibe", FR "vitre", IT "cerchio"). A paint-named material
 * always wins; bare colour words rescue "LightBlue"-style paint names from
 * the light/lamp token.
 */
const CV_STRONG_NONBODY_MAT_RE = /glass|glas|vidro|vidrio|verre|vitre|cristal|scheibe|fenster|verglasung|windshield|windscreen|parabris|window|janela|vetro|finestr|tire|tyre|pneu|reifen|bereifung|gomma|wheel|rim|roda|llanta|rueda|felge|cerchio|jante|jente|hubcap|calota|chrome|chrom|cromado|cromo|grille|grill|grelha|parrilla|rubber|borrach|headlight|taillight|brakelight|lightbar|frein|plaquette|etrier|brembo|visse|carbone/i;
const CV_LIGHT_MAT_RE = /light|lamp|farol|faro|lanterna|indicator|blink|reflector|refletor/i;
const CV_COLORISH_MAT_RE = /paint|pintura|lack|karosser|colou?r|blue|red|green|white|yellow|grey|gray|orange|black|silver|gold|beige|bronze/i;
/* cabin + plate materials: "IntAlcantara", "intLeatherRed", "IntCarpet",
 * "PlasticNumber" (number plate) — these are real content names on full-
 * interior uploads (Porsche Taycan) and must never follow body paint */
const CV_INTERIOR_MAT_RE = /^int(erior)?\b|^int[._ -]|interior|interieur|leder|leather|alcantara|stitch|seam|carpet|teppich|dashboard|cockpit|cabin|seat|sitz|burmester|harman|kardon|bose|buttons|kennzeichen|matricul|number|plate/i;

function makeMatIsNonBody(excludeMatRe?: RegExp) {
  return function matIsNonBody(m: THREE.MeshStandardMaterial | undefined): boolean {
  const raw = (m && m.name) || '';
  if (!raw) return false;
  // our own paint clones append _paint/_wheel/_glass/_interior — test the
  // ORIGINAL name so a re-paint pass still sees the authored material name
  const n = raw.replace(/_(paint|wheel|glass|interior)$/i, '');
  if (CV_PAINT_MAT_RE.test(n)) return false;
  if (CV_STRONG_NONBODY_MAT_RE.test(n)) return true;
  if (CV_INTERIOR_MAT_RE.test(n)) return true;
  if (excludeMatRe?.test(n)) return true;
  return CV_LIGHT_MAT_RE.test(n) && !CV_COLORISH_MAT_RE.test(n);
  };
}

function applyVehiclePaint(
  root: THREE.Object3D,
  paint: string,
  bodyPaintRe?: RegExp,
  paintMatRe?: RegExp,
  excludeMatRe?: RegExp,
) {
  root.updateMatrixWorld(true);

  // ---- measure the car once (world boxes; ratios are transform-invariant) ----
  type MeshInfo = { mesh: THREE.Mesh; name: string; mats: THREE.MeshStandardMaterial[]; box: THREE.Box3 };
  const infos: MeshInfo[] = [];
  const whole = new THREE.Box3();
  const scratch = new THREE.Box3();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    if (!o.visible) return;
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    scratch.copy(mesh.geometry.boundingBox!).applyMatrix4(mesh.matrixWorld);
    whole.union(scratch);
    infos.push({ mesh, name: mesh.name ?? '', mats: (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[], box: scratch.clone() });
  });
  if (!infos.length) return;
  const size = whole.getSize(new THREE.Vector3());
  const wholeC = whole.getCenter(new THREE.Vector3());
  const halfW = Math.max(size.x, 0.001) / 2;
  const H = Math.max(size.y, 0.001);
  const L = Math.max(size.z, size.x, 0.001);
  const minY = whole.min.y;

  const isLampMat = (m: THREE.MeshStandardMaterial) => !!m && 'emissive' in m && !!m.emissive && m.emissive.getHex() !== 0;
  const isGlassMat = (m: THREE.MeshStandardMaterial) => !!m && 'transparent' in m && m.transparent;
  const matIsNonBody = makeMatIsNonBody(excludeMatRe);

  // geometric classification of one mesh into body / wheel / glass / interior / other
  const classify = (info: MeshInfo): 'body' | 'wheel' | 'glass' | 'interior' | 'other' => {
    if (CV_WHEEL_MESH_RE.test(info.name)) return 'wheel';
    if (CV_NONBODY_MESH_RE.test(info.name)) return 'other';
    // every material on the mesh is name-excluded (glass / lamp / chrome /
    // wheel / grille families) → never body, whatever the geometry says
    const liveMats = info.mats.filter(Boolean);
    if (liveMats.length && liveMats.every((m) => matIsNonBody(m))) return 'other';
    const namedBody = CV_BODY_MESH_RE.test(info.name) || (bodyPaintRe?.test(info.name) ?? false);
    const c = info.box.getCenter(new THREE.Vector3());
    const sz = info.box.getSize(new THREE.Vector3());
    const maxdim = Math.max(sz.x, sz.y, sz.z);
    // multi-tire assemblies: one mesh holding several wheels/axles spans the
    // full track at floor level with a thin vertical profile — a body panel
    // never does, so paint must never reach these
    if (
      c.y < minY + H * 0.3 &&
      sz.y < H * 0.3 &&
      info.box.min.x < -halfW * 0.35 &&
      info.box.max.x > halfW * 0.35
    ) return 'wheel';
    // wheels without names: round-ish footprint in a low corner zone
    if (
      c.y < minY + H * 0.32 &&
      Math.abs(c.x) > halfW * 0.5 &&
      sz.x > H * 0.2 &&
      Math.abs(sz.x - sz.z) < Math.max(sz.x, sz.z) * 0.4
    ) return 'wheel';
    if (namedBody) {
      return info.mats.some((m) => isGlassMat(m) || isLampMat(m)) ? 'other' : 'body';
    }
    if (info.mats.some((m) => isGlassMat(m) || isLampMat(m))) return 'other';
    // GEOMETRIC GLASS — glazing shells in the greenhouse are window glass
    // even when the artist left them unnamed (the G90 M5 bakes its glass
    // opaque). Raked screens have thicker bounding boxes than side glass,
    // so the thinness budget is generous; the z-band keeps hoods (forward
    // of the front axle) and the extreme roof skin out of the glass class.
    const thinShell = Math.min(sz.x, sz.y, sz.z) < H * 0.16;
    const cabinSpan = maxdim > L * 0.18 && maxdim < L * 0.62;
    const upperBand = c.y > minY + H * 0.6;
    const belowRoofSkin = c.y < minY + H * 0.88;
    // greenhouse z-band: the roof skin starts where the windshield top ends
    // (~centre + 0.21L), so bonnets — thin, long, at hood height on SUVs —
    // can never be mistaken for raked glazing
    const inGreenhouse = c.z > whole.min.z + L * 0.08 && c.z < wholeC.z + L * 0.21;
    if (thinShell && cabinSpan && upperBand && belowRoofSkin && inGreenhouse) return 'glass';
    const inboard = info.box.max.x < halfW * 0.62 && info.box.min.x > -halfW * 0.62;
    if (inboard) {
      // the topmost inboard band is the ROOF SKIN — body-coloured, unlike
      // the cabin below it (seats, dash, console, headliner). A roof skin
      // must actually span the roofline: its width in Z must be at least
      // 20% of the car length (a hatchback glass screen that peeks above is
      // far narrower and must not steal roof-body classification).
      const roofSpan = info.box.max.z - info.box.min.z;
      const surfaceSkin = c.y > minY + H * 0.86 && roofSpan > L * 0.2;
      if (surfaceSkin) return 'body';
      if (c.y > minY + H * 0.4) return 'interior';
    }
    // underbody / lowest band
    if (c.y < minY + H * 0.12) return 'other';
    const reachesFlank = info.box.max.x >= halfW * 0.68 || info.box.min.x <= -halfW * 0.68;
    const topBand = c.y > minY + H * 0.72;
    const longPanel = maxdim > L * 0.42 && c.y > minY + H * 0.14;
    // lamp zones: small nose-corner / tail-corner covers — never body paint
    if (
      maxdim < L * 0.22 &&
      c.y < minY + H * 0.65 &&
      Math.abs(c.x) > halfW * 0.25 &&
      (c.z > whole.max.z - L * 0.22 || c.z < whole.min.z + L * 0.22)
    ) return 'other';
    // grille / splitter / badge / plate / diffuser zone: low, centred, ahead
    // of the front axle or behind the rear one — trim, not paint
    if (
      !reachesFlank &&
      c.y < minY + H * 0.42 &&
      Math.abs(c.x - wholeC.x) < halfW * 0.6 &&
      (c.z > whole.max.z - L * 0.22 || c.z < whole.min.z + L * 0.22)
    ) return 'other';
    return reachesFlank || topBand || longPanel ? 'body' : 'other';
  };

  const paintHex = new THREE.Color(paint);
  const themed = new Set<THREE.MeshStandardMaterial>();
  const darkened = new Set<THREE.Mesh>(); // wheels already given a clone

  const retheme = (mat: THREE.MeshStandardMaterial) => {
    if (themed.has(mat)) return;
    themed.add(mat);
    mat.color.copy(paintHex);
    mat.needsUpdate = true;
  };

  const sendWheelDark = (mesh: THREE.Mesh, sourceMat: THREE.MeshStandardMaterial) => {
    if (darkened.has(mesh)) return;
    darkened.add(mesh);
    if (!mesh.userData.wheelMat) {
      const clone = sourceMat.clone();
      clone.name = `${sourceMat.name || 'paint'}_wheel`;
      mesh.userData.wheelMat = clone;
    }
    const wm = mesh.userData.wheelMat as THREE.MeshStandardMaterial;
    const rawMats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
    const replaced = rawMats.map((mm) => (mm === sourceMat || themed.has(mm) ? wm : mm));
    mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
    wm.color.set('#3a3f47');
    wm.metalness = 0.85;
    wm.roughness = 0.35;
    wm.envMapIntensity = 1.2;
    wm.needsUpdate = true;
  };

  // unnamed glazing (baked opaque): per-mesh clone tinted like real glass —
  // the shared source material must stay untouched for named-glass meshes
  const sendGlassDark = (mesh: THREE.Mesh, sourceMat: THREE.MeshStandardMaterial) => {
    if (darkened.has(mesh)) return;
    darkened.add(mesh);
    if (!mesh.userData.glassMat) {
      const clone = sourceMat.clone();
      clone.name = `${sourceMat.name || 'mat'}_glass`;
      mesh.userData.glassMat = clone;
    }
    const gm = mesh.userData.glassMat as THREE.MeshStandardMaterial;
    const rawMats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
    const replaced = rawMats.map((mm) => (mm === sourceMat ? gm : mm));
    mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
    gm.color.set('#10141a');
    gm.metalness = 0.35;
    gm.roughness = 0.04;
    gm.envMapIntensity = 1.8;
    gm.transparent = true;
    gm.opacity = 0.62;
    gm.needsUpdate = true;
  };

  // bright clay cabin seen through the glass: per-mesh clone in a real
  // cabin tone so the interior doesn't glow white behind tinted windows.
  // Only UNIFORM-bright clay is re-tinted — saturated trims (screen glows,
  // accents, badges) survive. NOTE: three.js colors are LINEAR space, so
  // sRGB #cccccc reads ≈0.60 here and #e7e7e7 ≈0.79.
  const CLAY_LINEAR = 0.5; // sRGB #929292 ≈ 0.506 linear (30-70% grey sweet spot)
  const LUM = (m: THREE.MeshStandardMaterial) => {
    if (!m || !m.color) return 0;
    const c = m.color;
    return 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  };
  const sendInteriorDark = (mesh: THREE.Mesh, sourceMat: THREE.MeshStandardMaterial) => {
    if (LUM(sourceMat) < CLAY_LINEAR) return;
    if (darkened.has(mesh)) return;
    darkened.add(mesh);
    if (!mesh.userData.interiorMat) {
      const clone = sourceMat.clone();
      clone.name = `${sourceMat.name || 'mat'}_interior`;
      mesh.userData.interiorMat = clone;
    }
    const im = mesh.userData.interiorMat as THREE.MeshStandardMaterial;
    const rawMats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
    const replaced = rawMats.map((mm) => (mm === sourceMat ? im : mm));
    mesh.material = Array.isArray(mesh.material) ? replaced : replaced[0];
    im.color.set('#232629');
    im.metalness = 0.05;
    im.roughness = 0.8;
    im.envMapIntensity = 0.5;
    im.needsUpdate = true;
  };

  for (const info of infos) {
    if (/lighteffect|_Emission$|glass_gray$/i.test(info.name)) continue;
    // hard name-based exclusion tiers — these NEVER take body paint, on any
    // asset, no matter what the geometric classifier says:
    //   lamps/indicators (mesh or material name), glazing ("red_glass" etc.),
    //   tires/wheels, grilles/chrome, and the tires+grille of shared-material
    //   uploads (the paint clone detaches panels, so originals stay stock).
    const meshAndMat = info.name + ' ' + info.mats.map((m) => (m && m.name) || '').join(' ');
    if (CV_NONBODY_MESH_RE.test(meshAndMat)) continue;
    const kind = classify(info);
    if (kind === 'wheel') {
      const src = info.mats.find((m) => m && 'color' in m);
      if (src) sendWheelDark(info.mesh, src);
      continue;
    }
    if (kind === 'glass') {
      const src = info.mats.find((m) => m && 'color' in m);
      if (src) sendGlassDark(info.mesh, src);
      continue;
    }
    if (kind === 'interior') {
      const src = info.mats.find((m) => m && 'color' in m);
      if (src) sendInteriorDark(info.mesh, src);
      continue;
    }
    if (kind !== 'body') continue;

    // Body panel meshes: paint via a per-mesh CLONE of the panel's material.
    // Cheap uploads share ONE material instance across panels AND tires,
    // grilles and trim — a direct colour write would bleed paint onto parts
    // that must stay unpainted. Cloning detaches the panel from the shared
    // instance; userData caches the clone so re-paints recolour in place.
    const panelMats = info.mats.filter((mm) => mm && 'color' in mm && !isGlassMat(mm) && !isLampMat(mm) && !matIsNonBody(mm));
    if (panelMats.length) {
      const meshMats = (Array.isArray(info.mesh.material) ? info.mesh.material : [info.mesh.material]) as THREE.MeshStandardMaterial[];
      if (!info.mesh.userData.paintMats) {
        const clones = panelMats.map((mm) => {
          const c = mm.clone();
          c.name = `${mm.name || 'mat'}_paint`;
          return c;
        });
        info.mesh.userData.paintMats = clones;
        info.mesh.material = Array.isArray(info.mesh.material)
          ? meshMats.map((mm) => {
              const i = panelMats.indexOf(mm);
              return i >= 0 ? clones[i] : mm;
            })
          : clones[0];
      }
      (info.mesh.userData.paintMats as THREE.MeshStandardMaterial[]).forEach((c) => {
        c.color.copy(paintHex);
        c.needsUpdate = true;
      });
    }

  }

  // Fallback safety: nothing matched at all (single-material cars) —
  // re-theme the largest-area material so the car still follows the paint.
  // Area is measured from body-classified MESHES only, so an unnamed wheel
  // or grille sharing the biggest material can never win the fallback.
  if (!infos.some((i2) => classify(i2) === 'body')) {
    const area = new Map<THREE.MeshStandardMaterial, number>();
    let best: THREE.MeshStandardMaterial | null = null;
    let bestA = 0;
    infos.forEach((info) => {
      if (classify(info) !== 'body') return;
      const geo = info.mesh.geometry;
      const a = geo.index ? geo.index.count / 3 : (geo.attributes.position?.count ?? 0) / 3;
      info.mats.forEach((m) => {
        if (!m || !('color' in m) || isGlassMat(m) || isLampMat(m)) return;
        const prev = (area.get(m) ?? 0) + a;
        area.set(m, prev);
        if (prev > bestA) {
          bestA = prev;
          best = m;
        }
      });
    });
    if (best) retheme(best);
  }
}

/* ---------------- loading card (§ model loading) ---------------- */

export function AssetLoading({ label }: { label: string }) {
  return (
    <Html center position={[0, 1.2, 0]} zIndexRange={[5, 0]}>
      <div className="asset-pending-card">
        <div className="apc-title">LOADING</div>
        <div className="apc-title2">{label.toUpperCase()}</div>
        <div className="apc-foot">STREAMING LICENSED ASSET</div>
      </div>
    </Html>
  );
}

/* ---------------- unavailable state (§25) ---------------- */

export function AssetPending({ accent = '#e8b64a', variant = 'exterior' }: { accent?: string; variant?: 'exterior' | 'interior' }) {
  const ring = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (ring.current) {
      const t = state.clock.elapsedTime;
      ring.current.rotation.y = t * 0.35;
      ring.current.scale.setScalar(1 + Math.sin(t * 1.8) * 0.04);
    }
  });
  return (
    <group position={[0, 0.02, 0]}>
      {/* museum plinth */}
      <mesh position={[0, 0.07, 0]} receiveShadow>
        <cylinderGeometry args={[2.6, 2.8, 0.14, 48]} />
        <meshStandardMaterial color="#101218" roughness={0.35} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.145, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.5, 2.6, 64]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.8} />
      </mesh>
      <group ref={ring} position={[0, 1.15, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.35, 0.012, 8, 72]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.6} transparent opacity={0.75} />
        </mesh>
        <mesh rotation={[Math.PI / 2.3, 0.4, 0]}>
          <torusGeometry args={[1.0, 0.008, 8, 64]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={1.1} transparent opacity={0.4} />
        </mesh>
      </group>
      <Html center position={[0, 1.35, 0]} zIndexRange={[5, 0]}>
        <div className="asset-pending-card">
          <div className="apc-title">{variant === 'interior' ? '3D INTERIOR MODEL' : 'HIGH-DETAIL 3D MODEL'}</div>
          <div className="apc-title2">CURRENTLY UNAVAILABLE</div>
          <div className="apc-sub">Enjoy the full data experience — specs, sound, analytics, compare.</div>
          <div className="apc-foot">Authentic licensed asset pending · never a placeholder shape</div>
        </div>
      </Html>
    </group>
  );
}

/* ---------------- kit instancing (source-ships-one-part recipes) ---------------- */

/**
 * Some licensed assets ship ONE instance of a repeated component (a single
 * wheel kit meant to be instanced to 4 corners) or one flank of a symmetric
 * pair (left doors/mirrors). The registry declares where each instance goes
 * in the asset's own authoring units; this pass executes it.
 */
function applyKit(root: THREE.Object3D, kitParts: AssetKitPart[]) {
  for (const kit of kitParts) {
    const groups = root.children.filter((c) => kit.source && c.name.startsWith(kit.source));
    for (const grp of groups) {
      // clone FIRST (identity transform), then pose the original
      const clones = (kit.clones ?? []).map(() => skeletonClone(grp));
      if (kit.keep) {
        grp.position.set(...kit.keep.pos);
        if (kit.keep.yaw !== undefined) grp.rotation.y = kit.keep.yaw;
      }
      clones.forEach((cl, i) => {
        const spec = kit.clones![i];
        cl.position.set(...spec.pos);
        if (spec.yaw !== undefined) cl.rotation.y = spec.yaw;
        if (spec.mirrorZ) cl.scale.z = -1;
        root.add(cl);
      });
    }
  }
}

/* ---------------- GLB stage ---------------- */

function AssetStage({ url, paint, asset }: { url: string; paint: string; asset: VehicleAsset }) {
  const { scene, animations } = useGLTF(url);
  const mixers = useRef<THREE.AnimationMixer[]>([]);

  // memory hygiene: while mounted, this asset's buffers + parsed scene are
  // pinned (LRU must not evict them); on unmount they're released and the
  // cloned materials we created below are disposed so GPU memory frees up.
  useEffect(() => {
    pinAsset(url);
    noteParsed(url, scene ? 1 : 1);
    return () => {
      unpinAsset(url);
    };
  }, [url, scene]);

  const root = useMemo(() => {
    const s = scene.clone(true);
    s.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mesh.material = Array.isArray(mesh.material) ? mats.map((m) => (m as THREE.Material).clone()) : (mats[0] as THREE.Material).clone();
    });

    // prune stacked duplicate variant shells BEFORE any rotation — the prune
    // plane is expressed in the asset's own authoring space (e.g. bmw-m5
    // ships a second partial variant floating at authoring z 2.14–3.52)
    if (asset.hideBeyondOriginalAxis !== undefined || asset.hideBelowOriginalAxis !== undefined) {
      s.updateMatrixWorld(true);
      const wp = new THREE.Vector3();
      s.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh || !mesh.visible) return;
        mesh.getWorldPosition(wp);
        if (asset.hideBeyondOriginalAxis !== undefined && wp.z > asset.hideBeyondOriginalAxis) mesh.visible = false;
        if (asset.hideBelowOriginalAxis !== undefined && wp.z < asset.hideBelowOriginalAxis) mesh.visible = false;
      });
    }

    // stand Z-up-authored assets upright (author's +Z becomes world +Y)
    if (asset.axisFix === 'z-up') s.rotation.x = -Math.PI / 2;

    // face the stage's default direction unless the record overrides
    if (asset.rotationY) s.rotation.y = asset.rotationY;

    // instance mirrored/instanced kit parts BEFORE measuring bounds
    if (asset.kitParts?.length) applyKit(s, asset.kitParts);

    // hide registry-declared demo meshes (nested liners that poke through the
    // outer skin, placeholder geometry inside closed parts, …)
    if (asset.hiddenMeshes?.length) {
      s.traverse((o) => {
        if (asset.hiddenMeshes!.some((pat) => (o.name || '').startsWith(pat))) o.visible = false;
      });
    }

    // environment scenery (Huracán GT3): that one upload wraps the car in a
    // giant sky dome (~190 m cube) plus a full racetrack ring. Both span ≥80%
    // of the asset's FULL footprint in x AND z; no car body shell ever does
    // (a shell is ~50-60% of length in each plan axis). The sky dome is also
    // near-cubic in its own bounds — so is no body part. Guard rails: a mesh
    // with a car silhouette (height 18-65% of its footprint, plan < 2.4:1)
    // is NEVER pruned, and pruning stops if fewer than 8 meshes would remain.
    // This is deliberately conservative — no other asset ships a diorama.
    let prunedScenery = false;
    {
      const Vv = new THREE.Vector3();
      for (let pass = 0; pass < 3; pass++) {
        s.updateMatrixWorld(true);
        // visible-only bounds — setFromObject counts hidden meshes, so after
        // the dome is hidden the ring would still be measured against the
        // dome's 13 m footprint and never trip the thresholds below. For
        // normal assets every mesh is visible here, so this is identical to
        // setFromObject.
        const fullBox = new THREE.Box3();
        s.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible) return;
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const b = m.geometry.boundingBox!;
          fullBox.expandByPoint(Vv.set(b.min.x, b.min.y, b.min.z).applyMatrix4(m.matrixWorld));
          fullBox.expandByPoint(Vv.set(b.max.x, b.max.y, b.max.z).applyMatrix4(m.matrixWorld));
        });
        const full = fullBox.getSize(new THREE.Vector3());
        // gate on DIORAMA-shaped bounds only — the sky dome makes height ≈
        // footprint (a real car is 25-36% as tall as it is long, so this
        // never fires on a normal model). Later passes continue only while
        // this asset has already proven to be a diorama.
        const diorama = full.y > Math.max(full.x, full.z) * 0.75;
        if (!diorama && !prunedScenery) break;
        const scenery: THREE.Mesh[] = [];
        let visibleTotal = 0;
        s.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh || !m.visible) return;
          visibleTotal++;
          if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
          const wb = m.geometry.boundingBox!.clone().applyMatrix4(m.matrixWorld);
          const ms = wb.getSize(new THREE.Vector3());
          // car-silhouette guard — never prune a real body shell/panel
          const hRatio = ms.y / Math.max(Math.max(ms.x, ms.z), 1e-6);
          const planRatio = Math.max(ms.x, ms.z) / Math.max(Math.min(ms.x, ms.z), 1e-6);
          if (hRatio > 0.18 && hRatio < 0.65 && planRatio < 2.4) return;
          if (ms.x > full.x * 0.8 && ms.z > full.z * 0.8) {
            scenery.push(m); // dome / full ring
            return;
          }
          // ring slab: flat (h < 9%) AND nearly car-sized in plan (≥45% of
          // the footprint) — a door panel is flat but well under 45% of the
          // car's length, so real panels never trip this
          if (
            hRatio < 0.09 &&
            Math.min(ms.x, ms.z) > full.x * 0.45 &&
            Math.max(ms.x, ms.z) > full.z * 0.55
          )
            scenery.push(m);
        });
        if (!scenery.length || visibleTotal - scenery.length < 8) break;
        scenery.forEach((d) => {
          d.visible = false;
        });
        prunedScenery = true;
      }
    }

    // normalise to a real-car footprint so every asset frames correctly.
    // Only when diorama scenery was hidden do we measure visible meshes only
    // (setFromObject ignores visibility flags and would keep the dome's
    // bounds); every other asset takes the untouched original path.
    s.updateMatrixWorld(true);
    const box = prunedScenery
      ? (() => {
          const bb = new THREE.Box3();
          bb.makeEmpty();
          const Vv = new THREE.Vector3();
          s.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh || !m.visible) return;
            if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
            const b = m.geometry.boundingBox!;
            bb.expandByPoint(Vv.set(b.min.x, b.min.y, b.min.z).applyMatrix4(m.matrixWorld));
            bb.expandByPoint(Vv.set(b.max.x, b.max.y, b.max.z).applyMatrix4(m.matrixWorld));
          });
          return bb;
        })()
      : new THREE.Box3().setFromObject(s);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const L = Math.max(size.x, size.z) || 4.6;
    const k = (4.6 / L) * (asset.scale ?? 1);
    s.scale.setScalar(k);
    s.position.y = -box.min.y * k; // sit exactly on the floor
    s.position.x = -center.x * k;  // centre on the stage
    s.position.z = -center.z * k;

    // procedural wheel kit for assets whose source omits wheel geometry.
    // Placement is computed FROM THE MEASURED BOUNDS so the wheels touch the
    // floor exactly and sit at real G90 proportions (overhangs 19%/22% of
    // length, track 33% of length, tire outer radius 0.34 m in stage units).
    // The kit counter-rotates the axis fix, so its coordinates are stage-space.
    if (asset.wheelKit) {
      const wheelGroup = new THREE.Group();
      wheelGroup.name = 'carverse_wheel_kit';
      if (asset.axisFix === 'z-up') wheelGroup.rotation.x = Math.PI / 2;
      const invK = 1 / k; // s-local units per stage unit
      const R = 0.34 * invK; // tire outer radius
      const tube = 0.105 * invK; // tire sidewall
      const rimR = 0.2 * invK; // alloy face radius
      const track = 0.79 * invK; // half-track (stage)
      const axleF = 1.44 * invK; // front axle ahead of centre (stage)
      const axleR = 1.3 * invK; // rear axle behind centre (stage)
      const yW = R + box.min.y; // → world y = R after the floor offset
      const xW = track + center.x; // → world x = ±track after centring
      const zF = axleF + center.z; // → world z = +axleF after centring
      const zR = -axleR + center.z;
      const tireGeo = new THREE.TorusGeometry(R - tube, tube, 14, 28);
      const rimGeo = new THREE.CylinderGeometry(rimR, rimR, 0.2 * invK, 20);
      const tireMat = new THREE.MeshStandardMaterial({ color: '#15161a', roughness: 0.92, metalness: 0.05 });
      const rimMat = new THREE.MeshStandardMaterial({ color: '#8f959e', roughness: 0.28, metalness: 0.9 });
      ([
        [xW, yW, zF],
        [-xW, yW, zF],
        [xW, yW, zR],
        [-xW, yW, zR],
      ] as const).forEach(([wx, wy, wz]) => {
        const g = new THREE.Group();
        const tire = new THREE.Mesh(tireGeo, tireMat);
        tire.rotation.y = Math.PI / 2;
        const rim = new THREE.Mesh(rimGeo, rimMat);
        rim.rotation.z = Math.PI / 2;
        g.add(tire, rim);
        g.position.set(wx, wy, wz);
        wheelGroup.add(g);
      });
      s.add(wheelGroup);
    }

    if (process.env.NODE_ENV !== 'production') (window as unknown as { __carverseStage?: THREE.Object3D }).__carverseStage = s;
    return s;
  }, [scene, asset.rotationY, asset.scale, asset.kitParts, asset.axisFix, asset.hideBeyondOriginalAxis, asset.hideBelowOriginalAxis, asset.hiddenMeshes, asset.wheelKit]);  // dispose every cloned material + mixer when this stage unmounts (GPU RAM)
  useEffect(() => {
    return () => {
      mixers.current.forEach((m) => m.uncacheRoot(root));
      root.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((m) => (m as THREE.Material).dispose?.());
      });
    };
  }, [root]);

  // per-asset realism pass. BMW ships several demo/clay materials — void
  // fillers as mirror chrome, tires light-gray, glass white, and the whole
  // cabin in one clay material. Registry themes fix each to realistic values.
  const themes: { re: RegExp; color?: string; roughness?: number; metalness?: number }[] =
    (asset.materialThemes ?? []).map((t) => ({ re: new RegExp(t.meshPattern, 'i'), color: t.color, roughness: t.roughness, metalness: t.metalness }));
  useEffect(() => {
    root.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const isTire = /tire|tyre/i.test(mesh.name ?? '');
      mats.forEach((mm) => {
        const mat = mm as THREE.MeshStandardMaterial;
        if (!mat || !('color' in mat)) return;
        const name = mesh.name ?? '';
        if (/void/i.test(name)) {
          mat.color.set('#15171c');
          mat.metalness = 0.25;
          mat.roughness = 0.85;
          mat.needsUpdate = true;
        } else if (isTire) {
          // real rubber: near-black, matte
          mat.color.set('#141414');
          mat.metalness = 0;
          mat.roughness = 0.95;
          mat.needsUpdate = true;
        } else if (/glass/i.test(mat.name ?? '')) {
          // real glazing: dark tint, mirror-smooth, high env reflection
          mat.color.set('#10141a');
          mat.metalness = 0.35;
          mat.roughness = 0.04;
          mat.envMapIntensity = 1.8;
          if (mat.transparent) mat.opacity = Math.min(mat.opacity, 0.62);
          mat.needsUpdate = true;
        } else {
          const theme = themes.find((t) => t.re.test(name));
          if (theme && theme.color) {
            mat.color.set(theme.color);
            if (theme.roughness !== undefined) mat.roughness = theme.roughness;
            if (theme.metalness !== undefined) mat.metalness = theme.metalness;
            mat.needsUpdate = true;
          }
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  // re-paint on colour change without re-cloning
  useEffect(() => {
    applyVehiclePaint(
      root,
      paint,
      asset.bodyPaintMeshPattern ? new RegExp(asset.bodyPaintMeshPattern, 'i') : undefined,
      asset.paintMaterialPattern ? new RegExp(asset.paintMaterialPattern, 'i') : undefined,
      asset.excludeMaterialPattern ? new RegExp(asset.excludeMaterialPattern, 'i') : undefined,
    );
  }, [root, paint, asset.bodyPaintMeshPattern, asset.paintMaterialPattern, asset.excludeMaterialPattern]);

  // embedded clips (doors / lights / spin) play where provided (§10)
  useEffect(() => {
    if (!animations.length) return;
    const mixer = new THREE.AnimationMixer(root);
    animations.filter((c) => c.duration < 6).forEach((c) => mixer.clipAction(c).play());
    mixers.current = [mixer];
    return () => {
      mixer.stopAllAction();
      mixers.current = [];
    };
  }, [root, animations]);

  useFrame((_, delta) => {
    mixers.current.forEach((m) => m.update(delta));
  });

  return (
    <group>
      <primitive object={root} />
    </group>
  );
}

/* ---------------- exported hero ---------------- */

export default function HeroCar({
  vehicle,
  paint,
  accent,
  ghost = false,
  interior = false,
}: {
  vehicle: Vehicle;
  paint: string;
  accent: string;
  ghost?: boolean;
  interior?: boolean;
  onHotspot?: (info: { id: string; label: string; pos: number[]; target: number[] } | null) => void;
  lightsOn?: boolean;
  hotspots?: boolean;
  useGltf?: boolean;
  enterFrom?: number;
  exitTo?: number;
  offset?: [number, number, number];
  rotY?: number;
  wheelStyle?: number;
}) {
  const asset = vehicleAssetFor(vehicle.id);

  if (ghost) return null; // ghosts render only when they own an asset (checked upstream)
  // no licensed GLB yet → render the procedural DNA-styled CarModel so the
  // car is always present on stage (Indian brands ship without assets).
  if (!asset?.model3D) return <CarModel vehicle={vehicle} paint={paint} accent={accent} />;

  // an exterior GLB that contains the cabin doubles as the interior asset (§9)
  const url = interior && asset.interiorModel3D ? asset.interiorModel3D : asset.model3D;

  return (
    <ErrorBoundary fallback={<AssetPending accent={accent} variant={interior ? 'interior' : 'exterior'} />}>
      <Suspense fallback={<AssetLoading label={vehicle.model} />}>
        <AssetStage url={url} paint={paint} asset={asset} />
      </Suspense>
    </ErrorBoundary>
  );
}

class ErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[CARVERSE] vehicle asset failed to load:', error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

/** Pre-warm a vehicle's GLB so switching feels instant (§14). */
export function preloadVehicleAsset(id: string) {
  const asset = vehicleAssetFor(id);
  if (asset?.model3D) useGLTF.preload(asset.model3D);
}
