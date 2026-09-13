"""Validate the assembled car.glb by decoding POSITION buffers in a real GLB
parse pass (no three.js needed): container, accessors, and final world bounds."""
import json
import struct

P = "public/cars/bmw/x5-g05/car.glb"
data = open(P, "rb").read()
magic, ver, total = struct.unpack("<III", data[:12])
jlen, _ = struct.unpack("<II", data[12:20])
g = json.loads(data[20:20 + jlen])
off = 20 + jlen
blen, _ = struct.unpack("<II", data[off:off + 8])
binb = data[off + 8:off + 8 + blen]

CT = {5120: "b", 5121: "B", 5122: "h", 5123: "H", 5125: "I", 5126: "f"}
NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT4": 16}
SIZE = {5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4}


def node_matrix(n):
    import math
    if "matrix" in n:
        return n["matrix"]
    t = n.get("translation", [0, 0, 0])
    s = n.get("scale", [1, 1, 1])
    q = n.get("rotation", [0, 0, 0, 1])
    x, y, z, w = q
    # column-major 4x4 like glTF
    rot = [
        1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 0,
        2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 0,
        2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y), 0,
        t[0], t[1], t[2], 1,
    ]
    return [rot[i] * s[i % 4] if i % 4 != 3 else rot[i] for i in range(16)]


def mat_mul(a, b):
    r = [0.0] * 16
    for c in range(4):
        for rr in range(4):
            r[c * 4 + rr] = sum(a[k * 4 + rr] * b[c * 4 + k] for k in range(4))
    return r


def read_positions(mesh_idx, m):
    out = []
    for p in g["meshes"][mesh_idx]["primitives"]:
        ai = p["attributes"].get("POSITION")
        if ai is None:
            continue
        a = g["accessors"][ai]
        bv = g["bufferViews"][a["bufferView"]]
        o = bv.get("byteOffset", 0) + a.get("byteOffset", 0)
        cnt, stride = a["count"], (a.get("byteStride") or 12)
        for i in range(cnt):
            x, y, z = struct.unpack_from("<fff", binb, o + i * stride)
            out.append((x, y, z))
    return out


world_lo = [1e9] * 3
world_hi = [-1e9] * 3
mesh_world = {}
for root in g["scenes"][0]["nodes"]:
    stack = [(root, node_matrix(g["nodes"][root]))]
    while stack:
        ni, pm = stack.pop()
        n = g["nodes"][ni]
        nm = mat_mul(pm, node_matrix(n)) if ("mesh" in n or "children" in n) else pm
        if "mesh" in n:
            lo = [1e9] * 3
            hi = [-1e9] * 3
            for x, y, z in read_positions(n["mesh"], nm):
                for k, v in enumerate((x, y, z)):
                    lo[k] = min(lo[k], v)
                    hi[k] = max(hi[k], v)
                    world_lo[k] = min(world_lo[k], v)
                    world_hi[k] = max(world_hi[k], v)
            mesh_world[n.get("name", f"mesh{n['mesh']}")] = (lo, hi)
        for c in n.get("children", []):
            stack.append((c, nm))

print("world bounds:")
for k, ax in enumerate("xyz"):
    print(f"  {ax}: [{world_lo[k]:8.2f}, {world_hi[k]:8.2f}]  size {world_hi[k]-world_lo[k]:8.2f} cm")
print("meshes with geometry:", len(mesh_world))
