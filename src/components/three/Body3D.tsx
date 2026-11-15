// Stylised, procedurally built 3D muscle figure. No external model files: every
// muscle group is a primitive, so it's licence-free, tiny, and runs on any GPU.
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';
import type { MuscleGroup } from '@/domain/types';
import { color } from '@/theme/tokens';

type V3 = [number, number, number];
interface Part { m: MuscleGroup; shape: 'sphere' | 'capsule'; pos: V3; scale: V3; rot?: V3; mirror?: boolean }

// Positions in metres on a ~1.75 m figure facing +z.
const MUSCLES: Part[] = [
  { m: 'chest', shape: 'sphere', pos: [0.08, 1.345, 0.085], scale: [0.095, 0.062, 0.04], rot: [0, 0, -0.12], mirror: true },
  { m: 'shoulders', shape: 'sphere', pos: [0.205, 1.42, 0.005], scale: [0.065, 0.068, 0.068], mirror: true },
  { m: 'rear_delts', shape: 'sphere', pos: [0.195, 1.415, -0.045], scale: [0.052, 0.055, 0.04], mirror: true },
  { m: 'traps', shape: 'sphere', pos: [0.07, 1.47, -0.035], scale: [0.085, 0.035, 0.05], rot: [0, 0, 0.35], mirror: true },
  { m: 'back', shape: 'sphere', pos: [0, 1.35, -0.09], scale: [0.1, 0.075, 0.035] },
  { m: 'lats', shape: 'sphere', pos: [0.11, 1.22, -0.07], scale: [0.06, 0.12, 0.04], rot: [0, 0, 0.2], mirror: true },
  { m: 'biceps', shape: 'capsule', pos: [0.255, 1.25, 0.028], scale: [0.038, 0.07, 0.038], mirror: true },
  { m: 'triceps', shape: 'capsule', pos: [0.255, 1.26, -0.028], scale: [0.04, 0.075, 0.036], mirror: true },
  { m: 'forearms', shape: 'capsule', pos: [0.285, 1.0, 0.005], scale: [0.036, 0.095, 0.036], rot: [0, 0, 0.08], mirror: true },
  { m: 'abs', shape: 'sphere', pos: [0.034, 1.215, 0.095], scale: [0.03, 0.027, 0.016], mirror: true },
  { m: 'abs', shape: 'sphere', pos: [0.034, 1.15, 0.098], scale: [0.03, 0.027, 0.016], mirror: true },
  { m: 'abs', shape: 'sphere', pos: [0.033, 1.085, 0.095], scale: [0.029, 0.027, 0.016], mirror: true },
  { m: 'obliques', shape: 'sphere', pos: [0.1, 1.12, 0.05], scale: [0.032, 0.07, 0.04], rot: [0, 0, -0.12], mirror: true },
  { m: 'glutes', shape: 'sphere', pos: [0.072, 0.92, -0.065], scale: [0.075, 0.075, 0.06], mirror: true },
  { m: 'quads', shape: 'capsule', pos: [0.098, 0.7, 0.035], scale: [0.062, 0.125, 0.056], rot: [0, 0, 0.04], mirror: true },
  { m: 'hamstrings', shape: 'capsule', pos: [0.098, 0.7, -0.032], scale: [0.056, 0.12, 0.05], rot: [0, 0, 0.04], mirror: true },
  { m: 'calves', shape: 'capsule', pos: [0.1, 0.32, -0.028], scale: [0.045, 0.08, 0.046], mirror: true },
];

// Graphite "base" body under the muscles: V-shaped torso, narrower waist.
const BASE: { shape: 'sphere' | 'capsule' | 'box'; pos: V3; scale: V3; rot?: V3; mirror?: boolean }[] = [
  { shape: 'sphere', pos: [0, 1.66, 0.005], scale: [0.088, 0.108, 0.095] },
  { shape: 'capsule', pos: [0, 1.53, 0], scale: [0.048, 0.04, 0.048] },
  { shape: 'capsule', pos: [0, 1.31, 0], scale: [0.165, 0.09, 0.1] },
  { shape: 'capsule', pos: [0, 1.11, 0], scale: [0.125, 0.07, 0.085] },
  { shape: 'sphere', pos: [0, 0.96, 0], scale: [0.14, 0.09, 0.095] },
  { shape: 'capsule', pos: [0.255, 1.26, 0], scale: [0.038, 0.09, 0.038], mirror: true },
  { shape: 'capsule', pos: [0.285, 1.0, 0], scale: [0.032, 0.1, 0.032], rot: [0, 0, 0.08], mirror: true },
  { shape: 'sphere', pos: [0.295, 0.85, 0.005], scale: [0.033, 0.048, 0.024], mirror: true },
  { shape: 'capsule', pos: [0.098, 0.7, 0], scale: [0.066, 0.14, 0.066], rot: [0, 0, 0.04], mirror: true },
  { shape: 'capsule', pos: [0.1, 0.33, 0], scale: [0.043, 0.12, 0.043], mirror: true },
  { shape: 'box', pos: [0.1, 0.05, 0.04], scale: [0.08, 0.05, 0.2], mirror: true },
];

const expand = <T extends { pos: V3; rot?: V3; mirror?: boolean }>(list: T[]) =>
  list.flatMap((p) => (p.mirror ? [p, { ...p, pos: [-p.pos[0], p.pos[1], p.pos[2]] as V3, rot: p.rot ? ([p.rot[0], -p.rot[1], -p.rot[2]] as V3) : undefined }] : [p]));

export type MuscleTone = Partial<Record<MuscleGroup, string>>;

const BASE_MUSCLE = new THREE.Color('#39433C');
const SELECT = new THREE.Color('#FFFFFF');

