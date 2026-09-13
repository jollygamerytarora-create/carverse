/**
 * CARVERSE registry sync — runs before dev/build (npm predev / prebuild).
 *
 * Scans /public/cars/<brand>/<vehicleId>/model.glb and generates
 * src/lib/generatedAssetRecords.ts with full license metadata pulled from
 * scripts/assetManifest.json (created by scripts/discover_assets.py).
 *
 * Flow: drop licensed GLBs into /public/cars/<brand>/<vehicleId>/ →
 * next dev/build auto-registers them → the car flips to 3D READY.
 * Folders whose name is not a vehicle id in the database are ignored.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const CARS = path.join(ROOT, 'public', 'cars');
const MANIFEST = path.join(ROOT, 'scripts', 'assetManifest.json');
const UPAXIS = path.join(ROOT, 'scripts', 'upaxis.json');
const OUT = path.join(ROOT, 'src', 'lib', 'generatedAssetRecords.ts');

/**
 * Per-asset paint recipes: artist catch-all MATERIALS that actually carry
 * body panels. Regex fragments matched case-insensitively against material
 * names by the stage's paint pass (paintMaterialPattern). Extend as new
 * assets need them — never for materials that genuinely aren't paint.
 */
const PAINT_RECIPES = {
  // G90 M5 by szymonpasterczyk: shell panels (roof, hood, doors interior
  // skins, bumper cores) ship under catch-alls; verified in-stage.
  'bmw-m5': 'grille_neon|^Material$|trunk_body',
  // 2020 Taycan by martin002: full-cabin upload. Body shells ship under
  // "ExtAluminium"/"Aluminium" catch-alls; the four corner "wire_*" meshes
  // are wheels and "wire_008110135" is the glasshouse. Paint targets the
  // two body catch-alls; wheels/glass are excluded from the geometric tier
  // via the same wire token in HeroCar (TAYCAN wire rule lives in code).
  'porsche-taycan': '^ExtAluminium$|^Aluminium$',
  // Urus SE by aoferrari: the four big body shells (front/rear clip, roof
  // band) ship under anonymous "Material.001/.004" catch-alls; trim (mirrors,
  // vents, skirts) uses named materials that the generic tier already paints.
  // Without this recipe only trim repaints and the body stays authored black.
  'lambo-urus': '^Material\\.001$|^Material\\.004$',
  // Mahindra XUV 3XO stand-in: the car body is material_1 (material_0 is a backdrop plane).
  'mahindra-xuv700': '^material_1$',
};

/** Assets whose source files ship WITHOUT wheel geometry — the stage appends
 *  a procedural wheel kit so the car reads complete (bmw-m5 upload omits them). */
const WHEEL_KITS = new Set(['bmw-m5']);

/** Acquired files that must NOT be registered as the car's exterior model —
 *  they are concept pieces, not the vehicle (e.g. the "Revuelto" upload is a
 *  wheel-showcase: giant display rims + backdrop plates, no car body).
 *  These vehicles fall back to the graceful AssetPending plinth. */
const DISABLED_ASSETS = new Set([
  'lambo-revuelto', // concept-only upload — no exterior model
  'tata-nexon', // only traffic-pack/uploads exist — procedural fallback
  'mahindra-be6', // no downloadable model exists yet — procedural fallback
]);

/** Material-name patterns that are NEVER body paint for a given asset —
 *  they hold wheels, glass or other excluded parts even though the paint
 *  pass would otherwise classify their meshes as body skin. */
const NONBODY_MAT_RECIPES = {
  // 2020 Taycan: corner wheels + glasshouse ship under anonymous "wire_*"
  // materials (e.g. wire_225198087). Excluded explicitly per asset.
  'porsche-taycan': '^wire_',
};

const BRANDS = ['bmw', 'porsche', 'mercedes', 'audi', 'toyota', 'ford', 'ferrari', 'tesla', 'nissan', 'mclaren', 'lamborghini', 'maruti', 'tata', 'mahindra', 'rolls'];
/** Data files use brand id 'rolls'; the on-disk/URL dir is 'rolls-royce'. */
const BRAND_DIR_ALIAS = { rolls: 'rolls-royce' };
const BRAND_CONST = {
  bmw: 'LICENSE_BMW_G05',
};

function knownVehicleIds() {
  const ids = new Set();
  for (const f of fs.readdirSync(path.join(ROOT, 'src', 'data'))) {
    if (!f.endsWith('.ts')) continue;
    const txt = fs.readFileSync(path.join(ROOT, 'src', 'data', f), 'utf-8');
    for (const m of txt.matchAll(/id:\s*'([a-z0-9-]+)'\s*,\s*brand:\s*'([a-z]+)'/g)) {
      if (BRANDS.includes(m[2])) ids.add(m[1]);
    }
  }
  return ids;
}

