'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Extrude } from '@react-three/drei';
import { Vehicle } from '@/lib/types';
import { useStore } from '@/lib/store';
import { engineSynth } from '@/lib/engineAudio';
import { dnaFor } from '@/data/dna';

export interface HotspotInfo {
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

export const INTERIOR_HOTSPOTS: Record<string, string> = {
  dash: 'Driver-oriented digital cockpit',
  screen: 'Central infotainment display',
  wheel: 'Multifunction steering wheel',
  seats: 'Sport seats with heating & ventilation',
  ambient: 'Ambient interior lighting',
  speakers: 'Premium surround sound system',
};

/* ============ silhouette spec per body type ============
   All heights in metres, matching real-world vehicle proportions.
   belt = top of the lower body; roof = top of the glasshouse. */

interface BodySpec {
  wheelR: number;
  archR: number;
  bottomY: number;
  belt: number;
  roof: number;
  /** hull top profile from nose (+L/2) to tail (−L/2) */
  top: (L: number) => [number, number][];
}

const SPECS: Record<Vehicle['bodyType'], BodySpec> = {
  suv: {
    wheelR: 0.4, archR: 0.46, bottomY: 0.32, belt: 1.0, roof: 1.56,
    top: (L) => [[L / 2, 0.78], [L * 0.3, 0.88], [L * 0.16, 1.0], [-L * 0.26, 0.98], [-L / 2, 0.9]],
  },
  sedan: {
    wheelR: 0.34, archR: 0.4, bottomY: 0.26, belt: 0.72, roof: 1.32,
    top: (L) => [[L / 2, 0.58], [L * 0.3, 0.66], [L * 0.1, 0.72], [-L * 0.28, 0.7], [-L / 2, 0.74]],
  },
  gt: {
    wheelR: 0.33, archR: 0.39, bottomY: 0.25, belt: 0.66, roof: 1.2,
    top: (L) => [[L / 2, 0.5], [L * 0.28, 0.58], [L * 0.08, 0.66], [-L * 0.3, 0.64], [-L / 2, 0.66]],
  },
  coupe: {
    wheelR: 0.33, archR: 0.39, bottomY: 0.25, belt: 0.68, roof: 1.22,
    top: (L) => [[L / 2, 0.52], [L * 0.28, 0.6], [L * 0.08, 0.68], [-L * 0.3, 0.66], [-L / 2, 0.64]],
  },
  'hot-hatch': {
    wheelR: 0.33, archR: 0.39, bottomY: 0.26, belt: 0.8, roof: 1.34,
    top: (L) => [[L / 2, 0.58], [L * 0.24, 0.66], [L * 0.12, 0.8], [-L * 0.4, 0.78], [-L / 2, 0.84]],
  },
  sports: {
    wheelR: 0.32, archR: 0.38, bottomY: 0.24, belt: 0.58, roof: 1.14,
    top: (L) => [[L / 2, 0.42], [L * 0.26, 0.5], [L * 0.04, 0.58], [-L * 0.28, 0.56], [-L / 2, 0.52]],
  },
  hyper: {
    wheelR: 0.33, archR: 0.38, bottomY: 0.25, belt: 0.52, roof: 1.06,
    top: (L) => [[L / 2, 0.36], [L * 0.22, 0.44], [L * 0.02, 0.52], [-L * 0.24, 0.5], [-L / 2, 0.46]],
  },
  estate: {
    wheelR: 0.34, archR: 0.4, bottomY: 0.26, belt: 0.74, roof: 1.36,
    top: (L) => [[L / 2, 0.58], [L * 0.3, 0.66], [L * 0.08, 0.74], [-L * 0.42, 0.72], [-L / 2, 0.76]],
  },
};

function specFor(body: Vehicle['bodyType']): BodySpec {
  return SPECS[body] ?? SPECS.sedan;
}

function yAtZ(L: number, body: Vehicle['bodyType'], z: number): number {
  const top = specFor(body).top(L);
  if (z >= top[0][0]) return top[0][1];
  for (let i = 0; i < top.length - 1; i++) {
    const [z1, y1] = top[i];
    const [z2, y2] = top[i + 1];
    if (z <= z1 && z >= z2) return y1 + ((y2 - y1) * (z1 - z)) / Math.max(0.0001, z1 - z2);
  }
  return top[top.length - 1][1];
}

function hullShape(L: number, body: Vehicle['bodyType']): THREE.Shape {
  const spec = specFor(body);
  const wF = L * 0.18;
  const wR = -L * 0.19;
  const cy = spec.wheelR - 0.02; // arch centre height (≈ wheel centre)
  // keep the arch cut inside the silhouette
  const archR = Math.min(spec.archR, Math.min(yAtZ(L, body, wF), yAtZ(L, body, wR)) - cy - 0.02);
  const top = spec.top(L);
  const s = new THREE.Shape();
  s.moveTo(L / 2, spec.bottomY);
  for (const [z, y] of top) s.lineTo(z, y);
  s.lineTo(-L / 2, spec.bottomY);
  // rear arch (outline arc over the wheel)
  s.lineTo(wR - archR, spec.bottomY);
  s.absarc(wR, cy, archR, Math.PI, 0, true);
  s.lineTo(wF - archR, spec.bottomY);
  s.absarc(wF, cy, archR, Math.PI, 0, true);
  s.lineTo(L / 2, spec.bottomY);
  s.closePath();
  return s;
}

function glassShape(L: number, body: Vehicle['bodyType']): THREE.Shape {
  const spec = specFor(body);
  const low = body === 'sports' || body === 'hyper' || body === 'gt';
  // raked windshield / rear glass (proper sloped pillars, not a vertical wall)
  const zf = low ? 0.3 : 0.32;
  const zr = low ? 0.3 : 0.34;
  const roofTop = spec.roof - 0.14;
  const beltY = spec.belt - 0.03;
  const s = new THREE.Shape();
  s.moveTo(L * zf, beltY);
  s.lineTo(L * (zf - 0.2), roofTop); // windshield rake
  s.lineTo(-L * (zr - 0.2), roofTop); // roof span
  s.lineTo(-L * zr, beltY); // rear glass rake
  s.closePath();
  return s;
}

/* ============ standalone cockpit set for interior mode ============ */

export function InteriorSet({ accent, onHotspot }: { accent: string; onHotspot?: (info: HotspotInfo | null) => void }) {
  const clusterMat = useRef<THREE.MeshStandardMaterial>(null);
  const screenMat = useRef<THREE.MeshStandardMaterial>(null);
  const wheelGroup = useRef<THREE.Group>(null);
  const interiorView = useStore((s) => s.interiorView);
  const rearView = interiorView === 'rear';

  const click = (id: string) => ({
    onClick: () => onHotspot?.({ id, label: INTERIOR_HOTSPOTS[id] ?? id, pos: [0, 1.2, 0], target: [0, 1.15, 0] }),
    onPointerOver: () => (document.body.style.cursor = 'pointer'),
    onPointerOut: () => (document.body.style.cursor = 'auto'),
  });

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const rev = engineSynth.rpm;
    if (clusterMat.current) clusterMat.current.emissiveIntensity = 1.1 + Math.sin(t * 2.2) * 0.12 + rev * 1.4;
    if (screenMat.current) screenMat.current.emissiveIntensity = 0.9 + Math.sin(t * 1.1) * 0.1 + rev * 0.8;
    if (wheelGroup.current) wheelGroup.current.rotation.z = Math.sin(t * 0.6) * 0.02;
  });

  return (
    <group>
      <mesh position={[0, 0.52, 0.2]} receiveShadow>
        <boxGeometry args={[2.1, 0.08, 3.6]} />
        <meshStandardMaterial color="#101216" roughness={0.9} />
      </mesh>

      <RoundedBox args={[2.0, 0.36, 0.55]} radius={0.06} smoothness={3} position={[0, 1.2, 1.05]} {...click('dash')}>
        <meshStandardMaterial color="#17191e" roughness={0.65} metalness={0.25} />
      </RoundedBox>
      <RoundedBox args={[2.0, 0.08, 0.7]} radius={0.04} smoothness={3} position={[0, 1.4, 0.95]}>
        <meshStandardMaterial color="#121419" roughness={0.8} />
      </RoundedBox>

      <mesh position={[-0.45, 1.42, 0.78]} rotation={[-0.42, 0, 0]} {...click('dash')}>
        <planeGeometry args={[0.86, 0.34]} />
        <meshStandardMaterial ref={clusterMat} color="#0a1622" emissive="#4a86c8" emissiveIntensity={1.2} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0.14, 1.44, 0.8]} rotation={[-0.34, 0, -0.06]} {...click('screen')}>
        <planeGeometry args={[0.62, 0.42]} />
        <meshStandardMaterial ref={screenMat} color="#0a1220" emissive="#2f6faf" emissiveIntensity={1.0} side={THREE.DoubleSide} />
      </mesh>

      <group ref={wheelGroup} position={[-0.45, 1.16, 0.6]} rotation={[1.12, 0, 0]} {...click('wheel')}>
        <mesh>
          <torusGeometry args={[0.2, 0.028, 14, 40]} />
          <meshStandardMaterial color="#23262c" roughness={0.45} metalness={0.35} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <boxGeometry args={[0.38, 0.05, 0.03]} />
          <meshStandardMaterial color="#2a2d34" roughness={0.5} />
        </mesh>
        <mesh position={[0, -0.13, 0.02]}>
          <boxGeometry args={[0.05, 0.18, 0.03]} />
          <meshStandardMaterial color="#2a2d34" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <cylinderGeometry args={[0.05, 0.06, 0.1, 16]} />
          <meshStandardMaterial color={accent} roughness={0.35} metalness={0.5} emissive={accent} emissiveIntensity={0.35} />
        </mesh>
      </group>

      <RoundedBox args={[0.32, 0.34, 1.5]} radius={0.04} smoothness={3} position={[0, 0.95, 0.15]}>
        <meshStandardMaterial color="#1a1c22" roughness={0.55} metalness={0.3} />
      </RoundedBox>
      {/* rear AC vents on the console back face */}
      <mesh position={[0, 0.9, 0.92]}>
        <boxGeometry args={[0.26, 0.09, 0.03]} />
        <meshStandardMaterial color="#0d0e11" roughness={0.5} metalness={0.4} />
      </mesh>
      <mesh position={[0, 0.9, 0.937]}>
        <boxGeometry args={[0.18, 0.018, 0.006]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.9} />
      </mesh>
      {/* rear armrest + cupholders */}
      <RoundedBox args={[0.34, 0.1, 0.4]} radius={0.04} smoothness={3} position={[0, 0.93, -0.78]}>
        <meshStandardMaterial color="#211d22" roughness={0.8} />
      </RoundedBox>
      {[-0.08, 0.08].map((x) => (
        <mesh key={x} position={[x, 0.985, -0.72]}>
          <cylinderGeometry args={[0.035, 0.035, 0.02, 16]} />
          <meshStandardMaterial color="#0b0c0f" roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.16, 0.35]}>
        <boxGeometry args={[0.09, 0.12, 0.22]} />
        <meshStandardMaterial color="#2c2f36" roughness={0.4} metalness={0.5} />
      </mesh>

      {[-0.45, 0.45].map((x) => (
        <group key={x} position={[x, 0.78, -0.28]} {...click('seats')}>
          <RoundedBox args={[0.52, 0.16, 0.56]} radius={0.05} smoothness={3}>
            <meshStandardMaterial color="#2a2226" roughness={0.85} />
          </RoundedBox>
          <RoundedBox args={[0.52, 0.72, 0.16]} radius={0.05} smoothness={3} position={[0, 0.42, -0.26]} rotation={[0.18, 0, 0]}>
            <meshStandardMaterial color="#2a2226" roughness={0.85} />
          </RoundedBox>
          <mesh position={[0, 0.86, -0.3]} rotation={[0.18, 0, 0]}>
            <boxGeometry args={[0.24, 0.18, 0.1]} />
            <meshStandardMaterial color="#241d21" roughness={0.85} />
          </mesh>
        </group>
      ))}

      <group position={[0, 0.82, -1.35]}>
        <RoundedBox args={[1.7, 0.16, 0.5]} radius={0.05} smoothness={3}>
          <meshStandardMaterial color="#241d21" roughness={0.9} />
        </RoundedBox>
        <RoundedBox args={[1.5, 0.6, 0.14]} radius={0.05} smoothness={3} position={[0, 0.36, -0.2]} rotation={[0.14, 0, 0]}>
          <meshStandardMaterial color="#241d21" roughness={0.9} />
        </RoundedBox>
      </group>

      {[-1.02, 1.02].map((x) => (
        <group key={x}>
          <RoundedBox args={[0.1, 0.62, 2.5]} radius={0.03} smoothness={3} position={[x, 1.12, 0.1]}>
            <meshStandardMaterial color="#191b20" roughness={0.7} />
          </RoundedBox>
          <mesh position={[x * 0.94, 1.08, 0.05]}>
            <boxGeometry args={[0.09, 0.07, 0.5]} />
            <meshStandardMaterial color="#26292f" roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[x * 0.965, 1.0, -0.35]} rotation={[0, x > 0 ? -Math.PI / 2 : Math.PI / 2, 0]} {...click('speakers')}>
            <circleGeometry args={[0.13, 24]} />
            <meshStandardMaterial color="#0d0e11" roughness={0.6} metalness={0.4} />
          </mesh>
        </group>
      ))}

      <mesh position={[0, 1.6, 0.25]} {...click('ambient')}>
        <boxGeometry args={[1.7, 0.015, 0.05]} />
        <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={2.2} />
      </mesh>
      {[-0.98, 0.98].map((x) => (
        <mesh key={x} position={[x, 1.64, -0.1]} visible={!rearView}>
          <boxGeometry args={[0.09, 0.06, 2.8]} />
          <meshStandardMaterial color="#14161a" roughness={0.8} />
        </mesh>
      ))}
      <pointLight position={[0, 1.55, 0.2]} color={accent} intensity={0.5} distance={3.4} />
      <pointLight position={[0, 1.2, 1.4]} intensity={0.9} distance={3.6} color="#bcd2ea" />
      <mesh position={[0, 1.62, 1.28]} rotation={[0.72, 0, 0]} visible={!rearView}>
        <planeGeometry args={[1.9, 1.15]} />
        <meshStandardMaterial color="#0a0c10" transparent opacity={0.16} metalness={0.6} roughness={0.1} />
      </mesh>
    </group>
  );
}

