"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * My Goals "Score goal" star in 3D: a glassy star with a smiling face that fills with gold from the bottom up to the
 * student's average against the goal (`fill`, 0..1), the liquid's surface rocking gently while the star sways. The
 * fill rises from empty once when it appears. Same star outline as the 2D StarJar (100 x 100 box). Loaded with
 * next/dynamic by K5PerformanceGoals only when 3D is allowed; the numbers stay in the HTML next to it.
 */
const S = 0.03; // SVG units -> scene units
const P = (x, y) => [(x - 50) * S, (50 - y) * S];
const POINTS = [
  [50.0, 7.0],
  [61.8, 36.8],
  [93.7, 38.8],
  [69.0, 59.2],
  [77.0, 90.2],
  [50.0, 73.0],
  [23.0, 90.2],
  [31.0, 59.2],
  [6.3, 38.8],
  [38.2, 36.8],
];
const TOP = P(0, 7)[1];
const BOTTOM = P(0, 90.2)[1];
const RISE_S = 1.2;
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

function starShape(scale = 1) {
  const s = new THREE.Shape();
  POINTS.forEach(([x, y], i) => {
    const [px, py] = P(x, y);
    if (i === 0) s.moveTo(px * scale, py * scale);
    else s.lineTo(px * scale, py * scale);
  });
  s.closePath();
  return s;
}

function Jar({ fill }) {
  const group = useRef(null);
  const liquidMaterial = useRef(null); // its clipping plane is moved every frame through this ref
  const age = useRef(null);
  const shell = useMemo(() => new THREE.ExtrudeGeometry(starShape(1), { depth: 0.5, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3 }), []);
  const liquid = useMemo(() => new THREE.ExtrudeGeometry(starShape(0.86), { depth: 0.42, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2 }), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(shell, 25), [shell]);
  // The liquid is cut by a plane: everything above it is clipped away. Created once; moved through liquidMaterial.
  const clipping = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), BOTTOM)], []);
  const target = Math.max(0, Math.min(1, Number(fill) || 0));

  useFrame(({ clock }) => {
    if (age.current === null) age.current = clock.elapsedTime;
    const t = clock.elapsedTime - age.current;
    const g = group.current;
    if (g) {
      g.rotation.y = Math.sin(t * 0.9) * 0.28;
      g.rotation.z = Math.sin(t * 0.6) * 0.04;
    }
    const level = BOTTOM + (TOP - BOTTOM) * 0.86 * target * easeOut(Math.min(1, t / RISE_S));
    // keep the plane in the star's frame (it sways), with a small rocking tilt for a liquid surface
    const tilt = Math.sin(t * 2.2) * 0.12;
    const normal = new THREE.Vector3(Math.sin(tilt), -Math.cos(tilt), 0);
    if (g) normal.applyQuaternion(g.quaternion);
    const origin = new THREE.Vector3(0, level, 0);
    if (g) origin.applyQuaternion(g.quaternion);
    const plane = liquidMaterial.current?.clippingPlanes?.[0];
    if (plane) {
      plane.normal.copy(normal);
      plane.constant = -plane.normal.dot(origin);
    }
  });

  return (
    <group ref={group} position={[0, 0.05, 0]}>
      {/* gold inside, cut at the level */}
      <mesh geometry={liquid} position={[0, 0, -0.21]}>
        <meshStandardMaterial ref={liquidMaterial} color="#FFC531" emissive="#C9930A" emissiveIntensity={0.25} roughness={0.35} metalness={0.2} clippingPlanes={clipping} />
      </mesh>
      {/* the glass star */}
      <mesh geometry={shell} position={[0, 0, -0.25]}>
        <meshStandardMaterial color="#FFF6D6" transparent opacity={0.38} roughness={0.15} metalness={0.05} depthWrite={false} />
      </mesh>
      <lineSegments geometry={edges} position={[0, 0, -0.25]}>
        <lineBasicMaterial color="#2A2F4A" />
      </lineSegments>
      {/* the smiling face (2D eyes at 43,56 and 57,56) */}
      {[43, 57].map((x) => (
        <group key={x} position={[P(x, 0)[0], P(0, 56)[1], 0.36]}>
          <mesh>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshStandardMaterial color="#2A2F4A" roughness={0.4} />
          </mesh>
          <mesh position={[0.035, 0.04, 0.09]}>
            <sphereGeometry args={[0.035, 8, 8]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function StarJar3D({ fill }) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 4.6], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power", localClippingEnabled: true }}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 4]} intensity={1.5} />
      <pointLight position={[-2, 1, 3]} intensity={4} color="#FFF4C2" />
      <Jar fill={fill} />
    </Canvas>
  );
}
