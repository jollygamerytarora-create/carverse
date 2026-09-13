"""One-off: fetch BMW G05 (X5) CC-BY-4.0 glTF parts into public/cars/bmw/x5-g05/."""
import json
import os
import urllib.request

BASE = "https://media.githubusercontent.com/media/bmwcarit/digital-car-3d/master/"
TREE = os.path.join(os.environ.get("TEMP", "/tmp"), "bmwtree.json")
OUT = os.path.join("public", "cars", "bmw", "x5-g05")

paths = []
with open(TREE, "r", encoding="utf-8") as fh:
    for m in fh.read().split('"path": "')[1:]:
        p = m.split('"')[0]
        # files only: tree entries ending with '/' are directories; also skip
        # extension-less strays
        if p.startswith("G05/meshes/") and "." in os.path.basename(p):
            paths.append(p)

print(f"{len(paths)} mesh files to fetch")


def fetch(url, dest, min_size=1000):
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "carverse-asset-fetch"})
        with urllib.request.urlopen(req, timeout=120) as r, open(dest, "wb") as f:
            f.write(r.read())
        sz = os.path.getsize(dest)
        if sz < min_size:
            print(f"  TOO SMALL {dest} ({sz}B) - likely LFS pointer")
            return False
        return True
    except Exception as e:
        print(f"  ERROR {dest}: {e}")
        return False


ok, fail = 0, []
for p in paths:
    rel = os.path.relpath(p, "G05").replace("\\", "/")
    dest = os.path.join(OUT, rel)
    if fetch(BASE + p, dest):
        ok += 1
        print(f"  ok {rel} ({os.path.getsize(dest)//1024} KB)")
    else:
        fail.append(rel)

print(f"\ndownloaded={ok} failed={len(fail)}")
for f in fail:
    print("  FAILED:", f)

# report external URIs referenced by the gltf files so we can fetch those too
need = set()
for p in paths:
    rel = os.path.relpath(p, "G05").replace("\\", "/")
    dest = os.path.join(OUT, rel)
    if not dest.endswith(".gltf") or not os.path.exists(dest):
        continue
    try:
        g = json.load(open(dest, encoding="utf-8"))
    except Exception as e:
        print(f"  PARSE FAIL {rel}: {e}")
        continue
    for b in g.get("buffers", []):
        u = b.get("uri", "")
        if u and not u.startswith("data:"):
            need.add(u)
    for i in g.get("images", []):
        u = i.get("uri", "")
        if u and not u.startswith("data:"):
            need.add(u)

print(f"\n{len(need)} external buffer/texture URIs referenced")
for u in sorted(need):
    print("  ", u)
