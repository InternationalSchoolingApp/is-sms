"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/*
 * The student's buddy (Pico, Penny, Booky, Bolt, Twinkle) in 3D, built only from simple shapes (no model files): a body
 * per buddy, and the shared friendly face, arms and feet of the 2D PicoMascot art (components/k5/pico/PicoMascot.jsx).
 *   animate - sways, bobs, blinks and waves while true (selected / pointed at); settles back to a still pose when false
 *   talking - the mouth opens and closes (a speaking buddy)
 * The canvas only draws while something moves (frameloop "demand"), so a row of buddies costs nothing when still.
 * Loaded with next/dynamic by the places that show the buddy, only when 3D is allowed (components/three/use3D.js).
 * Body colours come from the BUDDIES table (constant/appearance.js) - the same ones the 2D art uses.
 */
const DARK = "#1C2640";

/** A rounded rectangle, extruded: the soft box that Booky and Bolt are made of. */
function roundedBox(width, height, depth, radius, bevel = 0.05) {
  const w = width / 2;
  const h = height / 2;
  const r = radius;
  const s = new THREE.Shape();
  s.moveTo(-w + r, -h);
  s.lineTo(w - r, -h);
  s.quadraticCurveTo(w, -h, w, -h + r);
  s.lineTo(w, h - r);
  s.quadraticCurveTo(w, h, w - r, h);
  s.lineTo(-w + r, h);
  s.quadraticCurveTo(-w, h, -w, h - r);
  s.lineTo(-w, -h + r);
  s.quadraticCurveTo(-w, -h, -w + r, -h);
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 });
  g.translate(0, 0, -depth / 2);
  return g;
}

function starGeometry(outer, inner, depth) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i * Math.PI) / 5 + Math.PI / 2;
    if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.1, bevelSize: 0.1, bevelSegments: 4 });
  g.translate(0, -0.05, -depth / 2);
  return g;
}

function teardropGeometry() {
  const pts = [
    [0, -1.3],
    [0.16, -1.14],
    [0.48, -0.72],
    [0.82, -0.2],
    [0.98, 0.22],
    [0.9, 0.66],
    [0.56, 0.95],
    [0, 1.02],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  return new THREE.LatheGeometry(pts, 48);
}

const mat = (color, extra) => <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} {...extra} />;

