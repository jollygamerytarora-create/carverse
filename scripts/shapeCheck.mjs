import * as THREE from 'three';

// Mirror of hullShape in CarModel.tsx for the M5 (sedan, L=5.06)
const L = 5.06;
const body = 'sedan';
const spec = { wheelR: 0.34, archR: 0.4, bottomY: 0.26, belt: 0.72, roof: 1.32 };
const top = [
  [L / 2, 0.58],
  [L * 0.3, 0.66],
  [L * 0.1, 0.72],
  [-L * 0.28, 0.7],
  [-L / 2, 0.74],
];

function yAtZ(z) {
  if (z >= top[0][0]) return top[0][1];
  for (let i = 0; i < top.length - 1; i++) {
    const [z1, y1] = top[i];
    const [z2, y2] = top[i + 1];
    if (z <= z1 && z >= z2) return y1 + ((y2 - y1) * (z1 - z)) / Math.max(0.0001, z1 - z2);
  }
  return top[top.length - 1][1];
}

const wF = L * 0.18;
const wR = -L * 0.19;
const cy = spec.wheelR - 0.05;
const archR = Math.min(spec.archR, Math.min(yAtZ(wF), yAtZ(wR)) - cy - 0.02);

const s = new THREE.Shape();
s.moveTo(L / 2, spec.bottomY);
for (const [z, y] of top) s.lineTo(z, y);
s.lineTo(-L / 2, spec.bottomY);
s.lineTo(wR - archR, spec.bottomY);
s.absarc(wR, cy, archR, Math.PI, 0, true);
s.lineTo(wF - archR, spec.bottomY);
s.absarc(wF, cy, archR, Math.PI, 0, true);
s.lineTo(L / 2, spec.bottomY);
s.closePath();

console.log('wF', wF.toFixed(3), 'wR', wR.toFixed(3), 'cy', cy.toFixed(3), 'archR', archR.toFixed(3));
console.log('points:', s.getPoints(64).map(p => `(${p.x.toFixed(2)},${p.y.toFixed(2)})`).join(' ').slice(0, 1200));

const geo = new THREE.ExtrudeGeometry(s, { depth: 1.9, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 3, steps: 1 });
geo.computeBoundingBox();
console.log('bbox:', JSON.stringify(geo.boundingBox));
console.log('verts:', geo.attributes.position.count);
