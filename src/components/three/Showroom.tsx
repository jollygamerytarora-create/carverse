'use client';

import { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Grid, Sparkles, MeshReflectorMaterial, PerformanceMonitor } from '@react-three/drei';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { HotspotInfo, InteriorSet } from './CarModel';
import HeroCar, { AssetPending } from './HeroCar';
import { Vehicle } from '@/lib/types';
import { engineSynth } from '@/lib/engineAudio';
import { prefersReducedMotion } from '@/lib/utils';
import { vehicleAssetFor } from '@/lib/assetRegistry';

export interface CarConfig {
  vehicle: Vehicle;
  paint?: string;
  accent?: string;
  ghost?: boolean;
  offset?: [number, number, number];
  rotY?: number;
  enterFrom?: number; // x offset on mount
  exitTo?: number; // x offset to damp toward before unmount
  lightsOn?: boolean;
  hotspots?: boolean;
  useGltf?: boolean; // legacy flag, kept for compatibility
  wheelStyle?: string; // configurator override
}

export interface ShowroomProps {
  cars: CarConfig[];
  envAccent?: string;
  autoRotate?: boolean;
  interior?: boolean;
  preset?: 'front' | 'side' | 'rear' | 'top' | null;
  focus?: HotspotInfo | null;
  dim?: boolean;
  quality?: 'high' | 'low';
  zoom?: boolean;
  framing?: 'brand' | 'car';
  dist?: number;
  interiorView?: 'cockpit' | 'dash' | 'driver' | 'rear' | null;
  onHotspot?: (info: HotspotInfo | null) => void;
}

/* ---------------- camera rig ---------------- */

interface RigProps {
  interior: boolean;
  preset: ShowroomProps['preset'];
  focus: HotspotInfo | null;
  autoRotate: boolean;
  hasCars: boolean;
  interiorView?: 'cockpit' | 'dash' | 'driver' | 'rear' | null;
}

