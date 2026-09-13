"""CARVERSE asset discovery — one pass over the whole vehicle database.

For every vehicle id, queries the public Sketchfab search API for a
downloadable, CC-licensed model matching that car (brand + model + generation)
and records the best candidate (CC-BY > CC0 > CC-BY-NC; faceCount quality bar)
into scripts/assetManifest.json. File downloads on Sketchfab require a free
account — this manifest is the drop-in shopping list; acquired files go to
/public/cars/<brand>/<id>/model.glb and are registered in src/lib/assetRegistry.ts.

Usage:  python scripts/discover_assets.py [--only id1,id2,...]
"""
import json
import os
import sys
import time
import re
import urllib.request
import urllib.parse
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src", "data")
OUT = os.path.join(ROOT, "scripts", "assetManifest.json")

# license uids on Sketchfab
CC_BY = "322a749bcfa841b29dff1e8a1bb74b0b"
CC0 = "322a9496fa3940e48c0a25ca0c80f2c7"
CC_BY_NC = "bbfe3f7dbcdd4122b966b85b9786a989"
LIC_LABEL = {CC_BY: "CC-BY-4.0", CC0: "CC0", CC_BY_NC: "CC-BY-NC"}

BRAND_ALIASES = {
    "bmw": ["bmw"],
    "porsche": ["porsche"],
    "mercedes": ["mercedes benz", "mercedes-amg", "mercedes"],
    "audi": ["audi"],
    "toyota": ["toyota"],
    "ford": ["ford"],
    "ferrari": ["ferrari"],
    "tesla": ["tesla"],
    "nissan": ["nissan"],
    "mclaren": ["mclaren"],
    "lamborghini": ["lamborghini", "lamborghini"],
    # Indian market — search under the marque users actually tag
    "maruti": ["suzuki swift", "maruti suzuki", "suzuki"],
    "tata": ["tata", "tata nexon", "tata harrier"],
    "mahindra": ["mahindra"],
}

# model-name tokens from vehicle ids → good search phrases
STOP = {"comp", "competition", "xdrive", "base", "perf", "performance"}

# identity-refined queries for cars whose id-parse alone grabbed the wrong
# generation or a sibling model (QC pass 2026-09)
OVERRIDES = {
    # Indian market — brand names alone grab wrong hits (Tata the conglomerate,
    # Suzuki bikes/boats); query the actual model names explicitly.
    "maruti-swift": ["suzuki swift sport 2024", "suzuki swift 2017", "suzuki swift"],
    "maruti-baleno": ["suzuki baleno 2022", "toyota starlet 2020", "suzuki baleno"],
    "maruti-dzire": ["suzuki dzire 2024", "suzuki swift dzire", "suzuki sedan dzire"],
    "maruti-fronx": ["suzuki fronx 2024", "toyota taisor", "suzuki fronx crossover"],
    "tata-nexon": ["tata nexon"],
    "tata-punch": ["tata punch 2023", "tata punch micro suv", "tata punch"],
    "tata-harrier": ["tata harrier 2023", "tata harrier suv", "tata harrier"],
    "tata-nexon-ev": ["nexon ev"],
    "mahindra-thar": ["mahindra thar 2021", "mahindra thar jeep", "mahindra thar"],
    "mahindra-xuv700": ["mahindra xuv700 2023", "mahindra xuv 700", "mahindra xuv500 tuned", "mahindra suv xuv"],
    "mahindra-scorpio-n": ["mahindra scorpio n 2023", "mahindra scorpio", "mahindra suv"],
    "mahindra-be6": ["mahindra be 6 2025", "mahindra be6 ev", "mahindra electric suv"],
    "bmw-m5": ["bmw m5 g90 2024", "bmw m5 g90"],
    "bmw-m3": ["bmw m3 g80 2021", "bmw m3 g80"],
    "bmw-m4": ["bmw m4 g82 2021", "bmw m4 g82"],
    "bmw-8series": ["bmw m850i g15", "bmw 8 series g15"],
    "mercedes-amggt": ["mercedes amg gt coupe 2024", "mercedes amg gt black series"],
    "mercedes-g63": ["mercedes g63 amg 2022", "mercedes g class w463"],
    "porsche-911": ["porsche 911 992 carrera 2021", "porsche 911 992"],
    "porsche-911-turbo": ["porsche 911 turbo s 992", "porsche 992 turbo"],
    "ford-mustang": ["ford mustang gt 2024 s650", "ford mustang 2024"],
    "ford-gt": ["ford gt 2017", "ford gt 2020"],
    "nissan-gtr": ["nissan gt-r r35 2020", "nissan gtr r35"],
    "tesla-models": ["tesla model s plaid 2021", "tesla model s 2021"],
    "toyota-supra": ["toyota supra a90 2020", "toyota gr supra"],
    "mclaren-gts": ["mclaren gt 2020", "mclaren gts"],
    "ferrari-812": ["ferrari 812 superfast 2020", "ferrari 812 gts"],
}


