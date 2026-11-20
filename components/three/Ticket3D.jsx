"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/*
 * The "Yay! Class booked!" ticket in 3D: the class ticket (same outline as the 2D TICKET_PATH, 64 x 40) flies in with a
 * flip in the course's colour, its stub tears off along the dotted line and falls away, then a tick pops on it.
 * Plays once (about 1.5 s) and then stops drawing (frameloop "demand"). Loaded with next/dynamic by K5BookView only when
 * 3D is allowed (components/three/use3D.js); otherwise the 2D ticket stays.
 * band "k5" bounces, "middle" is calmer. color: the course colour (a CSS colour; a var() falls back to the accent blue).
 */
const S = 0.1; // SVG units -> scene units
const P = (x, y) => [(x - 32) * S, (20 - y) * S]; // SVG (y down, centre 32,20) -> scene (y up, centred)
const DEPTH = 0.14;
const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeIn = (t) => t * t * t;

/** The ticket body right of the dotted line (x 22..61), with the right notch. */
function bodyShape() {
  const s = new THREE.Shape();
  s.moveTo(...P(22, 3));
  s.lineTo(...P(56, 3));
  s.quadraticCurveTo(...P(61, 3), ...P(61, 8));
  s.lineTo(...P(61, 15));
  const [cx, cy] = P(61, 20);
  s.absarc(cx, cy, 5 * S, Math.PI / 2, (3 * Math.PI) / 2, false);
  s.lineTo(...P(61, 32));
  s.quadraticCurveTo(...P(61, 37), ...P(56, 37));
  s.lineTo(...P(22, 37));
  s.closePath();
  return s;
}

/** The stub left of the dotted line (x 3..22), with the left notch. */
function stubShape() {
  const s = new THREE.Shape();
  s.moveTo(...P(22, 3));
  s.lineTo(...P(22, 37));
  s.lineTo(...P(8, 37));
  s.quadraticCurveTo(...P(3, 37), ...P(3, 32));
  s.lineTo(...P(3, 25));
  const [cx, cy] = P(3, 20);
  s.absarc(cx, cy, 5 * S, -Math.PI / 2, Math.PI / 2, false);
  s.lineTo(...P(3, 8));
  s.quadraticCurveTo(...P(3, 3), ...P(8, 3));
  s.closePath();
  return s;
}

const EXTRUDE = { depth: DEPTH, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 16 };

function Ticket({ color, band }) {
  const whole = useRef(null);
  const stub = useRef(null);
  const tick = useRef(null);
  const age = useRef(0);
  const done = useRef(false);
  const invalidate = useThree((state) => state.invalidate);
  const body = useMemo(() => new THREE.ExtrudeGeometry(bodyShape(), EXTRUDE), []);
  const stubGeometry = useMemo(() => new THREE.ExtrudeGeometry(stubShape(), EXTRUDE), []);
  // the dotted tear line: small white dashes down x = 22
  const dashes = useMemo(() => Array.from({ length: 7 }, (_, i) => P(22, 6 + i * 4.7)[1]), []);
  const tearX = P(22, 0)[0];

  useFrame(({ clock }) => {
    if (done.current) return;
    // Real time since the first frame (not summed frame steps): a slow or throttled page still finishes on time.
    if (age.current === 0) age.current = clock.elapsedTime || 0.0001;
    const t = clock.elapsedTime - age.current;
    const w = whole.current;
    if (w) {
      const p = Math.min(1, t / 0.6);
      const k = band === "k5" ? easeOutBack(p) : easeOut(p);
      w.rotation.y = (1 - k) * -Math.PI;
      w.rotation.z = -0.14 * k;
      w.scale.setScalar(0.5 + 0.5 * Math.min(1, k));
    }
    const s = stub.current;
    if (s) {
      // tear: 0.65 s -> 1.35 s, the stub swings down around its top-right corner and drops
      const p = Math.max(0, Math.min(1, (t - 0.65) / 0.7));
      const e = easeIn(p);
      s.rotation.z = e * 0.9;
      s.position.set(-e * 0.6, -e * 3.2, 0);
      s.visible = p < 1;
    }
    const c = tick.current;
    if (c) {
      const p = Math.max(0, Math.min(1, (t - 0.95) / 0.35));
      c.scale.setScalar(Math.max(0.001, band === "k5" ? easeOutBack(p) : easeOut(p)));
    }
    if (t >= 1.45) done.current = true;
    invalidate();
  });

  const ink = new THREE.Color(color);
  return (
    <group ref={whole} rotation={[0, -Math.PI, 0]} scale={0.5}>
      <mesh geometry={body} position={[0, 0, -DEPTH / 2]}>
        <meshStandardMaterial color={ink} roughness={0.45} metalness={0.1} />
      </mesh>
      {/* the stub hangs from its top-right corner on the tear line, so it can swing off */}
      <group position={[tearX, P(0, 3)[1], 0]}>
        <group ref={stub}>
          <mesh geometry={stubGeometry} position={[-tearX, -P(0, 3)[1], -DEPTH / 2]}>
            <meshStandardMaterial color={ink.clone().offsetHSL(0, 0, 0.08)} roughness={0.45} metalness={0.1} />
          </mesh>
        </group>
      </group>
      {dashes.map((y) => (
        <mesh key={y} position={[tearX + 0.04, y, DEPTH / 2 + 0.03]}>
          <boxGeometry args={[0.05, 0.22, 0.01]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      ))}
      {/* the tick, centred on the body */}
      <group ref={tick} position={[P(41, 0)[0], -0.05, DEPTH / 2 + 0.04]} scale={0.001}>
        <mesh position={[-0.28, -0.08, 0]} rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.16, 0.5, 0.06]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
        <mesh position={[0.18, 0.12, 0]} rotation={[0, 0, -Math.PI / 4.5]}>
          <boxGeometry args={[0.16, 0.95, 0.06]} />
          <meshBasicMaterial color="#FFFFFF" />
        </mesh>
      </group>
    </group>
  );
}

export default function Ticket3D({ color, band }) {
  // A CSS variable cannot be read inside the canvas: use the accent blue for it.
  const solid = typeof color === "string" && !color.startsWith("var(") ? color : "#1E66E0";
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6.2], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[2, 3, 5]} intensity={1.6} />
      <pointLight position={[-3, 2, 3]} intensity={5} color="#FFF4C2" />
      <Ticket color={solid} band={band} />
    </Canvas>
  );
}