/** Per buddy: the body mesh group, and where the face / arms / feet go. fz = how far forward the face sits. */
function useBody(buddy, look) {
  return useMemo(() => {
    const color = look.color;
    switch (buddy) {
      case "penny":
        return {
          fz: 0.5,
          armX: 0.66,
          armY: 0.1,
          bottom: -1.5,
          node: (
            <group>
              <mesh>
                <boxGeometry args={[1.3, 1.6, 1]} />
                {mat("#FFC531")}
              </mesh>
              {[-0.42, 0.42].map((x) => (
                <mesh key={x} position={[x, 0, 0.5]}>
                  <boxGeometry args={[0.05, 1.6, 0.02]} />
                  {mat("#E0A800")}
                </mesh>
              ))}
              <mesh position={[0, 0.9, 0]}>
                <boxGeometry args={[1.3, 0.2, 1]} />
                {mat("#B8C2D6", { metalness: 0.5, roughness: 0.3 })}
              </mesh>
              <mesh position={[0, 1.25, 0]}>
                <boxGeometry args={[1.3, 0.5, 1]} />
                {mat("#FF8FB1")}
              </mesh>
              <mesh position={[0, -1.2, 0]} rotation={[Math.PI, Math.PI / 4, 0]}>
                <coneGeometry args={[0.92, 0.8, 4]} />
                {mat("#F5D7A1")}
              </mesh>
              <mesh position={[0, -1.7, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.2, 0.28, 12]} />
                {mat(DARK)}
              </mesh>
            </group>
          ),
        };
      case "booky":
        return {
          fz: 0.46,
          armX: 0.8,
          armY: 0.05,
          bottom: -1.0,
          node: (
            <group>
              <mesh geometry={roundedBox(1.6, 2.0, 0.8, 0.2)}>{mat(color)}</mesh>
              <mesh position={[-0.7, 0, 0]}>
                <boxGeometry args={[0.24, 1.96, 0.9]} />
                {mat("#4C2A94")}
              </mesh>
              <mesh position={[0.05, -0.86, 0.43]}>
                <boxGeometry args={[1.25, 0.14, 0.12]} />
                {mat("#FFF6DB")}
              </mesh>
              <mesh position={[0.55, 0.8, 0.46]}>
                <boxGeometry args={[0.14, 0.45, 0.05]} />
                {mat("#FF5A7A")}
              </mesh>
            </group>
          ),
        };
      case "bolt":
        return {
          fz: 0.46,
          armX: 0.88,
          armY: 0.0,
          bottom: -1.0,
          node: (
            <group>
              <mesh geometry={roundedBox(1.5, 1.95, 0.8, 0.36)}>{mat(color)}</mesh>
              <mesh position={[0, 1.18, 0]}>
                <cylinderGeometry args={[0.03, 0.03, 0.34, 8]} />
                {mat("#5C6B8A")}
              </mesh>
              <mesh position={[0, 1.4, 0]}>
                <sphereGeometry args={[0.11, 16, 16]} />
                {mat("#FFC531", { emissive: "#FFB300", emissiveIntensity: 0.5 })}
              </mesh>
              {[-0.84, 0.84].map((x) => (
                <mesh key={x} position={[x, 0.1, 0]}>
                  <sphereGeometry args={[0.13, 16, 16]} />
                  {mat("#5C6B8A", { metalness: 0.5 })}
                </mesh>
              ))}
              <mesh position={[0, -0.62, 0.46]}>
                <boxGeometry args={[0.62, 0.24, 0.05]} />
                {mat("#0B5E58")}
              </mesh>
              {[
                [-0.17, "#FFC531"],
                [0, "#FF8FB1"],
                [0.17, "#8CE0FF"],
              ].map(([x, c]) => (
                <mesh key={x} position={[x, -0.62, 0.5]}>
                  <sphereGeometry args={[0.04, 8, 8]} />
                  <meshBasicMaterial color={c} />
                </mesh>
              ))}
            </group>
          ),
        };
      case "twinkle":
        return {
          fz: 0.3,
          armX: 1.05,
          armY: 0.1,
          bottom: -1.05,
          node: (
            <mesh geometry={starGeometry(1.35, 0.62, 0.5)}>{mat(color, { emissive: "#FFB020", emissiveIntensity: 0.2 })}</mesh>
          ),
        };
      default:
        // pico: a teardrop pin with a graduation cap
        return {
          fz: 0.8,
          armX: 0.98,
          armY: 0.12,
          bottom: -1.15,
          node: (
            <group>
              <mesh geometry={teardropGeometry()}>{mat(color)}</mesh>
              <mesh position={[0, 1.02, 0]}>
                <cylinderGeometry args={[0.52, 0.58, 0.28, 24]} />
                {mat(DARK)}
              </mesh>
              <mesh position={[0, 1.2, 0]} rotation={[0.28, Math.PI / 4, 0]}>
                <boxGeometry args={[1.5, 0.08, 1.5]} />
                {mat(DARK)}
              </mesh>
              <mesh position={[0.78, 1.0, 0.05]}>
                <cylinderGeometry args={[0.02, 0.02, 0.5, 6]} />
                {mat("#FFC531")}
              </mesh>
              <mesh position={[0.78, 0.74, 0.05]}>
                <sphereGeometry args={[0.07, 12, 12]} />
                {mat("#FFC531")}
              </mesh>
            </group>
          ),
        };
    }
  }, [buddy, look.color]);
}

const smileShape = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.16, 0);
  s.quadraticCurveTo(0, -0.36, 0.16, 0);
  s.closePath();
  return s;
})();

