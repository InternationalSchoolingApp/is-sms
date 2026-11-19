"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import { useCanvasEngine } from "@/components/motion/canvas/useCanvasEngine";
import { readPalette } from "@/components/motion/canvas/palette";

const DURATION_MS = 2400;
const TAU = Math.PI * 2;

/**
 * A short sparkle around a graphical progress indicator (the attendance donut). Put it inside a `relative` wrapper: it
 * fills the wrapper plus a margin, cannot take clicks, plays for about 2.4 s once when it mounts and then removes itself.
 * It is only decoration: the real numbers stay in normal HTML next to it and in the indicator's aria-label.
 * Nothing renders under Reduced Motion or for the Mature (High) look.
 */
export function ProgressSparkle() {
  const { band, canvasEnabled } = useMotion();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!canvasEnabled || band === "high") return undefined;
    const timer = setTimeout(() => setDone(true), DURATION_MS);
    return () => clearTimeout(timer);
  }, [canvasEnabled, band]);

  if (!canvasEnabled || band === "high" || done) return null;
  return <SparkleCanvas band={band} />;
}

function SparkleCanvas({ band }) {
  const canvasRef = useRef(null);
  useCanvasEngine(canvasRef, {
    enabled: true,
    setup: ({ width, height }) => {
      const palette = readPalette(canvasRef.current, "k5");
      const count = band === "k5" ? 12 : 7;
      const radius = Math.min(width, height) * 0.42;
      return {
        age: 0,
        cx: width / 2,
        cy: height / 2,
        sparks: Array.from({ length: count }, (_, i) => {
          const angle = (i / count) * TAU + Math.random() * 0.4;
          const r = radius * (0.95 + Math.random() * 0.2);
          return { x: Math.cos(angle) * r, y: Math.sin(angle) * r, size: 5 + Math.random() * 6, offset: Math.random() * 0.5, color: palette[i % palette.length] };
        }),
      };
    },
    frame: (state, { ctx, width, height, dt }) => {
      state.age += dt;
      ctx.clearRect(0, 0, width, height);
      const t = state.age / DURATION_MS;
      if (t >= 1) return false;
      for (const s of state.sparks) {
        // each sparkle grows and shrinks once, staggered by its own offset
        const local = Math.min(1, Math.max(0, (t - s.offset * 0.5) / 0.5));
        const pulse = Math.sin(local * Math.PI);
        if (pulse <= 0) continue;
        const r = s.size * pulse;
        ctx.save();
        ctx.translate(state.cx + s.x, state.cy + s.y);
        ctx.rotate(local * 1.2);
        ctx.globalAlpha = 0.9 * pulse;
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(r * 0.15, -r * 0.15, r, 0);
        ctx.quadraticCurveTo(r * 0.15, r * 0.15, 0, r);
        ctx.quadraticCurveTo(-r * 0.15, r * 0.15, -r, 0);
        ctx.quadraticCurveTo(-r * 0.15, -r * 0.15, 0, -r);
        ctx.fill();
        ctx.restore();
      }
      return true;
    },
  });
  return <canvas ref={canvasRef} aria-hidden="true" data-motion-canvas="progress" className="pointer-events-none absolute -inset-4 h-[calc(100%+2rem)] w-[calc(100%+2rem)]" />;
}