function Muscle({ part, tone, selected }: { part: Part; tone?: string; selected: boolean }) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const target = useMemo(() => (tone ? new THREE.Color(tone) : BASE_MUSCLE), [tone]);
  useFrame((state, dt) => {
    const m = mat.current;
    if (!m) return;
    const k = Math.min(1, dt * 6);
    m.color.lerp(selected ? SELECT : target, k);
    const pulse = selected ? 0.55 + Math.sin(state.clock.elapsedTime * 5) * 0.25 : tone ? 0.28 : 0;
    m.emissive.lerp(selected ? SELECT : target, k);
    m.emissiveIntensity += (pulse - m.emissiveIntensity) * k;
  });
  return (
    <mesh position={part.pos} scale={part.scale} rotation={part.rot ?? [0, 0, 0]} userData={{ muscle: part.m }}>
      {part.shape === 'sphere' ? <sphereGeometry args={[1, 24, 18]} /> : <capsuleGeometry args={[1, 1.4, 8, 16]} />}
      <meshStandardMaterial ref={mat} color={BASE_MUSCLE} roughness={0.42} metalness={0.15} emissive={BASE_MUSCLE} emissiveIntensity={0} />
    </mesh>
  );
}

function Figure({ tone, selected, rotation, animate }: {
  tone: MuscleTone; selected: MuscleGroup | null; rotation: MutableRefObject<{ target: number; dragging: boolean }>; animate: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const muscles = useMemo(() => expand(MUSCLES), []);
  const base = useMemo(() => expand(BASE), []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const r = rotation.current;
    // Gentle idle sway around the chosen facing, so the figure stays readable.
    const sway = animate && !r.dragging ? Math.sin(state.clock.elapsedTime * 0.6) * 0.38 : 0;
    g.rotation.y += (r.target + sway - g.rotation.y) * Math.min(1, dt * 6);
    if (animate) g.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.012;
    if (ring.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 2) * (animate ? 0.04 : 0);
      ring.current.scale.set(s, s, s);
    }
  });
  return (
    <>
      <group ref={group}>
        {base.map((b, i) => (
          <mesh key={`b${i}`} position={b.pos} scale={b.scale} rotation={b.rot ?? [0, 0, 0]}>
            {b.shape === 'sphere' ? <sphereGeometry args={[1, 24, 18]} /> : b.shape === 'box' ? <boxGeometry args={[1, 1, 1]} /> : <capsuleGeometry args={[1, 1.4, 8, 16]} />}
            <meshStandardMaterial color="#1A201C" roughness={0.55} metalness={0.35} />
          </mesh>
        ))}
        {muscles.map((p, i) => <Muscle key={`m${i}`} part={p} tone={tone[p.m]} selected={selected === p.m} />)}
      </group>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[0.42, 0.46, 64]} />
        <meshBasicMaterial color={color.lime} transparent opacity={0.55} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}>
        <circleGeometry args={[0.42, 64]} />
        <meshBasicMaterial color={color.lime} transparent opacity={0.06} />
      </mesh>
    </>
  );
}

/** Exposes a ray-pick function so taps can be handled by the gesture system on every platform. */
function Picker({ pickRef }: { pickRef: MutableRefObject<((x: number, y: number) => MuscleGroup | null) | null> }) {
  const { camera, scene, size } = useThree();
  useEffect(() => {
    const ray = new THREE.Raycaster();
    pickRef.current = (x, y) => {
      ray.setFromCamera(new THREE.Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => h.object.userData?.muscle);
      return (hit?.object.userData.muscle as MuscleGroup) ?? null;
    };
  }, [camera, scene, size, pickRef]);
  return null;
}

export function Body3D({ tone, selected, onSelect, height = 360, view }: {
  tone: MuscleTone; selected: MuscleGroup | null; onSelect: (m: MuscleGroup | null) => void; height?: number; view: 'front' | 'back';
}) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  const rotation = useRef({ target: 0, dragging: false });
  const pick = useRef<((x: number, y: number) => MuscleGroup | null) | null>(null);
  const start = useRef(0);

  // Snap to the nearest front or back facing when the toggle changes.
  useEffect(() => {
    const r = rotation.current;
    const base = view === 'front' ? 0 : Math.PI;
    const turns = Math.round((r.target - base) / (Math.PI * 2));
    r.target = base + turns * Math.PI * 2;
  }, [view]);

  const pan = Gesture.Pan()
    .minDistance(6)
    .runOnJS(true)
    .onStart(() => { rotation.current.dragging = true; start.current = rotation.current.target; })
    .onUpdate((e) => { rotation.current.target = start.current + e.translationX * 0.012; })
    .onEnd(() => { rotation.current.dragging = false; });
  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => { const m = pick.current?.(e.x, e.y) ?? null; onSelect(m === selected ? null : m); });

  return (
    <GestureDetector gesture={Gesture.Exclusive(pan, tap)}>
      <View style={[styles.wrap, { height }]} accessibilityLabel="3D muscle model. Drag to rotate, tap a muscle to select it.">
        <Canvas
          frameloop={focused ? 'always' : 'never'}
          camera={{ position: [0, 1.0, 3.9], fov: 30 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.92, 0)}
          gl={{ antialias: true }}
          style={{ flex: 1 }}
        >
          <ambientLight intensity={0.55} />
          <directionalLight position={[2, 3, 3]} intensity={1.8} />
          <directionalLight position={[-2.5, 2, -3]} intensity={1.6} color={color.lime} />
          <pointLight position={[0, 0.6, 1.6]} intensity={3} distance={4} color={color.water} />
          <Figure tone={tone} selected={selected} rotation={rotation} animate={!reduce} />
          <Picker pickRef={pick} />
        </Canvas>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({ wrap: { width: '100%', overflow: 'hidden' } });