function main() {
  const ids = knownVehicleIds();
  const manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf-8')) : {};
  const upaxis = fs.existsSync(UPAXIS) ? JSON.parse(fs.readFileSync(UPAXIS, 'utf-8')) : {};
  const records = [];

  for (const brand of BRANDS) {
    const dir = BRAND_DIR_ALIAS[brand] || brand;
    const bdir = path.join(CARS, dir);
    if (!fs.existsSync(bdir)) continue;
    for (const vid of fs.readdirSync(bdir)) {
      const glb = path.join(bdir, vid, 'model.glb');
      if (!fs.existsSync(glb) || !ids.has(vid)) continue;
      const c = manifest[vid];
      if (!c || c.status !== 'candidate') {
        console.warn(`[sync] ${vid}: GLB present but no manifest license metadata — skipped (run discover_assets.py)`);
        continue;
      }
      const nc = c.license.startsWith('CC-BY-NC');
      if (DISABLED_ASSETS.has(vid)) continue; // concept-only upload — no exterior model
      const ax = upaxis[vid];
      records.push({
        vid,
        brand,
        url: `/cars/${dir}/${vid}/model.glb`,
        bytes: fs.statSync(glb).size,
        lic: {
          type: c.license,
          creator: `${c.creator} (Sketchfab)`,
          source: c.source,
          attribution: `${c.name} by ${c.creator} — ${c.license}, modified (repackaged/optimised for web) by CARVERSE.`,
          licenseURL: nc ? 'https://creativecommons.org/licenses/by-nc/4.0/' : 'https://creativecommons.org/licenses/by/4.0/',
          redistributable: !nc,
        },
        name: c.name,
        axisFix: ax && ax.axis ? ax.axis : null,
        hideBeyond: ax && ax.hideBeyondOriginalAxis !== undefined ? ax.hideBeyondOriginalAxis : null,
        hideBelow: ax && ax.hideBelowOriginalAxis !== undefined ? ax.hideBelowOriginalAxis : null,
        rotationY: ax && typeof ax.rotationY === 'number' ? ax.rotationY : null,
      });
      // Per-asset material recipes (artist catch-all materials that hold body
      // panels). Driven by PAINT_RECIPES below — extend as new assets need them.
      const pr = PAINT_RECIPES[vid];
      if (pr) records[records.length - 1].paintMats = pr;
      const nb = NONBODY_MAT_RECIPES[vid];
      if (nb) records[records.length - 1].nonBodyMats = nb;
      if (WHEEL_KITS.has(vid)) records[records.length - 1].wheelKit = true;
    }
  }

  const banner = `/* GENERATED by scripts/sync_registry.js — do not edit by hand.
 * Acquired vehicle assets, auto-registered from /public/cars/.
 * Regenerate: npm run sync (runs automatically before dev/build). */
`;
  const body = records
    .map((r) => {
      const lines = [
        `  '${r.vid}': {`,
        `    model3D: '${r.url}',`,
        `    interiorModel3D: null,`,
        `    engineSound: null,`,
        `    license: {`,
        `      type: '${r.lic.type}',`,
        `      creator: ${JSON.stringify(r.lic.creator)},`,
        `      source: '${r.lic.source}',`,
        `      attribution: ${JSON.stringify(r.lic.attribution)},`,
        `      licenseURL: '${r.lic.licenseURL}',`,
        `      redistributable: ${r.lic.redistributable},`,
        `    },`,
        `    animations: { doors: false, hood: false, trunk: false, lights: false, spin: false },`,
      ];
      if (r.axisFix === 'z-up') lines.push(`    axisFix: 'z-up', // authored Z-up (scripts/probe_upaxis.py) - rotated upright at load`);
      if (r.hideBeyond !== null) lines.push(`    hideBeyondOriginalAxis: ${r.hideBeyond}, // floating duplicate variant pruned`);
      if (r.hideBelow !== null && r.hideBelow !== undefined) lines.push(`    hideBelowOriginalAxis: ${r.hideBelow}, // disconnected debris strip pruned`);
      if (r.rotationY !== null && r.rotationY !== undefined) lines.push(`    rotationY: ${r.rotationY}, // nose-direction fix after axis rotation`);
      if (r.paintMats) lines.push(`    paintMaterialPattern: ${JSON.stringify(r.paintMats)}, // catch-all materials carrying body panels`);
      if (r.nonBodyMats) lines.push(`    excludeMaterialPattern: ${JSON.stringify(r.nonBodyMats)}, // materials that are never body paint (wheels/glass)`);
      if (r.wheelKit) lines.push(`    wheelKit: true, // source ships no wheel geometry — stage appends procedural wheels`);
      lines.push(`    _meta: { name: ${JSON.stringify(r.name)}, bytes: ${r.bytes} },`);
      lines.push(`  },`);
      return lines.join('\n');
    })
    .join('\n');

  fs.writeFileSync(
    OUT,
    `${banner}import type { VehicleAsset } from './assetRegistry';

type GeneratedRecord = VehicleAsset & { _meta?: { name: string; bytes: number } };

export const GENERATED_RECORDS: Record<string, GeneratedRecord> = {
${body}
};
`,
    'utf-8'
  );
  console.log(`[sync] ${records.length} acquired asset(s) registered → ${path.relative(ROOT, OUT)}`);
}

main();
