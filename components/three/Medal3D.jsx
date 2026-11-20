"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/*
 * An earned Achievements medal as a small 3D coin: a gold-rimmed disc in the badge's colour with its glyph (clock, bolt,
 * star, flag, target) on the face and the two ribbons behind it. It flips in once when it appears and spins once each
 * time `spinKey` changes (hover). The canvas only draws while it moves (frameloop "demand"), so five medals on a page
 * cost nothing when still. Loaded with next/dynamic by K5PerformanceAchievements only when 3D is allowed.
 * medal: { icon, fill, ring, ribbon, glyph } (k5PerformanceData MEDALS); band "k5" bounces, "middle" is calmer.
 */
const FLIP_S = 0.9;
const SPIN_S = 0.8;
const easeOutBack = (t) => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);
const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** The coin face: the badge colour, a ring and its glyph, drawn once on a canvas. */
function faceTexture({ icon, fill, ring, glyph }) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext("2d");
  const c = size / 2;
  g.fillStyle = ring;
  g.beginPath();
  g.arc(c, c, c, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = fill;
  g.beginPath();
  g.arc(c, c, c * 0.84, 0, Math.PI * 2);
  g.fill();
  // soft shine
  g.strokeStyle = "rgba(255,255,255,0.55)";
  g.lineWidth = 10;
  g.lineCap = "round";
  g.beginPath();
  g.arc(c, c, c * 0.68, Math.PI * 1.1, Math.PI * 1.45);
  g.stroke();

  g.strokeStyle = glyph;
  g.fillStyle = glyph;
  g.lineWidth = 16;
  g.lineJoin = "round";
  const s = 56; // glyph half size
  g.save();
  g.translate(c, c);
  if (icon === "clock") {
    g.beginPath();
    g.arc(0, 0, s, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(0, -s * 0.6);
    g.moveTo(0, 0);
    g.lineTo(s * 0.45, s * 0.2);
    g.stroke();
  } else if (icon === "bolt") {
    g.beginPath();
    g.moveTo(s * 0.15, -s);
    g.lineTo(-s * 0.55, s * 0.15);
    g.lineTo(0, s * 0.15);
    g.lineTo(-s * 0.15, s);
    g.lineTo(s * 0.55, -s * 0.15);
    g.lineTo(0, -s * 0.15);
    g.closePath();
    g.fill();
  } else if (icon === "flag") {
    g.beginPath();
    g.moveTo(-s * 0.55, s);
    g.lineTo(-s * 0.55, -s);
    g.stroke();
    g.beginPath();
    g.moveTo(-s * 0.55, -s);
    g.lineTo(s * 0.7, -s * 0.6);
    g.lineTo(-s * 0.55, -s * 0.1);
    g.closePath();
    g.fill();
  } else if (icon === "target") {
    [1, 0.62, 0.24].forEach((r, i) => {
      g.beginPath();
      g.arc(0, 0, s * r, 0, Math.PI * 2);
      if (i === 2) g.fill();
      else g.stroke();
    });
  } else {
    // star
    g.beginPath();
    for (let i = 0; i < 10; i += 1) {
      const r = i % 2 === 0 ? s : s * 0.45;
      const a = (i * Math.PI) / 5 - Math.PI / 2;
      g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    g.closePath();
    g.fill();
  }
  g.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function Coin({ medal, band, spinKey }) {
  const group = useRef(null);
  const invalidate = useThree((state) => state.invalidate);
  const anim = useRef({ kind: "flip", t: 0 });
  // The parent builds a new medal object on every render: key the texture on its colours and glyph only.
  const { icon, fill, ring, glyph } = medal;
  const texture = useMemo(() => faceTexture({ icon, fill, ring, glyph }), [icon, fill, ring, glyph]);
  useEffect(() => () => texture.dispose(), [texture]);

  // A new spinKey (hover) spins the coin once more.
  const firstKey = useRef(spinKey);
  useEffect(() => {
    if (spinKey === firstKey.current) return;
    if (anim.current.kind === "idle") anim.current = { kind: "spin", t: 0 };
    invalidate();
  }, [spinKey, invalidate]);

  useFrame((_, dt) => {
    const g = group.current;
    const a = anim.current;
    if (!g || a.kind === "idle") return;
    a.t += Math.min(dt, 0.5); // real time (a throttled page takes big steps but still finishes on time)
    if (a.kind === "flip") {
      const p = Math.min(1, a.t / FLIP_S);
      const k = band === "k5" ? easeOutBack(p) : easeInOut(p);
      g.rotation.y = (1 - k) * -Math.PI;
      g.scale.setScalar(0.6 + 0.4 * Math.min(1, p * 1.5));
      if (p >= 1) anim.current = { kind: "idle", t: 0 };
    } else {
      const p = Math.min(1, a.t / SPIN_S);
      g.rotation.y = easeInOut(p) * Math.PI * 2;
      if (p >= 1) {
        g.rotation.y = 0;
        anim.current = { kind: "idle", t: 0 };
      }
    }
    invalidate();
  });

  return (
    <group ref={group} rotation={[0, -Math.PI, 0]} scale={0.6}>
      {/* ribbons behind the coin */}
      <mesh position={[-0.32, -0.95, -0.12]} rotation={[0, 0, 0.32]}>
        <boxGeometry args={[0.34, 0.95, 0.04]} />
        <meshStandardMaterial color={medal.ribbon} roughness={0.7} />
      </mesh>
      <mesh position={[0.32, -0.95, -0.12]} rotation={[0, 0, -0.32]}>
        <boxGeometry args={[0.34, 0.95, 0.04]} />
        <meshStandardMaterial color={medal.ribbon} roughness={0.7} />
      </mesh>
      {/* the coin: rim, then the two faces */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 0.16, 48]} />
        <meshStandardMaterial color={medal.ring} metalness={0.55} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0, 0.081]}>
        <circleGeometry args={[0.9, 48]} />
        <meshStandardMaterial map={texture} metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, -0.081]} rotation={[0, Math.PI, 0]}>
        <circleGeometry args={[0.9, 48]} />
        <meshStandardMaterial map={texture} metalness={0.15} roughness={0.45} />
      </mesh>
      <mesh>
        <torusGeometry args={[0.9, 0.06, 12, 48]} />
        <meshStandardMaterial color="#FFE08A" metalness={0.6} roughness={0.25} />
      </mesh>
    </group>
  );
}

export default function Medal3D({ medal, band, spinKey }) {
  return (
    <Canvas
      aria-hidden="true"
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ position: [0, -0.25, 3.2], fov: 40 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      className="pointer-events-none"
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 4]} intensity={1.5} />
      <pointLight position={[-2, 1, 2]} intensity={4} color="#FFF4C2" />
      <Coin medal={medal} band={band} spinKey={spinKey} />
    </Canvas>
  );
}
