"""Merge the 15 BMW G05 part glTFs into one web-ready GLB (car.glb) — v2.

Fixes over v1: buffer padding bytes are actually appended, bufferView-backed
images are remapped, and per-part node groups are kept flat (no pivot math —
doors/hood/tailgate live as separate named groups so hinge animations can be
added in the loader later).

Output: public/cars/bmw/x5-g05/car.glb
"""
import base64
import glob
import json
import os
import struct

PARTS_DIR = "public/cars/bmw/x5-g05/meshes"
OUT = "public/cars/bmw/x5-g05/car.glb"


def decode_buffer(b):
    uri = b.get("uri", "")
    if uri.startswith("data:"):
        return base64.b64decode(uri.split(",", 1)[1])
    raise RuntimeError("external buffer not supported")


def main():
    files = sorted(glob.glob(os.path.join(PARTS_DIR, "**", "*.gltf"), recursive=True))
    assert len(files) == 15, f"expected 15 parts, found {len(files)}"

    chunks = []          # raw byte chunks of the final flat buffer
    cursor = [0]         # running offset
    buffer_views = []
    accessors = []
    materials = []
    textures = []
    images = []
    samplers = [{"magFilter": 9729, "minFilter": 9987, "wrapS": 10497, "wrapT": 10497}]
    nodes = []
    meshes = []
    scene_roots = []

    def add_bytes(data: bytes) -> int:
        offset = cursor[0]
        chunks.append(data)
        cursor[0] += len(data)
        pad = (4 - len(data) % 4) % 4
        if pad:
            chunks.append(b"\x00" * pad)
            cursor[0] += pad
        buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(data)})
        return len(buffer_views) - 1

    for path in files:
        rel = os.path.relpath(path, PARTS_DIR).replace("\\", "/")
        g = json.load(open(path, encoding="utf-8"))
        src_buf = decode_buffer(g["buffers"][0])

        # ---- images (uri data-URIs OR bufferView-backed) ----
        img_base = len(images)
        for img in g.get("images", []):
            if "uri" in img:
                head, b64 = img["uri"].split(",", 1)
                images.append({"mimeType": head.split(":")[1].split(";")[0], "_bytes": base64.b64decode(b64)})
            elif "bufferView" in img:
                bv = g["bufferViews"][img["bufferView"]]
                off = bv.get("byteOffset", 0)
                images.append({"mimeType": img.get("mimeType", "image/png"), "_bytes": src_buf[off:off + bv["byteLength"]]})
            else:
                raise RuntimeError("unsupported image in " + rel)
        for t in g.get("textures", []):
            src = t.get("source")
            textures.append({"source": img_base + src if src is not None else None, "sampler": 0})

        # ---- materials (texture indices remapped to global) ----
        tex_base = len(textures) - len(g.get("textures", []))
        for m in g.get("materials", []):
            m = json.loads(json.dumps(m))  # deep copy
            pbr = m.get("pbrMetallicRoughness", {})
            if "baseColorTexture" in pbr:
                pbr["baseColorTexture"]["index"] = tex_base + pbr["baseColorTexture"].get("index", 0)
            for slot in ("metallicRoughnessTexture", "normalTexture", "occlusionTexture", "emissiveTexture"):
                if slot in pbr:
                    pbr[slot]["index"] = tex_base + pbr[slot].get("index", 0)
                if slot in m:
                    m[slot]["index"] = tex_base + m[slot].get("index", 0)
            materials.append(m)

        # ---- accessors: copy their bytes into the flat buffer ----
        acc_map = {}
        for i, a in enumerate(g.get("accessors", [])):
            a = dict(a)
            if "bufferView" in a:
                bv = g["bufferViews"][a["bufferView"]]
                off = bv.get("byteOffset", 0)
                a["bufferView"] = add_bytes(src_buf[off:off + bv["byteLength"]])
            acc_map[i] = len(accessors)
            accessors.append(a)

        # ---- meshes ----
        mesh_base = len(meshes)
        for m in g.get("meshes", []):
            m = dict(m)
            prims = []
            for p in m.get("primitives", []):
                p = dict(p)
                p["attributes"] = {k: acc_map[vi] for k, vi in p["attributes"].items()}
                if "indices" in p:
                    p["indices"] = acc_map[p["indices"]]
                prims.append(p)
            m["primitives"] = prims
            meshes.append(m)

        # ---- nodes: one named group per part, hierarchy + transforms kept ----
        # Only the part's scene-root nodes become children of the group; deeper
        # hierarchy is preserved by remapping part-local child indices.
        grp_index = len(nodes)
        group_name = "G_" + rel.replace("/", "_").replace(".gltf", "")
        g_nodes = g.get("nodes", [])
        for n in g_nodes:
            nn = {}
            if "mesh" in n:
                nn["mesh"] = mesh_base + n["mesh"]
            if "name" in n:
                nn["name"] = n["name"]
            for k in ("translation", "rotation", "scale", "matrix"):
                if k in n:
                    nn[k] = n[k]
            nodes.append(nn)
        for local_i, n in enumerate(g_nodes):
            if "children" in n:
                nodes[grp_index + local_i]["children"] = [grp_index + c for c in n["children"]]
        group_index = len(nodes)
        nodes.append({"name": group_name, "children": [grp_index + r for r in g["scenes"][0]["nodes"]]})
        scene_roots.append(group_index)

    # ---- flush image bytes ----
    for img in images:
        data = img.pop("_bytes")
        img["bufferView"] = add_bytes(data)

    bin_blob = b"".join(chunks)

    gltf = {
        "asset": {"version": "2.0", "generator": "carverse G05 assembler v2"},
        "scene": 0,
        "scenes": [{"name": "BMW_X5_G05", "nodes": scene_roots}],
        "nodes": nodes,
        "meshes": meshes,
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(bin_blob)}],
        "materials": materials,
        "textures": textures,
        "images": images,
        "samplers": samplers,
    }

    json_bin = json.dumps(gltf, separators=(",", ":")).encode("utf-8")
    pad = (4 - len(json_bin) % 4) % 4
    json_bin += b" " * pad

    total = 12 + 8 + len(json_bin) + 8 + len(bin_blob)
    with open(OUT, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(json_bin), 0x4E4F534A))
        f.write(json_bin)
        f.write(struct.pack("<II", len(bin_blob), 0x004E4942))
        f.write(bin_blob)

    print(f"wrote {OUT} ({os.path.getsize(OUT) / 1024 / 1024:.1f} MB, {len(meshes)} meshes, {len(materials)} materials, {len(images)} images)")


if __name__ == "__main__":
    main()
