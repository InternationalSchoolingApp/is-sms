"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/*
 * The weather tile's moving sky in 3D, behind the temperature text: a sun or a moon, clouds drifting by, and rain, snow,
 * fog or a storm when that is the weather. Only simple shapes (spheres, thin sticks, points), no image or model files.
 * Loaded with next/dynamic by K5WeatherTile only when 3D is allowed (components/three/use3D.js).
 *
 * kind: "sun" | "partly" | "cloud" | "fog" | "rain" | "snow" | "storm"; night: true after sunset.
 * The view is about 6 units wide and 2.6 high (the tile is wide and short); x grows to the right, y up.
 */
const W = 6.4;
const H = 2.8;

function Sun() {
  const rays = useRef(null);
  useFrame((_, dt) => {
    if (rays.current) rays.current.rotation.z -= dt * 0.35;
  });
  const rayAngles = useMemo(() => Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2), []);
  return (
    <group position={[2.55, 0.95, -0.5]}>
      <mesh>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshStandardMaterial color="#FFD54F" emissive="#FFB300" emissiveIntensity={0.9} roughness={0.6} />
      </mesh>
      <mesh scale={1.55}>
        <sphereGeometry args={[0.55, 24, 24]} />
        <meshBasicMaterial color="#FFE58A" transparent opacity={0.28} depthWrite={false} />
      </mesh>
      <group ref={rays}>
        {rayAngles.map((a) => (
          <mesh key={a} position={[Math.cos(a) * 0.82, Math.sin(a) * 0.82, 0]} rotation={[0, 0, a - Math.PI / 2]}>
            <coneGeometry args={[0.07, 0.26, 8]} />
            <meshStandardMaterial color="#FFC531" emissive="#FFB300" emissiveIntensity={0.6} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function Moon() {
  const group = useRef(null);
  useFrame(({ clock }) => {
    if (group.current) group.current.position.y = 0.9 + Math.sin(clock.elapsedTime * 0.8) * 0.04;
  });
  return (
    <group ref={group} position={[2.55, 0.9, -0.5]}>
      {/* lit from one side by the scene's light, so it reads as a crescent */}
      <mesh>
        <sphereGeometry args={[0.45, 32, 32]} />
        <meshStandardMaterial color="#FFF6D6" emissive="#4A4A6A" emissiveIntensity={0.25} roughness={0.9} />
      </mesh>
      <mesh scale={1.6}>
        <sphereGeometry args={[0.45, 24, 24]} />
        <meshBasicMaterial color="#C9D6FF" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Stars() {
  const material = useRef(null);
  const geometry = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 40; i += 1) {
      // fixed spread (same every time): a small hash instead of Math.random
      const a = Math.sin(i * 12.9898) * 43758.5453;
      const b = Math.sin(i * 78.233) * 12345.6789;
      pts.push(new THREE.Vector3((a - Math.floor(a) - 0.5) * W, (b - Math.floor(b) - 0.5) * H, -1));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, []);
  useFrame(({ clock }) => {
    if (material.current) material.current.opacity = 0.6 + Math.sin(clock.elapsedTime * 2.2) * 0.3;
  });
  return (
    <points geometry={geometry}>
      <pointsMaterial ref={material} color="#FFFFFF" size={0.06} sizeAttenuation transparent opacity={0.8} />
    </points>
  );
}

/** One puffy cloud from a few spheres. */
function Cloud({ x, y, scale, speed, dark }) {
  const group = useRef(null);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    g.position.x += dt * speed;
    if (g.position.x > W / 2 + 1.2) g.position.x = -W / 2 - 1.2;
  });
  const color = dark ? "#8C96B8" : "#FFFFFF";
  const puffs = [
    [0, 0, 0.42],
    [-0.42, -0.08, 0.3],
    [0.42, -0.06, 0.32],
    [0.18, 0.22, 0.3],
    [-0.2, 0.16, 0.26],
  ];
  return (
    <group ref={group} position={[x, y, 0]} scale={scale}>
      {puffs.map(([px, py, r]) => (
        <mesh key={px + "," + py} position={[px, py, 0]}>
          <sphereGeometry args={[r, 20, 20]} />
          <meshStandardMaterial color={color} roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/** Falling rain (thin sticks) or snow (small balls), wrapping from the bottom back to the top. */
function Fall({ snow, count }) {
  const mesh = useRef(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const drops = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = Math.sin(i * 91.7) * 1000;
        const b = Math.sin(i * 47.3) * 1000;
        return { x: (a - Math.floor(a) - 0.5) * W, y: (b - Math.floor(b)) * H - H / 2, v: snow ? 0.5 + (i % 5) * 0.08 : 2.6 + (i % 4) * 0.4, p: i };
      }),
    [count, snow],
  );
  useFrame(({ clock }, dt) => {
    const m = mesh.current;
    if (!m) return;
    drops.forEach((d, i) => {
      d.y -= d.v * dt;
      if (d.y < -H / 2 - 0.2) d.y = H / 2 + 0.2;
      const sway = snow ? Math.sin(clock.elapsedTime * 1.5 + d.p) * 0.15 : 0;
      dummy.position.set(d.x + sway, d.y, 0.3);
      dummy.rotation.set(0, 0, snow ? 0 : 0.18);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[null, null, count]}>
      {snow ? <sphereGeometry args={[0.05, 8, 8]} /> : <cylinderGeometry args={[0.012, 0.012, 0.22, 4]} />}
      <meshBasicMaterial color={snow ? "#FFFFFF" : "#5AA9FF"} transparent opacity={snow ? 0.95 : 0.8} />
    </instancedMesh>
  );
}

/** Soft fog bands drifting sideways. */
function Fog() {
  const bands = useRef([]);
  useFrame(({ clock }) => {
    bands.current.forEach((b, i) => {
      if (b) b.position.x = Math.sin(clock.elapsedTime * 0.3 + i * 2) * 0.8;
    });
  });
  return [-0.6, 0.1, 0.8].map((y, i) => (
    <mesh key={y} ref={(el) => (bands.current[i] = el)} position={[0, y, 0.5]}>
      <planeGeometry args={[W * 1.4, 0.55]} />
      <meshBasicMaterial color="#FFFFFF" transparent opacity={0.28} depthWrite={false} />
    </mesh>
  ));
}

/** A storm: now and then the whole sky flashes. */
function Lightning() {
  const light = useRef(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime % 3.2;
    if (light.current) light.current.intensity = t < 0.08 || (t > 0.16 && t < 0.22) ? 6 : 0;
  });
  return <pointLight ref={light} position={[0, 1, 2]} color="#E8F0FF" intensity={0} />;
}

function Sky({ kind, night }) {
  const clouds =
    kind === "sun"
      ? []
      : kind === "partly"
        ? [
            [-1.6, 0.35, 0.8, 0.18],
            [0.9, -0.55, 0.65, 0.12],
          ]
        : [
            [-2.2, 0.55, 0.9, 0.16],
            [0.2, 0.75, 0.75, 0.11],
            [2.0, 0.3, 0.85, 0.14],
          ];
  const dark = kind === "storm" || kind === "rain" || night;
  return (
    <>
      <ambientLight intensity={night ? 0.45 : 0.9} />
      <directionalLight position={night ? [-3, 1, 2] : [2, 3, 4]} intensity={night ? 1.1 : 1.4} />
      {night && <Stars />}
      {(kind === "sun" || kind === "partly") && (night ? <Moon /> : <Sun />)}
      {(kind === "cloud" || kind === "fog") && night && <Moon />}
      {clouds.map(([x, y, s, v]) => (
        <Cloud key={x} x={x} y={y} scale={s} speed={v} dark={dark && kind !== "partly"} />
      ))}
      {(kind === "rain" || kind === "storm") && <Fall snow={false} count={36} />}
      {kind === "snow" && <Fall snow count={30} />}
      {kind === "fog" && <Fog />}
      {kind === "storm" && <Lightning />}
    </>
  );
}

/** Keeps the W x H sky covering the tile at every size (the tile changes width with the screen). */
function FitCamera() {
  useFrame(({ camera, size }) => {
    const zoom = Math.max(size.width / W, size.height / H);
    if (camera.zoom !== zoom) {
      camera.zoom = zoom;
      camera.updateProjectionMatrix();
    }
  });
  return null;
}

export default function WeatherScene3D({ kind, night }) {
  return (
    <Canvas
      aria-hidden="true"
      dpr={[1, 1.5]}
      orthographic
      camera={{ position: [0, 0, 10], zoom: 1 }}
      resize={{ debounce: 100 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      className="pointer-events-none"
    >
      <FitCamera />
      <Sky kind={kind} night={night} />
    </Canvas>
  );
}
