// Three concentric 3D progress rings (calories, protein, water) that float and
// tilt toward the viewer. Arcs grow in on mount and when values change.
import { Canvas, useFrame } from '@react-three/fiber';
import { useIsFocused } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import * as THREE from 'three';

export interface RingSpec { progress: number; color: string }

const STEPS = 120; // arc resolution for re-building geometry while animating

function Arc({ radius, tube, spec, delay, animate }: { radius: number; tube: number; spec: RingSpec; delay: number; animate: boolean }) {
  const shown = useRef(animate ? 0 : Math.min(1, spec.progress));
  const t0 = useRef<number | null>(null);
  const [step, setStep] = useState(Math.round(shown.current * STEPS));
  const cap = useRef<THREE.Mesh>(null);
  const target = Math.min(1, Math.max(0, spec.progress));
  useFrame((state, dt) => {
    if (t0.current === null) t0.current = state.clock.elapsedTime;
    if (state.clock.elapsedTime - t0.current < delay) return;
    shown.current += (target - shown.current) * Math.min(1, dt * 3.2);
    const s = Math.round(shown.current * STEPS);
    if (s !== step) setStep(s);
    if (cap.current) {
      const a = (s / STEPS) * Math.PI * 2;
      cap.current.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      cap.current.visible = s > 0;
    }
  });
  const arc = Math.max(0.0001, (step / STEPS) * Math.PI * 2);
  const c = useMemo(() => new THREE.Color(spec.color), [spec.color]);
  return (
    // Start at 12 o'clock and run clockwise.
    <group rotation={[0, 0, Math.PI / 2]} scale={[1, -1, 1]}>
      <mesh>
        <torusGeometry args={[radius, tube * 0.55, 12, 96]} />
        <meshStandardMaterial color={c} transparent opacity={0.13} roughness={0.6} />
      </mesh>
      <mesh>
        <torusGeometry args={[radius, tube, 18, 160, arc]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.55} roughness={0.25} metalness={0.35} />
      </mesh>
      <mesh position={[radius, 0, 0]}>
        <sphereGeometry args={[tube, 18, 12]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={0.55} roughness={0.25} metalness={0.35} />
      </mesh>
      <mesh ref={cap}>
        <sphereGeometry args={[tube * 1.02, 18, 12]} />
        <meshStandardMaterial color="#ffffff" emissive={c} emissiveIntensity={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

function Sparks({ animate, tint }: { animate: boolean; tint: string }) {
  const ref = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const a = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i++) {
      const r = 0.4 + Math.random() * 1.1, th = Math.random() * Math.PI * 2;
      a[i * 3] = Math.cos(th) * r; a[i * 3 + 1] = Math.sin(th) * r; a[i * 3 + 2] = (Math.random() - 0.5) * 0.8;
    }
    return a;
  }, []);
  useFrame((_, dt) => { if (animate && ref.current) ref.current.rotation.z += dt * 0.08; });
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color={tint} size={0.025} transparent opacity={0.7} sizeAttenuation />
    </points>
  );
}

function Stack({ rings, animate }: { rings: RingSpec[]; animate: boolean }) {
  const g = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (!g.current || !animate) return;
    const t = state.clock.elapsedTime;
    g.current.rotation.x = -0.32 + Math.sin(t * 0.6) * 0.06;
    g.current.rotation.y = Math.sin(t * 0.4) * 0.18;
    g.current.position.y = Math.sin(t * 0.9) * 0.04;
  });
  const radii = [1.06, 0.86, 0.66];
  return (
    <group ref={g} rotation={[-0.32, 0, 0]}>
      {rings.slice(0, 3).map((r, i) => <Arc key={i} radius={radii[i]} tube={0.068} spec={r} delay={0.15 * i} animate={animate} />)}
      <Sparks animate={animate} tint={rings[0]?.color ?? '#C8FF50'} />
    </group>
  );
}

export function Rings3D({ rings, height = 260 }: { rings: RingSpec[]; height?: number }) {
  const reduce = useReducedMotion();
  const focused = useIsFocused();
  return (
    <View style={{ height, width: '100%' }} pointerEvents="none">
      <Canvas frameloop={focused ? 'always' : 'never'} camera={{ position: [0, 0, 3.5], fov: 42 }} gl={{ antialias: true }} style={{ flex: 1 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[1.5, 2, 3]} intensity={2} />
        <pointLight position={[-2, -1, 2]} intensity={4} distance={6} color="#3FA9FF" />
        <Stack rings={rings} animate={!reduce} />
      </Canvas>
    </View>
  );
}