def parse_id(vid, brand):
    """'porsche-911-gt3' → ['porsche 911 gt3', 'porsche 911']"""
    tail = vid[len(brand) + 1:] if vid.startswith(brand + "-") else vid
    tail = tail.replace("-e34", " e34").replace("-2", " 2")
    words = [w for w in re.split(r"[-_]", tail) if w and w not in STOP]
    q0 = " ".join([brand] + words)
    queries = [q0]
    if len(words) > 2:
        queries.append(" ".join([brand] + words[:2]))
    return queries


def search(query):
    url = (
        "https://api.sketchfab.com/v3/search?type=models&q="
        + urllib.parse.quote(query)
        + "&downloadable=true&count=12"
    )
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "carverse-discovery/1.0"})
        with urllib.request.urlopen(req, timeout=25) as r:
            return json.loads(r.read().decode("utf-8")).get("results", [])
    except Exception as e:
        print(f"    ! search failed: {e}")
        return []


def score(r, brand_words):
    lic = (r.get("license") or {}).get("label", "")
    lic_score = {"CC Attribution": 3, "CC0": 4, "CC Attribution-NonCommercial": 1}.get(lic, 0)
    if not r.get("isDownloadable") or lic_score == 0:
        return -1
    name = (r.get("name") or "").lower()
    name_hits = sum(1 for w in brand_words if w in name)
    faces = r.get("faceCount") or 0
    quality = 2 if faces > 30000 else (1 if faces > 8000 else 0)
    toon_penalty = -3 if re.search(r"toon|cartoon|low[\s_-]*poly|ps1|ps2|stylized", name) else 0
    return lic_score * 10 + name_hits * 4 + quality * 3 + toon_penalty


def main():
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))

    ids = []
    for fn in sorted(os.listdir(SRC)):
        if not fn.endswith(".ts"):
            continue
        txt = open(os.path.join(SRC, fn), encoding="utf-8").read()
        for m in re.finditer(r"id:\s*'([a-z0-9-]+)'\s*,\s*brand:\s*'([a-z]+)'", txt):
            vid, brand = m.group(1), m.group(2)
            if brand in BRAND_ALIASES:
                ids.append((vid, brand))

    manifest = {}
    if os.path.exists(OUT):
        manifest = json.load(open(OUT, encoding="utf-8"))

    for vid, brand in ids:
        if only and vid not in only:
            continue
        if vid in manifest and manifest[vid].get("status") == "candidate" and vid not in OVERRIDES:
            print(f"  = {vid}: already in manifest")
            continue
        print(f"→ {vid}")
        best = None
        queries = OVERRIDES.get(vid) or parse_id(vid, brand)
        for q in queries:
            words = set((brand + " " + q).lower().split())
            for r in search(q):
                s = score(r, words)
                if s > 0 and (best is None or s > best["_score"]):
                    best = {
                        "_score": s,
                        "sketchfabUid": r.get("uid"),
                        "name": r.get("name"),
                        "creator": (r.get("user") or {}).get("username"),
                        "license": LIC_LABEL.get((r.get("license") or {}).get("uid"), (r.get('license') or {}).get('label')),
                        "faceCount": r.get("faceCount"),
                        "vertexCount": r.get("vertexCount"),
                        "animationCount": r.get("animationCount"),
                        "source": f"https://sketchfab.com/3d-models/{r.get('uid')}",
                        "searchQuery": q,
                    }
            if best and best["_score"] >= 30:
                break  # strong CC-BY exact hit; no need for fallback query
            time.sleep(0.4)
        if best:
            manifest[vid] = {"status": "candidate", **best}
            print(f"    ✓ {best['name']} · {best['license']} · {best['faceCount']} faces · by {best['creator']}")
        else:
            manifest[vid] = {"status": "none-found"}
            print("    ✗ no licensed downloadable candidate")
        time.sleep(0.4)

    json.dump(manifest, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    got = sum(1 for v in manifest.values() if v.get("candidates", v.get("status") == "candidate"))
    print(f"\nManifest: {len(manifest)} vehicles → {OUT}")


if __name__ == "__main__":
    main()