function CameraRig({ interior, preset, focus, autoRotate, hasCars, interiorView, zoom = true, framing = 'car', dist: distProp }: RigProps & { zoom?: boolean; framing?: 'brand' | 'car'; dist?: number }) {
  const { camera, gl } = useThree();
  const init = { theta: 0.6, phi: 1.32, dist: distProp ?? (framing === 'brand' ? 11.5 : 9), ty: framing === 'brand' ? 1.75 : 0.9 };
  const state = useRef({ theta: init.theta, phi: init.phi, dist: init.dist, target: new THREE.Vector3(0, init.ty, 0) });
  const desired = useRef({ theta: init.theta, phi: init.phi, dist: init.dist, target: new THREE.Vector3(0, init.ty, 0) });
  const dragging = useRef(false);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastInteract = useRef(0);
  const auto = useRef(true);

  // preset / focus transitions
  useEffect(() => {
    const d = desired.current;
    if (focus) {
      d.target.set(...focus.target);
      d.dist = 3.2;
      d.theta = focus.pos[0] >= 0 ? 1.25 : -1.25;
      d.phi = 1.45;
      return;
    }
    d.target.set(0, interior ? 1.05 : 0.9, 0);
    switch (preset) {
      case 'front': d.theta = 0; d.phi = 1.42; d.dist = 7; break;
      case 'side': d.theta = Math.PI / 2; d.phi = 1.4; d.dist = 8; break;
      case 'rear': d.theta = Math.PI; d.phi = 1.42; d.dist = 7; break;
      case 'top': d.theta = 0.8; d.phi = 0.5; d.dist = 8; break;
      default: break;
    }
    if (!preset && !focus) {
      d.theta = state.current.theta; // keep current angle
      d.phi = framing === 'brand' ? 1.36 : 1.32;
      d.dist = interior ? 0.001 : (distProp ?? (framing === 'brand' ? 11.5 : 9));
      if (framing === 'brand') d.target.y = 1.75;
    }
    if (interior) {
      /*
       * Real-cabin views (stage space: nose = +z, driver = +x). Tuned on the
       * BMW X5 GLB interior; the normalised footprint keeps them valid for
       * every full-cabin asset.
       */
      switch (interiorView) {
        case 'dash':
          // dashboard + centre stack, camera mid-cabin just behind the front row
          d.dist = 0.9;
          d.theta = -2.72;
          d.phi = 1.4;
          d.target.set(0.1, 1.0, 0.62);
          break;
        case 'driver':
          // seated at the wheel: eyes at the headrest, forward through the glass
          d.dist = 2.2;
          d.theta = 3.11;
          d.phi = 1.52;
          d.target.set(0.25, 1.05, 2.2);
          break;
        case 'rear':
          // seated on the bench: front seatbacks ahead, dash beyond
          d.dist = 1.5;
          d.theta = Math.PI;
          d.phi = 1.47;
          d.target.set(0.1, 1.0, 0.5);
          break;
        default:
          // standing at the open door, looking across into the cockpit
          d.dist = 0.61;
          d.theta = 1.92;
          d.phi = 1.32;
          d.target.set(0, 1.0, 0.55);
      }
      return;
    }
  }, [preset, focus, interior, interiorView]);

  // wheel zoom
  useEffect(() => {
    if (!zoom || interior) return;
    const el = gl.domElement;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      desired.current.dist = THREE.MathUtils.clamp(desired.current.dist + e.deltaY * 0.008, 4.5, 14);
      lastInteract.current = performance.now();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [gl, interior, zoom]);

  // drag orbit
  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      dragging.current = true;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      lastInteract.current = performance.now();
      auto.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastX.current;
      const dy = e.clientY - lastY.current;
      lastX.current = e.clientX;
      lastY.current = e.clientY;
      desired.current.theta -= dx * 0.005;
      desired.current.phi = THREE.MathUtils.clamp(desired.current.phi - dy * 0.004, 0.9, 1.52);
      lastInteract.current = performance.now();
    };
    const up = () => { dragging.current = false; };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [gl, interior]);

  const reduced = useMemo(() => prefersReducedMotion(), []);

  useFrame((_, delta) => {
    const s = state.current;
    const d = desired.current;
    const now = performance.now();

    // resume auto-rotate after inactivity
    if (autoRotate && !auto.current && now - lastInteract.current > 3500) auto.current = true;
    if (autoRotate && auto.current && !dragging.current && !focus && !interior) {
      d.theta += delta * 0.12;
    }

    // rev shake
    const shake = engineSynth.rpm * 0.02;
    const t = performance.now() / 1000;
    const sx = Math.sin(t * 47) * shake;
    const sy = Math.cos(t * 53) * shake;

    const damp = 3.2;
    s.theta = THREE.MathUtils.damp(s.theta, d.theta, damp, delta);
    s.phi = THREE.MathUtils.damp(s.phi, d.phi, damp, delta);
    s.dist = THREE.MathUtils.damp(s.dist, d.dist, interior ? 2.2 : damp, delta);
    s.target.x = THREE.MathUtils.damp(s.target.x, d.target.x, damp, delta);
    s.target.y = THREE.MathUtils.damp(s.target.y, d.target.y, damp, delta);
    s.target.z = THREE.MathUtils.damp(s.target.z, d.target.z, damp, delta);

    const x = s.target.x + s.dist * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.target.y + s.dist * Math.cos(s.phi);
    const z = s.target.z + s.dist * Math.sin(s.phi) * Math.cos(s.theta);
    camera.position.set(x + sx, y + sy, z);
    camera.lookAt(s.target);
  });

  return null;
}

/* ---------------- environment ---------------- */

/** Local PMREM environment (no network fetch) — an automotive softbox
 *  studio: dark room, long overhead strip, side panels, rim + front fill.
 *  Gives paint its classic highlight streak and chrome real reflections (§11). */
