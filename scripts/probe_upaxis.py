"""Compute TRUE world-space bounds for every vehicle GLB and classify orientation.

Raw accessor min/max ignore node transforms, and glTF files are frequently
authored Z-up (or X-up) with the fix on a node — so we compose world matrices,
then decide orientation by CLUSTERING per-mesh AABBs: take the meshes forming
the longest contiguous hull (the body, in authoring units), and check whether
that hull's vertical extent is comparable to a car's height.

A correctly Y-up car shows: hull long-axis height (world Y span) << 35% of hull
length (it lies flat). A stand-on-nose car shows: hull long-axis height ≈ 100%
of hull length (the car's full height hangs along the run of the hull).

Output: scripts/upaxis.json → consumed by scripts/sync_registry.js which writes
an `axis` fix into the generated asset records automatically.
"""
import glob
import json
import os
import struct

# ---------- column-major mat4 (glTF convention) ----------


def identity():
    return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]


def quat_to_mat(q):
    x, y, z, w = q
    x2, y2, z2 = x * x, y * y, z * z
    xy, xz, yz = x * y, x * z, y * z
    wx, wy, wz = w * x, w * y, w * z
    return [
        1 - 2 * (y2 + z2), 2 * (xy + wz), 2 * (xz - wy), 0,
        2 * (xy - wz), 1 - 2 * (x2 + z2), 2 * (yz + wx), 0,
        2 * (xz + wy), 2 * (yz - wx), 1 - 2 * (x2 + y2), 0,
        0, 0, 0, 1,
    ]


def compose(t, r, s):
    m = quat_to_mat(r)
    for col in range(3):
        for row in range(3):
            m[col * 4 + row] *= s[col]
    m[12], m[13], m[14] = t
    return m


def mul(a, b):
    """a * b, both column-major 16-lists."""
    out = [0.0] * 16
    for c in range(4):
        for r in range(4):
            out[c * 4 + r] = sum(a[k * 4 + r] * b[c * 4 + k] for k in range(4))
    return out


def xform(m, p):
    x, y, z = p
    return (
        m[0] * x + m[4] * y + m[8] * z + m[12],
        m[1] * x + m[5] * y + m[9] * z + m[13],
        m[2] * x + m[6] * y + m[10] * z + m[14],
    )


def load_json(path):
    data = open(path, 'rb').read()
    if data[:4] == b'glTF':
        jlen, _ = struct.unpack('<II', data[12:20])
        return json.loads(data[20:20 + jlen])
    return json.load(open(path, encoding='utf-8'))


def mesh_aabbs(g):
    """Per-node world AABBs: [(aabb8x3, node_name), …] with node transforms applied."""
    out = []

    def visit(idx, parent):
        n = g['nodes'][idx]
        if 'matrix' in n:
            local = list(n['matrix'])
        else:
            local = compose(
                n.get('translation', [0, 0, 0]),
                n.get('rotation', [0, 0, 0, 1]),
                n.get('scale', [1, 1, 1]),
            )
        w = mul(parent, local)
        if 'mesh' in n:
            mesh = g['meshes'][n['mesh']]
            mins = [1e30] * 3
            maxs = [-1e30] * 3
            got = False
            for prim in mesh.get('primitives', []):
                ai = prim.get('attributes', {}).get('POSITION')
                if ai is None:
                    continue
                acc = g['accessors'][ai]
                amin, amax = acc.get('min'), acc.get('max')
                if not (amin and amax):
                    continue
                got = True
                for cx in (amin[0], amax[0]):
                    for cy in (amin[1], amax[1]):
                        for cz in (amin[2], amax[2]):
                            p = xform(w, (cx, cy, cz))
                            for i in range(3):
                                mins[i] = min(mins[i], p[i])
                                maxs[i] = max(maxs[i], p[i])
            if got:
                out.append((mins, maxs, n.get('name', '')))
        for c in n.get('children', []):
            visit(c, w)

    scenes = g.get('scenes', [])
    scene_idx = g.get('scene', 0)
    if scenes and 'nodes' in scenes[scene_idx]:
        for root in scenes[scene_idx]['nodes']:
            visit(root, identity())
    return out