export const CAR_HOTSPOTS: Record<string, HotspotInfo> = {
  headlight: { id: 'headlight', label: 'Adaptive LED Headlights', pos: [0.75, 1.0, 3.2], target: [0, 0.95, 2.3] },
  wheel: { id: 'wheel', label: '20-inch Light Alloy Wheels', pos: [2.4, 0.7, 0.6], target: [1.0, 0.45, 0.6] },
  brake: { id: 'brake', label: 'High-Performance Braking System', pos: [2.2, 0.6, 1.6], target: [1.0, 0.45, 1.6] },
  door: { id: 'door', label: 'Door — click to open/close', pos: [2.3, 1.15, 0], target: [1.0, 1.0, 0] },
  hood: { id: 'hood', label: 'Hood — click to open/close', pos: [0, 1.6, 2.6], target: [0, 1.0, 1.6] },
  boot: { id: 'boot', label: 'Boot — click to open/close', pos: [0, 1.55, -2.6], target: [0, 1.0, -1.8] },
};

interface CarModelProps {
  vehicle: Vehicle;
  paint: string;
  accent: string;
  ghost?: boolean;
  lightsOn?: boolean;
  hotspots?: boolean;
  wheelStyle?: string;
  onHotspot?: (info: HotspotInfo | null) => void;
}

