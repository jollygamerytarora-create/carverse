"""CARVERSE asset acquisition — completes what discovery found.

scripts/discover_assets.py already identified a quality CC-licensed (mostly
CC-BY-4.0) Sketchfab model for 73 of 77 vehicles. Sketchfab file downloads are
account-gated (free account → OAuth token) — this script uses YOUR token to
download every candidate GLB into /public/cars/<brand>/<id>/model.glb and then
prints ready-to-paste registry records for src/lib/assetRegistry.ts.

Setup (one time, free):
  1. Create a Sketchfab account and note your API token:
     https://sketchfab.com/settings/password  → "API token"
  2. Run:   set CARVERSE_SF_TOKEN=<token>   (Windows)
             python scripts/acquire_assets.py

No DRM is circumvented — the token is your own account's legitimate access.
"""
import io
import json
import os
import sys
import time
import urllib.request

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "scripts", "assetManifest.json")
CARS = os.path.join(ROOT, "public", "cars")

TOKEN = os.environ.get("CARVERSE_SF_TOKEN", "").strip()
# vehicles that already ship a hand-curated (better) asset — don't re-download
SKIP = {"bmw-x5"}
# brand dir per vehicle id prefix (matches asset registry conventions)
BRAND_OF = {}
for b in ["bmw", "porsche", "mercedes", "audi", "toyota", "ford", "ferrari", "tesla", "nissan", "mclaren", "lamborghini", "maruti", "tata", "mahindra", "rolls"]:
    BRAND_OF[b] = b
SHORT = {"lambo": "lamborghini", "rolls": "rolls-royce"}


def brand_of(vid):
    p = vid.split("-")[0]
    return SHORT.get(p, p) if p in BRAND_OF or p in SHORT else None


def download(uid, dest):
    req = urllib.request.Request(
        f"https://api.sketchfab.com/v3/models/{uid}/download",
        headers={"Authorization": f"Token {TOKEN}", "User-Agent": "carverse-acquisition/1.0"},
    )
    with urllib.request.urlopen(req, timeout=40) as r:
        info = json.loads(r.read().decode("utf-8"))
    url = info.get("glb", {}).get("url") or info.get("gltf", {}).get("url")
    if not url:
        return None, "no glb/gltf in download payload"
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    tmp = dest + ".part"
    urllib.request.urlretrieve(url, tmp) if False else None
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "carverse-acquisition/1.0"}), timeout=300) as r, open(tmp, "wb") as f:
        while True:
            chunk = r.read(1 << 20)
            if not chunk:
                break
            f.write(chunk)
    os.replace(tmp, dest)
    return os.path.getsize(dest), None


def main():
    if not TOKEN:
        print("CARVERSE_SF_TOKEN not set. Create a free Sketchfab account, grab your API token")
        print("(sketchfab.com/settings/password), then:  set CARVERSE_SF_TOKEN=<token>  and rerun.")
        return
    m = json.load(open(MANIFEST, encoding="utf-8"))
    ok, fail = 0, []
    records = []
    for vid, c in sorted(m.items()):
        if c.get("status") != "candidate":
            continue
        if vid in SKIP:
            print(f"  = {vid}: official asset already installed — skipped")
            continue
        brand = brand_of(vid)
        if not brand:
            print(f"skip {vid}: unknown brand")
            continue
        dest = os.path.join(CARS, brand, vid, "model.glb")
        if os.path.exists(dest) and os.path.getsize(dest) > 100_000:
            print(f"  = {vid}: already downloaded")
        else:
            try:
                size, err = download(c["sketchfabUid"], dest)
                if err:
                    fail.append((vid, err))
                    print(f"  ✗ {vid}: {err}")
                    continue
                print(f"  ✓ {vid}: {size/1e6:.1f} MB")
                ok += 1
                time.sleep(1.0)
            except Exception as e:
                fail.append((vid, str(e)[:80]))
                print(f"  ✗ {vid}: {str(e)[:80]}")
                continue
        records.append((vid, brand, c))

    print(f"\nDownloaded {ok} models. Failures: {len(fail)}")
    for vid, e in fail:
        print(f"  {vid}: {e}")

    if records:
        print("\n" + "=" * 70)
        print("Paste into ASSET_RECORDS (src/lib/assetRegistry.ts):\n")
        for vid, brand, c in records:
            nc = c["license"].startswith("CC-BY-NC")
            print(f"""  '{vid}': {{
    model3D: '/cars/{brand}/{vid}/model.glb',
    interiorModel3D: null,
    engineSound: null,
    license: {{
      type: '{c['license']}',
      creator: '{c['creator']} (Sketchfab)',
      source: '{c['source']}',
      attribution: '{c['name']} by {c['creator']} — {c['license']}{', modified (repackaged for web)' if True else ''}.',
      licenseURL: 'https://creativecommons.org/licenses/{'by-nc/4.0' if nc else 'by/4.0'}/',
      redistributable: {str(not nc).lower()},
    }},
    animations: {{ doors: false, hood: false, trunk: false, lights: false, spin: false }},
    qcNote: {None if not nc else "'NonCommercial license — displayed with attribution; replace for commercial use.'"},
  }},
""")


if __name__ == "__main__":
    main()