def classify_file(g):
    """Return (axis, diagnostics) — axis is None | 'z-up'.

    Sound rule: a correct Y-up car NEVER has its longest world extent along Y
    (length lies along Z or X; height Y is the smallest axis). Therefore:
        worldY > 1.25 * max(worldX, worldZ)  =>  authored Z-up (standing on nose).
    X-longest is NOT auto-fixed: nose-along-X authoring displays fine and a
    wrong rotation would break working models.
    """
    aabbs = mesh_aabbs(g)
    if not aabbs:
        return None, {'error': 'no POSITION bounds'}
    mins = [min(a[0][i] for a in aabbs) for i in range(3)]
    maxs = [max(a[1][i] for a in aabbs) for i in range(3)]
    ex = [maxs[i] - mins[i] for i in range(3)]
    diag = {'extents': [round(v, 2) for v in ex]}

    axis = None
    if ex[1] > 1.25 * max(ex[0], ex[2]):
        axis = 'z-up'
    diag['lengthAxis'] = 'z' if ex[2] >= ex[0] else 'x'

    # Duplicate-variant prune: some uploads ship a second partial shell
    # floating far above the car along the authoring up axis (bmw-m5 floats
    # 106 meshes at z 2.14-3.52 above the 510-mesh main body at 0.2-1.6).
    # For Z-up-authored files: find the LARGEST gap between consecutive mesh
    # centers along authoring-z; if the minority cluster above it holds <40%
    # of meshes, everything above the main hull's top is a detached extra.
    if axis == 'z-up':
        items = sorted((mn[2] + mx[2]) / 2 for mn, mx, _ in aabbs)
        best_i, best_gap = -1, 0.0
        for i in range(len(items) - 1):
            g2 = items[i + 1] - items[i]
            if g2 > best_gap:
                best_gap, best_i = g2, i
        if best_i >= 0:
            below = items[:best_i + 1]
            above = items[best_i + 1:]
            # main hull extent along authoring z (needs per-mesh z spans)
            below_spans = [(mn[2], mx[2]) for mn, mx, _ in aabbs if (mn[2] + mx[2]) / 2 <= items[best_i]]
            below_lo = min(s[0] for s in below_spans)
            below_hi = max(s[1] for s in below_spans)
            below_ext = below_hi - below_lo
            if below_ext > 0 and best_gap > 0.35 * below_ext and len(above) < 0.4 * len(items) and len(above) >= 5:
                diag['hideBeyondOriginalAxis'] = round(below_hi + 0.02, 2)
    return axis, diag


def classify():
    report = {}
    for path in sorted(glob.glob(os.path.join('public', 'cars', '*', '*', 'model.glb'))):
        vid = os.path.basename(os.path.dirname(path))
        try:
            g = load_json(path)
            axis, diag = classify_file(g)
        except Exception as e:  # noqa: BLE001
            report[vid] = {'error': str(e)[:80]}
            continue
        report[vid] = diag
        if axis:
            diag['axis'] = axis
    return report


if __name__ == '__main__':
    rep = classify()
    out = os.path.join('scripts', 'upaxis.json')
    json.dump(rep, open(out, 'w', encoding='utf-8'), indent=1)
    for k, v in sorted(rep.items()):
        if v.get('axis'):
            print(f"{k:24} {v['axis']:5} ratio={v.get('hullRatio')} extents={v.get('extents')}")
        elif v.get('error'):
            print(f"{k:24} ERROR: {v['error']}")
    bad = sum(1 for v in rep.values() if v.get('axis'))
    errs = sum(1 for v in rep.values() if v.get('error'))
    print(f"\n{len(rep)} vehicles scanned - {len(rep) - bad - errs} OK, {bad} orientation fixes, {errs} errors -> {out}")