const WHEEL_CFG: Record<string, { n: number; w: number; twist: number; disc?: boolean; closed?: boolean }> = {
  'classic-5': { n: 5, w: 0.07, twist: 0 },
  'double-spoke': { n: 10, w: 0.032, twist: 0 },
  monoblock: { n: 7, w: 0.03, twist: 0, disc: true },
  turbine: { n: 9, w: 0.05, twist: 0.55 },
  'y-spoke': { n: 5, w: 0.045, twist: 0 },
  mesh: { n: 7, w: 0.026, twist: 0.2, disc: true },
  aero: { n: 6, w: 0.05, twist: 0, closed: true },
  'cross-spoke': { n: 8, w: 0.038, twist: 0.35 },
};

function Wheel({
  x,
  z,
  radius,
  accent,
  style = 'classic-5',
  onClick,
  clickable,
}: {
  x: number;
  z: number;
  radius: number;
  accent: string;
  style?: string;
  onClick?: () => void;
  clickable: boolean;
}) {
  const cfg = WHEEL_CFG[style] ?? WHEEL_CFG['classic-5'];
  const face = x > 0 ? 0.135 : -0.135;
  return (
    <group position={[x, radius, z]} rotation={[0, 0, Math.PI / 2]}>
      <mesh
        castShadow
        onClick={clickable ? onClick : undefined}
        onPointerOver={clickable ? () => (document.body.style.cursor = 'pointer') : undefined}
        onPointerOut={clickable ? () => (document.body.style.cursor = 'auto') : undefined}
      >
        <cylinderGeometry args={[radius, radius, 0.26, 28]} />
        <meshStandardMaterial color="#15171b" roughness={0.9} metalness={0.1} />
      </mesh>
      <mesh position={[face, 0, 0]}>
        <cylinderGeometry args={[radius * (cfg.closed ? 0.8 : 0.62), radius * (cfg.closed ? 0.8 : 0.62), 0.03, 24]} />
        <meshStandardMaterial color={cfg.closed ? '#41464e' : '#c9ccd2'} roughness={cfg.closed ? 0.45 : 0.25} metalness={0.95} emissive={accent} emissiveIntensity={0.08} />
      </mesh>
      {cfg.disc && (
        <mesh position={[face + (x > 0 ? 0.012 : -0.012), 0, 0]}>
          <cylinderGeometry args={[radius * 0.4, radius * 0.4, 0.012, 20]} />
          <meshStandardMaterial color="#8f959d" metalness={0.9} roughness={0.35} />
        </mesh>
      )}
      {Array.from({ length: cfg.n }).map((_, i) => (
        <mesh key={i} position={[x > 0 ? 0.15 : -0.15, 0, 0]} rotation={[cfg.twist, 0, (i * Math.PI * 2) / cfg.n]}>
          <boxGeometry args={[cfg.w, radius * 1.14, 0.06]} />
          <meshStandardMaterial color="#aeb3ba" roughness={0.3} metalness={0.9} />
        </mesh>
      ))}
      <mesh
        position={[x > 0 ? 0.1 : -0.1, radius * 0.55, radius * 0.42]}
        rotation={[0, 0, -0.5]}
        onClick={clickable ? onClick : undefined}
        onPointerOver={clickable ? () => (document.body.style.cursor = 'pointer') : undefined}
        onPointerOut={clickable ? () => (document.body.style.cursor = 'auto') : undefined}
      >
        <boxGeometry args={[0.1, 0.2, 0.11]} />
        <meshStandardMaterial color={accent} roughness={0.4} metalness={0.4} emissive={accent} emissiveIntensity={0.15} />
      </mesh>
    </group>
  );
}

