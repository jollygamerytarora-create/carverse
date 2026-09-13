"""Probe: per-mesh world bounds of the merged X5 GLB (TRT walk), to find
which part extends beyond the paint body (5.23m vs 4.92m) and confirm the
wheel kit placement numbers."""
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

nodes = g["nodes"]
scene = g["scenes"][g.get("scene", 0)]


def read_acc_minmax(ai):
    acc = g["accessors"][ai]
    return acc.get("min"), acc.get("max")


def quat_mat(q):
    x, y, z, w = q
    return [
        [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w)],
        [2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w)],
        [2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)],
    ]


def mat_mul(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(3)) for j in range(3)] for i in range(3)]


def node_mat(n):
    m = [[1.0, 0, 0], [0, 1.0, 0], [0, 0, 1.0]]
    t = n.get("translation")
    r = n.get("rotation")
    s = n.get("scale")
    if r:
        m = mat_mul(m, quat_mat(r))
    if s:
        m = mat_mul(m, [[s[0], 0, 0], [0, s[1], 0], [0, 0, s[2]]])
    return m


import math


def xform(m, p):
    return [m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] for i in range(3)]


results = []


def walk(ni, pm, parent_t):
    n = nodes[ni]
    m = mat_mul(pm, node_mat(n))
    t = [parent_t[i] + m[i][2 - 1] if False else 0 for i in range(3)]
    # accumulate translation properly: local translation transformed by parent rotation
    lt = n.get("translation", [0, 0, 0])
    t = [parent_t[i] + xform(pm, lt)[i] for i in range(3)]
    if "mesh" in n:
        mins, maxs = read_acc_minmax(g["meshes"][n["mesh"]]["primitives"][0]["attributes"]["POSITION"])
        lo = [t[i] + xform(m, mins)[i] for i in range(3)] if mins else None
        hi = [t[i] + xform(m, maxs)[i] for i in range(3)] if maxs else None
        if lo and hi:
            results.append((n.get("name", f"mesh{n['mesh']}"), lo, hi))
    for c in n.get("children", []):
        walk(c, m, t)


for root in scene["nodes"]:
    walk(root, [[1, 0, 0], [0, 1, 0], [0, 0, 1]], [0, 0, 0])

gx = [1e9, -1e9]
gy = [1e9, -1e9]
gz = [1e9, -1e9]
for name, lo, hi in results:
    gx[0] = min(gx[0], lo[0]); gx[1] = max(gx[1], hi[0])
    gy[0] = min(gy[0], lo[1]); gy[1] = max(gy[1], hi[1])
    gz[0] = min(gz[0], lo[2]); gz[1] = max(gz[1], hi[2])
    # flag outliers vs the paint body envelope (x -93.7..398, z -98.4..98.4)
    if hi[0] > 400 or lo[0] < -96 or hi[2] > 100 or lo[2] < -100 or hi[1] > 140 or lo[1] < -40:
        print(f"OUTLIER {name}: x[{lo[0]:.1f},{hi[0]:.1f}] y[{lo[1]:.1f},{hi[1]:.1f}] z[{lo[2]:.1f},{hi[2]:.1f}]")

print(f"\nTOTAL: x[{gx[0]:.1f},{gx[1]:.1f}] = {gx[1]-gx[0]:.1f}cm  y[{gy[0]:.1f},{gy[1]:.1f}]  z[{gz[0]:.1f},{gz[1]:.1f}]")
print(f"\nWheel-mesh bounds (before any kit fix):")
for name, lo, hi in results:
    if "Wheel" in name or "Brake" in name:
        print(f"  {name}: x[{lo[0]:.1f},{hi[0]:.1f}] y[{lo[1]:.1f},{hi[1]:.1f}] z[{lo[2]:.1f},{hi[2]:.1f}]")