function EnvMap() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const studio = new THREE.Scene();
    studio.background = new THREE.Color('#050608');
    const panel = (w: number, h: number, pos: [number, number, number], rot: [number, number], intensity: number, color = '#ffffff') => {
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide })
      );
      m.position.set(...pos);
      m.rotation.set(rot[0], rot[1], 0);
      studio.add(m);
    };
    panel(22, 22, [0, 7, 0], [Math.PI / 2, 0], 0.55);          // broad graded ceiling fill
    panel(15, 3.2, [0, 6, 0], [Math.PI / 2, 0], 3.2);          // overhead main softbox
    panel(9, 2.4, [-7.5, 3.2, 2], [Math.PI / 2, Math.PI / 2.7], 2.0); // left key
    panel(9, 2.4, [7.5, 3.2, -2], [Math.PI / 2, -Math.PI / 2.7], 2.0); // right key
    panel(10, 2.2, [0, 6, -7], [Math.PI / 2, 0], 1.4);          // ceiling rear strip
    panel(10, 2.2, [0, 6, 7], [Math.PI / 2, 0], 1.4);           // ceiling front strip
    panel(13, 1.7, [0, 2.1, -8.5], [0, 0], 1.7);               // rear rim streak
    panel(11, 1.3, [0, 1.5, 8.5], [0, Math.PI], 1.3);          // front fill
    panel(4, 4, [-9, 2, -6], [0, Math.PI / 3], 1.0, '#cfe2ff'); // cool kicker
    const env = pmrem.fromScene(studio, 0.035);
    scene.environment = env.texture;
    return () => {
      env.dispose();
      pmrem.dispose();
      scene.environment = null;
    };
  }, [gl, scene]);
  return null;
}

function Environment({ accent, dim, interiorMode }: { accent: string; dim: boolean; interiorMode: boolean }) {
  const spot = useRef<THREE.SpotLight>(null);
  useFrame((state) => {
    if (spot.current) {
      // sweeping key light for cinematic feel
      const t = state.clock.elapsedTime * 0.2;
      spot.current.position.x = Math.sin(t) * 6;
    }
  });
  const dark = dim ? 0.5 : 1;
  const interiorBoost = dim && interiorMode ? 0.85 : 1;
  return (
    <group>
      <ambientLight intensity={0.28 * dark * interiorBoost} />
      <directionalLight position={[-3, 7, 6]} intensity={dim ? 0.5 : 0.85} color="#f2f5fa" />
      {/** No castShadow: a full extra scene render per frame (plus the sweeping
          key light's shadow swept artifacts) — ContactShadows grounds the car. */}
      <spotLight
        ref={spot}
        position={[4, 8, 5]}
        angle={0.6}
        penumbra={0.95}
        intensity={dim ? 120 : 210}
        color="#eef2f8"
      />
      <pointLight position={[-6, 2.5, -4]} intensity={dim ? 60 : 110} color={accent} distance={20} />
      <pointLight position={[6, 2, -5]} intensity={dim ? 48 : 85} color="#7ab0e0" distance={18} />
      <pointLight position={[0, 1.2, 6]} intensity={dim ? 34 : 55} color="#ffffff" distance={14} />
      <fog attach="fog" args={['#08090c', 16, 34]} />
    </group>
  );
}

function Floor({ quality }: { quality: 'high' | 'low' }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.001, 0]} receiveShadow>
        <planeGeometry args={[70, 70]} />
        <MeshReflectorMaterial
          resolution={quality === 'high' ? 512 : 256}
          blur={[180, 60]}
          mixBlur={1}
          mixStrength={9}
          mirror={0.55}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0a0b0e"
          roughness={0.85}
          metalness={0.45}
        />
      </mesh>
      <Grid
        position={[0, 0.004, 0]}
        args={[60, 60]}
        cellSize={1.2}
        cellThickness={0.55}
        cellColor="#1a1e26"
        sectionSize={6}
        sectionThickness={1}
        sectionColor="#2a3140"
        fadeDistance={26}
        fadeStrength={1.6}
        infiniteGrid
      />
      <ContactShadows position={[0, 0.012, 0]} opacity={0.72} scale={16} blur={2.6} far={4} resolution={quality === 'high' ? 512 : 256} color="#000000" />
    </group>
  );
}

/* ---------------- car wrapper (enter/exit animation) ---------------- */