export default function CarModel({ vehicle, paint, accent, ghost = false, lightsOn = false, hotspots = true, wheelStyle, onHotspot }: CarModelProps) {
  const group = useRef<THREE.Group>(null);
  const doorPivotL = useRef<THREE.Group>(null);
  const doorPivotR = useRef<THREE.Group>(null);
  const headlightMat = useRef<THREE.MeshStandardMaterial>(null);
  const underglow = useRef<THREE.PointLight>(null);

  const [doorOpen, setDoorOpen] = useState(false);

  useEffect(() => {
    setDoorOpen(false);
  }, [vehicle.id]);

  const d = useMemo(() => {
    const L = vehicle.length / 1000;
    const W = vehicle.width / 1000;
    const body = vehicle.bodyType;
    const spec = specFor(body);
    return {
      L,
      W,
      body,
      spec,
      dna: dnaFor(vehicle),
      wheelR: spec.wheelR,
      wF: L * 0.18,
      wR: -L * 0.19,
      hoodY: spec.belt - 0.02,
      bootY: spec.belt - 0.02,
    };
  }, [vehicle]);

  const clickable = hotspots && !ghost;
  const hover = (on: boolean) => {
    document.body.style.cursor = on && clickable ? 'pointer' : 'auto';
  };

  const emit = (id: 'door' | 'hood' | 'boot' | 'headlight' | 'wheel') => {
    if (!clickable || !onHotspot) return;
    if (id === 'door') setDoorOpen((o) => !o);
    onHotspot(CAR_HOTSPOTS[id]);
  };

  useFrame((state, delta) => {
    const damp = THREE.MathUtils.damp;
    const doorAngle = 0.95;
    if (doorPivotL.current) doorPivotL.current.rotation.y = damp(doorPivotL.current.rotation.y, doorOpen ? doorAngle : 0, 6, delta);
    if (doorPivotR.current) doorPivotR.current.rotation.y = damp(doorPivotR.current.rotation.y, doorOpen ? -doorAngle : 0, 6, delta);
    if (headlightMat.current) {
      const target = lightsOn ? 2.2 : ghost ? 0 : 0.25;
      headlightMat.current.emissiveIntensity = damp(headlightMat.current.emissiveIntensity, target, 5, delta);
    }
    if (underglow.current) {
      const rev = engineSynth.rpm;
      underglow.current.intensity = damp(underglow.current.intensity, ghost ? 0.4 : 0.25 + rev * 2.4, 6, delta);
    }
    if (group.current && !ghost) {
      const t = state.clock.elapsedTime;
      const rev = engineSynth.rpm;
      group.current.position.y = Math.sin(t * 1.4) * 0.006 + (rev > 0.05 ? Math.sin(t * 60) * 0.004 * rev : 0);
    }
  });

  const paintMat = ghost
    ? ({ color: '#1a1d23', metalness: 0.5, roughness: 0.55, clearcoat: 0, envMapIntensity: 0.6 } as const)
    : ({ color: paint, metalness: 0.72, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.35 } as const);

  const hull = useMemo(() => hullShape(d.L, d.body), [d.L, d.body]);
  const glass = useMemo(() => glassShape(d.L, d.body), [d.L, d.body]);

  const zF = d.L / 2;
  const zR = -d.L / 2;

  return (
    <group ref={group} dispose={null}>
      {/* beltline hull — real silhouette with wheel-arch cut-outs. Nose faces +Z.
          Generous bevel rounds the shoulders so the prism reads as sheet metal. */}
      <Extrude
        args={[hull, { depth: d.W, bevelEnabled: true, bevelThickness: 0.11, bevelSize: 0.11, bevelSegments: 4, steps: 1 }]}
        position={[d.W / 2 - 0.11, 0, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
        receiveShadow
      >
        <meshPhysicalMaterial {...paintMat} />
      </Extrude>

      {/* glasshouse */}
      <Extrude
        args={[glass, { depth: d.W * 0.78, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2, steps: 1 }]}
        position={[d.W * 0.39, 0.02, 0]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
      >
        <meshPhysicalMaterial color="#0a0c10" metalness={0.6} roughness={0.08} transparent opacity={ghost ? 0.3 : 0.78} clearcoat={0.8} envMapIntensity={1.6} />
      </Extrude>

      {/* painted roof panel spanning the glass flat */}
      <mesh position={[0, d.spec.roof - 0.105, -d.L * 0.03]} castShadow>
        <boxGeometry
          args={[d.W * 0.72, 0.07, d.L * 0.26]}
        />
        <meshPhysicalMaterial
          {...(d.dna.blackRoof && !ghost
            ? { color: '#0e1013', metalness: 0.6, roughness: 0.3, clearcoat: 0.8, envMapIntensity: 1.2 }
            : paintMat)}
        />
      </mesh>
      {/* racing stripes (heritage models) */}
      {!ghost &&
        d.dna.stripes &&
        d.dna.stripes !== 'none' &&
        (d.dna.stripes === 'centre' ? [0] : [-0.09, 0.09]).map((ox) => (
          <mesh key={`stripe${ox}`} position={[ox, d.spec.roof - 0.062, -d.L * 0.03]}>
            <boxGeometry args={[d.dna.stripes === 'centre' ? 0.16 : 0.08, 0.012, d.L * 0.26]} />
            <meshStandardMaterial color="#0c0e12" roughness={0.4} metalness={0.2} />
          </mesh>
        ))}

      {/* window-line chrome strip at the beltline */}
      <mesh position={[0, d.spec.belt - 0.015, 0]}>
        <boxGeometry args={[d.W * 1.005, 0.022, d.L * 0.42]} />
        <meshStandardMaterial color={ghost ? '#20242b' : '#9aa3ad'} metalness={0.95} roughness={0.22} envMapIntensity={1.4} />
      </mesh>

      {/* dark rocker skirt between the arches */}
      <mesh position={[0, d.spec.bottomY + 0.055, (d.wF - d.spec.archR + d.wR + d.spec.archR) / 2]}>
        <boxGeometry args={[d.W * 0.94, 0.13, d.wF - d.spec.archR - (d.wR + d.spec.archR)]} />
        <meshStandardMaterial color={ghost ? '#131519' : '#0c0e12'} roughness={0.55} metalness={0.3} />
      </mesh>

      {/* door seams */}
      {[-1, 1].map((s) => (
        <group key={`seam${s}`}>
          <mesh position={[s * (d.W / 2 - 0.01), d.spec.belt * 0.55, -d.L * 0.055]}>
            <boxGeometry args={[0.014, d.spec.belt * 0.62, 0.014]} />
            <meshStandardMaterial color="#0a0b0e" roughness={0.6} />
          </mesh>
          <mesh position={[s * (d.W / 2 - 0.01), d.spec.belt * 0.55, -d.L * 0.24]}>
            <boxGeometry args={[0.014, d.spec.belt * 0.62, 0.014]} />
            <meshStandardMaterial color="#0a0b0e" roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* grille — brand signature */}
      {d.dna.grille === 'kidney' && (
        <group position={[0, d.spec.bottomY + 0.18, zF - 0.005]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * d.W * 0.105, 0, 0]}>
              <mesh>
                <boxGeometry args={[d.W * 0.15, 0.26, 0.04]} />
                <meshStandardMaterial color="#101318" roughness={0.5} metalness={0.4} />
              </mesh>
              <mesh position={[0, 0, -0.014]}>
                <boxGeometry args={[d.W * 0.165, 0.275, 0.012]} />
                <meshStandardMaterial color="#b9bec6" metalness={0.9} roughness={0.25} envMapIntensity={1.4} />
              </mesh>
            </group>
          ))}
        </group>
      )}
      {d.dna.grille === 'panamericana' && (
        <group position={[0, d.spec.bottomY + 0.17, zF - 0.005]}>
          <mesh>
            <boxGeometry args={[d.W * 0.4, 0.28, 0.04]} />
            <meshStandardMaterial color="#101318" roughness={0.5} metalness={0.4} />
          </mesh>
          {Array.from({ length: 9 }).map((_, i) => (
            <mesh key={i} position={[-d.W * 0.18 + i * d.W * 0.045, 0, 0.02]}>
              <boxGeometry args={[0.012, 0.26, 0.012]} />
              <meshStandardMaterial color="#c9ccd2" metalness={0.85} roughness={0.3} />
            </mesh>
          ))}
        </group>
      )}
      {d.dna.grille === 'singleframe' && (
        <group position={[0, d.spec.bottomY + 0.17, zF - 0.005]}>
          <mesh>
            <boxGeometry args={[d.W * 0.42, 0.26, 0.04]} />
            <meshStandardMaterial color="#0c0e12" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0, -0.014]}>
            <boxGeometry args={[d.W * 0.44, 0.28, 0.012]} />
            <meshStandardMaterial color="#aeb3ba" metalness={0.85} roughness={0.3} envMapIntensity={1.3} />
          </mesh>
        </group>
      )}
      {d.dna.grille === 'slats' && (
        <group position={[0, d.spec.bottomY + 0.14, zF - 0.008]}>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0, i * 0.07 - 0.07, 0]}>
              <boxGeometry args={[d.W * 0.46, 0.035, 0.045]} />
              <meshStandardMaterial color="#20242b" roughness={0.45} metalness={0.6} />
            </mesh>
          ))}
        </group>
      )}
      {d.dna.grille === 'mesh' && (
        <group position={[0, d.spec.bottomY + 0.15, zF - 0.008]}>
          <mesh>
            <boxGeometry args={[d.W * 0.44, 0.24, 0.05]} />
            <meshStandardMaterial color="#0a0c10" roughness={0.55} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.14, 0]}>
            <boxGeometry args={[d.W * 0.4, 0.03, 0.045]} />
            <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.25} roughness={0.4} metalness={0.4} />
          </mesh>
        </group>
      )}
      {d.dna.grille === 'closed' && (
        <mesh position={[0, d.spec.bottomY + 0.15, zF - 0.006]}>
          <boxGeometry args={[d.W * 0.42, 0.2, 0.03]} />
          <meshPhysicalMaterial color={ghost ? '#1a1d23' : paint} metalness={0.72} roughness={0.24} clearcoat={0.9} />
        </mesh>
      )}

      {/* headlights — per-model light signature */}
      {[-1, 1].map((s) => (
        <group key={s}>
          {d.dna.lights === 'round' ? (
            <group
              position={[s * d.W * 0.3, d.hoodY - 0.08, zF - 0.02]}
              onClick={() => emit('headlight')}
              onPointerOver={() => hover(true)}
              onPointerOut={() => hover(false)}
            >
              <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.088, 0.088, 0.045, 22]} />
                <meshStandardMaterial ref={s === 1 ? headlightMat : undefined} color="#dfe6ee" emissive="#cfe4ff" emissiveIntensity={0.25} roughness={0.2} metalness={0.4} />
              </mesh>
              <mesh position={[0, 0, 0.028]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.055, 0.011, 10, 24]} />
                <meshStandardMaterial color="#e8f2ff" emissive="#cfe4ff" emissiveIntensity={lightsOn ? 2.2 : 0.5} roughness={0.3} />
              </mesh>
            </group>
          ) : d.dna.lights === 'four-dot' ? (
            <group
              position={[s * d.W * 0.3, d.hoodY - 0.09, zF - 0.02]}
              onClick={() => emit('headlight')}
              onPointerOver={() => hover(true)}
              onPointerOut={() => hover(false)}
            >
              {[
                [-0.055, 0.05],
                [0.055, 0.05],
                [-0.055, -0.05],
                [0.055, -0.05],
              ].map(([ox, oy], i) => (
                <mesh key={i} position={[ox, oy, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <cylinderGeometry args={[0.032, 0.032, 0.04, 16]} />
                  <meshStandardMaterial ref={i === 0 && s === 1 ? headlightMat : undefined} color="#dfe6ee" emissive="#cfe4ff" emissiveIntensity={0.25} roughness={0.2} metalness={0.4} />
                </mesh>
              ))}
            </group>
          ) : (
            <group>
              <mesh
                position={[s * d.W * 0.32, d.hoodY - 0.06, zF - 0.02]}
                rotation={[0, 0, d.dna.lights === 'boomerang' ? -s * 0.18 : 0]}
                onClick={() => emit('headlight')}
                onPointerOver={() => hover(true)}
                onPointerOut={() => hover(false)}
              >
                <boxGeometry args={[0.3, d.dna.lights === 'blade' ? 0.045 : 0.07, 0.08]} />
                <meshStandardMaterial ref={s === 1 ? headlightMat : undefined} color="#dfe6ee" emissive="#cfe4ff" emissiveIntensity={0.25} roughness={0.2} metalness={0.4} />
              </mesh>
              {d.dna.lights === 'angel-eye' &&
                [-0.07, 0.07].map((oy) => (
                  <mesh key={oy} position={[s * d.W * 0.32, d.hoodY - 0.06 + oy, zF + 0.026]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.036, 0.009, 8, 20]} />
                    <meshStandardMaterial color="#e8f2ff" emissive="#cfe4ff" emissiveIntensity={lightsOn ? 2 : 0.4} roughness={0.3} />
                  </mesh>
                ))}
              {d.dna.lights === 'y-shape' && (
                <mesh position={[s * d.W * 0.32, d.hoodY - 0.125, zF + 0.02]} rotation={[0, 0, s * 0.5]}>
                  <boxGeometry args={[0.16, 0.02, 0.03]} />
                  <meshStandardMaterial color="#dff0ff" emissive="#9cd0ff" emissiveIntensity={lightsOn ? 1.8 : 0.4} roughness={0.3} />
                </mesh>
              )}
              {d.dna.lights === 'starlight' &&
                [-0.08, -0.04, 0, 0.04, 0.08].map((oz) => (
                  <mesh key={oz} position={[s * d.W * 0.32, d.hoodY - 0.115, zF + 0.02]}>
                    <boxGeometry args={[0.018, 0.018, 0.015]} />
                    <meshStandardMaterial color="#ffffff" emissive="#dceaff" emissiveIntensity={lightsOn ? 1.6 : 0.35} />
                  </mesh>
                ))}
            </group>
          )}
        </group>
      ))}

      {/* taillights */}
      {d.dna.lights === 'round' && d.body !== 'suv' ? (
        <group position={[0, d.bootY - 0.08, zR + 0.012]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * d.W * 0.3, 0, 0]}>
              <boxGeometry args={[0.16, 0.075, 0.04]} />
              <meshStandardMaterial color="#3a0d10" emissive="#ff2a30" emissiveIntensity={lightsOn ? 2.2 : 0.5} roughness={0.3} />
            </mesh>
          ))}
        </group>
      ) : (
        <mesh position={[0, d.bootY - 0.06, zR + 0.015]}>
          <boxGeometry args={[d.W * 0.78, 0.055, 0.05]} />
          <meshStandardMaterial color="#3a0d10" emissive="#ff2a30" emissiveIntensity={lightsOn ? 2.4 : 0.5} roughness={0.3} />
        </mesh>
      )}

      {/* spoiler — DNA-styled */}
      {(() => {
        const kind = d.dna.spoiler !== 'none' ? d.dna.spoiler : d.body === 'sports' || d.body === 'hyper' || d.body === 'gt' ? 'lip' : null;
        if (!kind || ghost) return null;
        const tailY = d.bootY + 0.02;
        const tailZ = zR + 0.1;
        if (kind === 'lip')
          return (
            <mesh position={[0, tailY + 0.03, tailZ]} rotation={[-0.12, 0, 0]} castShadow>
              <boxGeometry args={[d.W * 0.82, 0.028, 0.16]} />
              <meshPhysicalMaterial {...paintMat} />
            </mesh>
          );
        if (kind === 'ducktail')
          return (
            <mesh position={[0, tailY + 0.05, tailZ - 0.02]} rotation={[-0.22, 0, 0]} castShadow>
              <boxGeometry args={[d.W * 0.8, 0.03, 0.18]} />
              <meshPhysicalMaterial {...paintMat} />
            </mesh>
          );
        if (kind === 'wing' || kind === 'swan-neck')
          return (
            <group position={[0, 0, tailZ - 0.05]}>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * d.W * 0.3, tailY + 0.12, 0]}>
                  <boxGeometry args={[0.035, 0.2, 0.05]} />
                  <meshStandardMaterial color="#111318" roughness={0.5} metalness={0.4} />
                </mesh>
              ))}
              <mesh position={[0, tailY + 0.23, 0]} rotation={[-0.16, 0, 0]} castShadow>
                <boxGeometry args={[d.W * 0.86, 0.03, 0.22]} />
                <meshPhysicalMaterial color="#0e1013" metalness={0.55} roughness={0.3} clearcoat={0.7} envMapIntensity={1.1} />
              </mesh>
            </group>
          );
        return (
          <mesh position={[0, tailY + 0.025, tailZ + 0.02]} rotation={[-0.1, 0, 0]} castShadow>
            <boxGeometry args={[d.W * 0.78, 0.024, 0.14]} />
            <meshPhysicalMaterial {...paintMat} />
          </mesh>
        );
      })()}

      {/* doors (animated) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * (d.W / 2 - 0.005), d.hoodY - 0.32, 0.12]} ref={s === -1 ? doorPivotL : doorPivotR}>
          <mesh
            position={[s * 0.015, 0, 0]}
            onClick={() => emit('door')}
            onPointerOver={() => hover(true)}
            onPointerOut={() => hover(false)}
          >
            <boxGeometry args={[0.035, 0.46, d.L * 0.34]} />
            <meshPhysicalMaterial {...paintMat} />
          </mesh>
        </group>
      ))}

      {/* hood/boot lids removed — the silhouette hull provides those surfaces.
          Hood/boot/door clicks remain as feature hotspots with labels. */}

      {/* wheels */}
      {([
        [-d.W / 2 - 0.02, d.wF],
        [d.W / 2 + 0.02, d.wF],
        [-d.W / 2 - 0.02, d.wR],
        [d.W / 2 + 0.02, d.wR],
      ] as [number, number][]).map(([x, z], i) => (
        <Wheel key={i} x={x} z={z} radius={d.wheelR} accent={accent} style={wheelStyle ?? d.dna.wheelStyle} clickable={clickable} onClick={() => emit('wheel')} />
      ))}

      {/* mirrors */}
      {!ghost &&
        [-1, 1].map((s) => (
          <group key={`mir${s}`} position={[s * (d.W / 2 + 0.02), d.spec.belt - 0.06, d.L * 0.13]}>
            <mesh rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.012, 0.012, 0.09, 8]} />
              <meshStandardMaterial color="#14161a" roughness={0.5} metalness={0.4} />
            </mesh>
            {d.dna.mirrors === 'cameras' ? (
              <mesh position={[s * 0.07, 0.01, 0]}>
                <boxGeometry args={[0.05, 0.045, 0.05]} />
                <meshStandardMaterial color="#0e1013" roughness={0.4} metalness={0.5} />
              </mesh>
            ) : (
              <mesh position={[s * 0.075, 0.015, 0]} castShadow>
                <boxGeometry args={[0.09, 0.08, 0.055]} />
                <meshPhysicalMaterial {...paintMat} />
              </mesh>
            )}
          </group>
        ))}

      {/* exhausts */}
      {!ghost && d.dna.exhaust !== 'none' && d.dna.exhaust !== 'hidden' && (
        <group position={[0, d.spec.bottomY + 0.04, zR - 0.03]}>
          {(d.dna.exhaust === 'quad'
            ? [-0.36, -0.25, 0.25, 0.36]
            : d.dna.exhaust === 'quad-center'
              ? [-0.07, 0.07]
              : [-0.32, 0.32]
          ).map((ox) => (
            <mesh key={ox} position={[ox * d.W, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.042, 0.046, 0.07, 14]} />
              <meshStandardMaterial color="#2a2d33" metalness={0.9} roughness={0.3} envMapIntensity={1.3} />
            </mesh>
          ))}
        </group>
      )}

      {/* interior kit */}
      {!ghost && (
        <group>
          <mesh position={[0, d.hoodY - 0.18, d.L * 0.12]}>
            <boxGeometry args={[d.W * 0.74, 0.2, 0.38]} />
            <meshStandardMaterial color="#17191e" roughness={0.7} />
          </mesh>
          <mesh position={[0, d.hoodY - 0.02, d.L * 0.08]} rotation={[-0.28, 0, 0]}>
            <planeGeometry args={[0.46, 0.18]} />
            <meshStandardMaterial color="#0b1220" emissive="#3f74a8" emissiveIntensity={lightsOn ? 1.4 : 0.55} />
          </mesh>
          <mesh position={[-d.W * 0.2, d.hoodY - 0.06, d.L * 0.06]} rotation={[1.15, 0, 0]}>
            <torusGeometry args={[0.16, 0.022, 10, 28]} />
            <meshStandardMaterial color="#22252b" roughness={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * d.W * 0.2, 0.52, -d.L * 0.04]}>
              <mesh>
                <boxGeometry args={[0.42, 0.12, 0.46]} />
                <meshStandardMaterial color="#2a2226" roughness={0.85} />
              </mesh>
              <mesh position={[0, 0.3, -0.2]} rotation={[0.16, 0, 0]}>
                <boxGeometry args={[0.42, 0.52, 0.1]} />
                <meshStandardMaterial color="#2a2226" roughness={0.85} />
              </mesh>
            </group>
          ))}
        </group>
      )}

      <pointLight ref={underglow} position={[0, 0.08, 0]} color={accent} intensity={0.3} distance={4.4} />
    </group>
  );
}