function Buddy({ buddy, look, animate, talking }) {
  const root = useRef(null);
  const armRef = useRef(null);
  const eyes = useRef([]);
  const mouth = useRef(null);
  const settle = useRef(0); // 0 = still pose reached
  const invalidate = useThree((state) => state.invalidate);
  const body = useBody(buddy, look);
  const smile = useMemo(() => new THREE.ShapeGeometry(smileShape), []);

  useFrame(({ clock }, dt) => {
    const g = root.current;
    if (!g) return;
    const t = clock.elapsedTime;
    const active = animate || talking;
    if (!active && settle.current === 0) return; // still: draw nothing more
    const k = active ? 1 : 0;
    // ease toward the moving pose (active) or the still pose (not active)
    const wantY = active ? Math.sin(t * 1.6) * 0.42 : 0;
    g.rotation.y += (wantY - g.rotation.y) * Math.min(1, dt * 8);
    const wantBob = active ? Math.abs(Math.sin(t * 3.2)) * 0.07 : 0;
    g.position.y += (wantBob - g.position.y) * Math.min(1, dt * 10);
    if (armRef.current) {
      const want = animate ? Math.sin(t * 6) * 0.45 - 0.35 : 0;
      armRef.current.rotation.z += (want - armRef.current.rotation.z) * Math.min(1, dt * 10);
    }
    const blink = k && t % 3.6 > 3.45 ? 0.1 : 1;
    eyes.current.forEach((e) => {
      if (e) e.scale.y = THREE.MathUtils.lerp(e.scale.y, blink * 1.35, 0.5);
    });
    if (mouth.current) {
      const open = talking ? 0.55 + Math.abs(Math.sin(t * 14)) * 0.9 : 1;
      mouth.current.scale.y += (open - mouth.current.scale.y) * 0.5;
    }
    // keep drawing until the pose is back to rest
    const resting = !active && Math.abs(g.rotation.y) < 0.004 && g.position.y < 0.002 && Math.abs(armRef.current?.rotation.z ?? 0) < 0.004;
    settle.current = resting ? 0 : 1;
    if (settle.current) invalidate();
  });

  // Anything that makes it move (animate / talking) must also start the loop: ask for a frame to get it going.
  useEffect(() => {
    if (animate || talking) {
      settle.current = 1;
      invalidate();
    }
  }, [animate, talking, invalidate]);

  const fz = body.fz;
  return (
    <group ref={root}>
      {body.node}
      {/* feet */}
      {[-0.4, 0.4].map((x) => (
        <mesh key={x} position={[x, body.bottom + 0.02, 0.15]} scale={[1.2, 0.65, 1]}>
          <sphereGeometry args={[0.24, 20, 20]} />
          {mat(look.feet)}
        </mesh>
      ))}
      {/* the arm that waves (the viewer's left), and the resting one */}
      <group ref={armRef} position={[-body.armX, body.armY + 0.35, 0]}>
        <mesh position={[0, 0.0, 0]} rotation={[0, 0, 0.7]}>
          <capsuleGeometry args={[0.07, 0.42, 8, 12]} />
          {mat(look.arm)}
        </mesh>
        <mesh position={[-0.2, 0.28, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          {mat(look.arm)}
        </mesh>
      </group>
      <group position={[body.armX, body.armY - 0.15, 0]}>
        <mesh rotation={[0, 0, -0.6]}>
          <capsuleGeometry args={[0.07, 0.42, 8, 12]} />
          {mat(look.arm)}
        </mesh>
        <mesh position={[0.22, -0.26, 0]}>
          <sphereGeometry args={[0.13, 16, 16]} />
          {mat(look.arm)}
        </mesh>
      </group>
      {/* face: a white cap, eyes, cheeks and a mouth */}
      <group position={[0, 0.08, fz]}>
        <mesh scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.62, 36, 36]} />
          {mat("#FFFFFF", { roughness: 0.7 })}
        </mesh>
        {[-0.21, 0.21].map((x, i) => (
          <group key={x} position={[x, 0.1, 0.17]}>
            <mesh ref={(el) => (eyes.current[i] = el)} scale={[1, 1.35, 0.5]}>
              <sphereGeometry args={[0.095, 16, 16]} />
              <meshStandardMaterial color={DARK} roughness={0.3} />
            </mesh>
            <mesh position={[0.03, 0.06, 0.05]}>
              <sphereGeometry args={[0.032, 8, 8]} />
              <meshBasicMaterial color="#FFFFFF" />
            </mesh>
          </group>
        ))}
        {[-0.36, 0.36].map((x) => (
          <mesh key={x} position={[x, -0.1, 0.14]} scale={[1, 1, 0.3]}>
            <sphereGeometry args={[0.085, 12, 12]} />
            <meshStandardMaterial color="#FF9EB5" roughness={0.8} />
          </mesh>
        ))}
        <group ref={mouth} position={[0, -0.08, 0.2]}>
          <mesh geometry={smile}>
            <meshStandardMaterial color={DARK} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export default function Buddy3D({ buddy = "pico", look, animate = false, talking = false }) {
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0.05, 6.4], fov: 34 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.95} />
      <directionalLight position={[2.5, 3.5, 5]} intensity={1.6} />
      <pointLight position={[-3, 1, 3]} intensity={5} color="#FFF4C2" />
      <Buddy buddy={buddy} look={look} animate={animate} talking={talking} />
    </Canvas>
  );
}