function CarInstance({ cfg, onHotspot, accent, interior = false }: { cfg: CarConfig; onHotspot?: ShowroomProps['onHotspot']; accent: string; interior?: boolean }) {
  const group = useRef<THREE.Group>(null);
  const enter = useRef(cfg.enterFrom ?? 0);
  const exiting = cfg.exitTo !== undefined;

  useFrame((_, delta) => {
    if (!group.current) return;
    if (exiting) {
      enter.current = THREE.MathUtils.damp(enter.current, cfg.exitTo!, 4.5, delta);
      group.current.position.x = enter.current + (cfg.offset?.[0] ?? 0);
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, (cfg.rotY ?? 0) + cfg.exitTo! * 0.22, 4.5, delta);
    } else {
      enter.current = THREE.MathUtils.damp(enter.current, 0, 4.5, delta);
      group.current.position.x = enter.current + (cfg.offset?.[0] ?? 0);
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, cfg.rotY ?? 0, 4.5, delta);
    }
  });

  // §25: ghost neighbours without their own registered asset simply don't render
  const asset = vehicleAssetFor(cfg.vehicle.id);
  if (cfg.ghost && !asset?.model3D) return null;

  return (
    <group ref={group} position={[cfg.offset?.[0] ?? 0, cfg.offset?.[1] ?? 0, cfg.offset?.[2] ?? 0]}>
      <HeroCar vehicle={cfg.vehicle} paint={cfg.paint ?? '#7a828c'} accent={cfg.accent ?? accent} ghost={cfg.ghost} interior={interior} />
    </group>
  );
}

/* ---------------- main component ---------------- */

export default function Showroom({
  cars,
  envAccent = '#e8b64a',
  autoRotate = true,
  interior = false,
  preset = null,
  focus = null,
  dim = false,
  quality = 'high',
  zoom = true,
  framing = 'car',
  dist,
  interiorView = null,
  onHotspot,
}: ShowroomProps) {
  const [webglOk, setWebglOk] = useState(true);
  const [dprScale, setDprScale] = useState(1);
  const accent = envAccent;

  if (!webglOk) {
    return (
      <div className="webgl-fallback" role="status">
        3D preview unavailable on this device — enjoy the data experience instead.
      </div>
    );
  }

  return (
    <Canvas
      id="bg-canvas-inner"
      shadows={false}
      dpr={[
        (quality === 'high' ? 1 : 0.7) * dprScale,
        (quality === 'high' ? 1.25 : 1.05) * dprScale,
      ]}
      camera={{ position: [6, 3.2, 6], fov: 38, near: 0.1, far: 80 }}
      gl={{ antialias: quality === 'high', alpha: true, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.18;
      }}
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
      aria-label="Interactive 3D vehicle showroom. Drag to rotate, scroll to zoom."
    >
      {/* adaptive resolution: sacrifice pixels before frames under load */}
      <PerformanceMonitor
        onDecline={() => setDprScale((s) => Math.max(0.55, s - 0.15))}
        onIncline={() => setDprScale((s) => Math.min(1, s + 0.05))}
      />
      <EnvMap />
      <Environment accent={accent} dim={dim} interiorMode={interior} />
      <Floor quality={quality} />
      <Sparkles count={quality === 'high' ? 40 : 16} scale={[18, 6, 18]} position={[0, 3, 0]} size={1.6} speed={0.25} opacity={0.35} color="#9fb4cc" />
      {interior ? (
        cars.map((cfg, i) => (
          <CarInstance key={`int-${cfg.vehicle.id}-${i}`} cfg={cfg} onHotspot={onHotspot} accent={accent} interior />
        ))
      ) : (
        cars.map((cfg, i) => (
          <CarInstance key={`${cfg.vehicle.id}-${cfg.exitTo !== undefined ? 'out' : 'in'}-${i}`} cfg={cfg} onHotspot={onHotspot} accent={accent} />
        ))
      )}
      <CameraRig interior={interior} preset={preset} focus={focus} autoRotate={autoRotate} hasCars={cars.length > 0} interiorView={interiorView} zoom={zoom} framing={framing} dist={dist} />
    </Canvas>
  );
}
