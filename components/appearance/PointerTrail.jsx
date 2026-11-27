"use client";

import { useEffect, useRef } from "react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";

/**
 * The little trail the mouse arrow leaves when a student picked one in "Make it yours" > Pick your pointer
 * (Playful.dc.html ptrTrail): rocket sparks, stars, wand glitter, green blocks, a rainbow of dots or paw prints. The arrow itself is
 * app/pointer.css (html[data-pointer]); this only draws the trail on a full-screen canvas that never takes a click.
 * Nothing is drawn for the normal arrow, for touch input, or when the student asked for less motion.
 */
const GAP = { paw: 34, block: 14 };

function star(c, x, y, r, rot) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = rot + (i * Math.PI) / 5 - Math.PI / 2;
    const rr = i % 2 ? r * 0.45 : r;
    c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  c.closePath();
  c.fill();
}

function spark(c, x, y, r) {
  c.beginPath();
  c.moveTo(x, y - r);
  c.quadraticCurveTo(x, y, x + r, y);
  c.quadraticCurveTo(x, y, x, y + r);
  c.quadraticCurveTo(x, y, x - r, y);
  c.quadraticCurveTo(x, y, x, y - r);
  c.fill();
}

function paw(c, x, y, r, rot) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.beginPath();
  c.ellipse(0, r * 0.35, r * 0.55, r * 0.45, 0, 0, Math.PI * 2);
  c.fill();
  [[-0.62, -0.3], [-0.22, -0.66], [0.22, -0.66], [0.62, -0.3]].forEach(([a, b]) => {
    c.beginPath();
    c.arc(a * r, b * r, r * 0.2, 0, Math.PI * 2);
    c.fill();
  });
  c.restore();
}

export function PointerTrail() {
  const { preferences } = useAppearance();
  const pointer = preferences.pointer;
  const reduced = preferences.motion === "reduced";
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || pointer === "normal" || reduced) return undefined;
    let still = false;
    try {
      still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      // no matchMedia: draw the trail
    }
    if (still) return undefined;

    const ctx = cv.getContext("2d");
    let particles = [];
    let raf = 0;
    let lx = -99;
    let ly = -99;
    let hue = 0;
    let n = 0;
    let w = 0;
    let h = 0;

    const size = () => {
      const d = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;
      cv.width = Math.round(w * d);
      cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
    };

    const frame = () => {
      raf = 0;
      ctx.clearRect(0, 0, w, h);
      const now = performance.now();
      particles = particles.filter((p) => now - p.t < p.life);
      for (const p of particles) {
        const k = (now - p.t) / p.life;
        ctx.globalAlpha = Math.max(0, 1 - k);
        ctx.fillStyle = p.c;
        const x = p.x + p.vx * k * 22;
        const y = p.y + p.vy * k * 22;
        const r = p.r * (p.grow ? 1 + k : 1 - k * 0.6);
        if (p.s === "star") star(ctx, x, y, r, p.rot);
        else if (p.s === "spark") spark(ctx, x, y, r);
        else if (p.s === "sq") ctx.fillRect(x - r, y - r, r * 2, r * 2);
        else if (p.s === "paw") paw(ctx, x, y, r, p.rot);
        else {
          ctx.beginPath();
          ctx.arc(x, y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (particles.length) raf = requestAnimationFrame(frame);
    };

    const add = (x, y) => {
      const now = performance.now();
      if (Math.hypot(x - lx, y - ly) < (GAP[pointer] ?? 8)) return;
      const ang = Math.atan2(y - ly, x - lx);
      lx = x;
      ly = y;
      n++;
      const R = (a, b) => a + Math.random() * (b - a);
      if (pointer === "rocket") {
        particles.push({ x, y, vx: R(-0.4, 0.4), vy: R(0.2, 0.8), r: R(3, 6), c: n % 3 ? "#FFB020" : "#FF6B3D", s: "c", life: 550, t: now });
        if (n % 2) particles.push({ x: x + R(-3, 3), y: y + R(-3, 3), vx: R(-0.5, 0.5), vy: R(0.3, 1), r: R(3, 5), c: "rgba(160,170,190,.7)", s: "c", life: 800, t: now, grow: true });
      } else if (pointer === "star") {
        particles.push({ x, y, vx: R(-0.5, 0.5), vy: R(0.2, 0.9), r: R(4, 7), c: ["#FFD23F", "#FFB020", "#FFE780"][n % 3], s: "star", rot: R(0, 6), life: 800, t: now });
      } else if (pointer === "wand") {
        for (let i = 0; i < 2; i++) {
          particles.push({ x: x + R(-6, 6), y: y + R(-6, 6), vx: R(-0.6, 0.6), vy: R(-0.2, 0.9), r: R(3, 6), c: ["#FFD23F", "#C9A7FF", "#FF9EC8", "#FFFFFF"][(n + i) % 4], s: "spark", life: 700, t: now });
        }
      } else if (pointer === "block") {
        particles.push({ x: Math.round(x / 6) * 6, y: Math.round(y / 6) * 6, vx: 0, vy: R(0.2, 0.6), r: 3.5, c: ["#7BC950", "#5DA83A", "#8B5A2B"][n % 3], s: "sq", life: 650, t: now });
      } else if (pointer === "rainbow") {
        hue = (hue + 24) % 360;
        particles.push({ x, y, vx: 0, vy: 0, r: 5, c: `hsl(${hue},90%,62%)`, s: "c", life: 600, t: now });
      } else if (pointer === "paw") {
        const o = n % 2 ? 6 : -6;
        particles.push({ x: x + Math.cos(ang + Math.PI / 2) * o, y: y + Math.sin(ang + Math.PI / 2) * o, vx: 0, vy: 0, r: 7, c: "#F59AB8", s: "paw", rot: ang + Math.PI / 2, life: 900, t: now });
      }
      if (particles.length > 90) particles.splice(0, particles.length - 90);
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      if (e.pointerType === "touch") return;
      add(e.clientX, e.clientY);
    };

    size();
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", size);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("resize", size);
      if (raf) cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, w, h);
    };
  }, [pointer, reduced]);

  if (pointer === "normal") return null;
  return <canvas ref={canvasRef} aria-hidden="true" className="pointer-events-none fixed inset-0 z-[9999] h-full w-full" />;
}
