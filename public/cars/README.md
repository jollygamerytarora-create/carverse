# CARVERSE vehicle asset library

One folder per acquired vehicle. Assets are **auto-registered** at build time —
dropping a licensed GLB here requires zero code changes.

## Drop-in flow (per car)

```
public/cars/<brand>/<vehicleId>/model.glb
```

- `<vehicleId>` must match the vehicle `id` in `src/data/` (e.g. `bmw-m5-g90`
  → folder `bmw-m5-g90`; the brand segment is the DB brand: `bmw`, `porsche`,
  `mercedes`, `audi`, `toyota`, `ford`, `ferrari`, `tesla`, `nissan`,
  `mclaren`, `lamborghini`).
- License metadata is read from `scripts/assetManifest.json`, produced by the
  discovery pass (`python scripts/discover_assets.py`) which found CC-BY-4.0
  candidates for 73 of 77 vehicles.
- `npm run sync` (also runs automatically before `dev`/`build`) regenerates
  `src/lib/generatedAssetRecords.ts`; the car flips to **3D READY** and the
  credits panel lists its provenance automatically.
- Optional files per folder (picked up by future pipeline steps):
  `interior.glb`, `thumb.webp`, `sound.mp3`, `metadata.json`.

## Acquisition

Sketchfab downloads are account-gated. Run your own legitimate download pass:

```
set CARVERSE_SF_TOKEN=<your free account API token>
python scripts/acquire_assets.py
```

This downloads every discovered candidate (mostly CC-BY-4.0, redistribution
permitted with attribution) into the folder layout above and never bypasses
any access control — it uses your account's own token.

## Currently installed

- `bmw/x5-g05/` — BMW X5 (G05) © BMW AG, CC-BY-4.0 (fetched + merged from
  github.com/bmwcarit/digital-car-3d via `scripts/fetch_g05.py` +
  `scripts/build_g05_glb.py`).
