"use client";

import { useEffect, useRef } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import { useCanvasEngine } from "@/components/motion/canvas/useCanvasEngine";
import { readPalette } from "@/components/motion/canvas/palette";
import { createParticles, stepAndDrawParticles } from "@/components/motion/canvas/ParticleLayer";
import { createShapes, stepAndDrawShapes } from "@/components/motion/canvas/ShapeLayer";

// How many CSS pixels of viewport the counts in motionConfig were tuned for (1440 x 900).
const REFERENCE_AREA = 1440 * 900;

/**
 * The shell's ambient background: ONE canvas that draws the shapes layer and the particles layer, behind all content.
 * It never takes clicks (pointer-events-none) and never touches layout (fixed, inset-0). Nothing renders under
 * Reduced Motion. `themeKey` remounts the canvas when the student changes colour / Day-Night so the palette is re-read.
 */
export function CanvasBackground({ themeKey }) {
  const { band, canvasEnabled, particleCount, shapeCount } = useMotion();
  if (!canvasEnabled || particleCount + shapeCount === 0) return null;
  return <BackgroundCanvas key={`${band}:${themeKey}`} band={band} particleCount={particleCount} shapeCount={shapeCount} />;
}

function BackgroundCanvas({ band, particleCount, shapeCount }) {
  const canvasRef = useRef(null);
  const pointer = useRef({ x: -1000, y: -1000, active: false });

  // Pointer position lives in a ref: moving the mouse never re-renders anything.
  useEffect(() => {
    if (band === "high" || !window.matchMedia("(pointer: fine)").matches) return undefined;
    const move = (e) => {
      pointer.current.x = e.clientX;
      pointer.current.y = e.clientY;
      pointer.current.active = true;
    };
    const leave = () => {
      pointer.current.active = false;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
    };
  }, [band]);

  useCanvasEngine(canvasRef, {
    enabled: true,
    setup: ({ width, height }) => {
      const scale = Math.min(1.3, Math.max(0.5, (width * height) / REFERENCE_AREA));
      const palette = readPalette(canvasRef.current, band);
      return {
        shapes: createShapes({ count: Math.round(shapeCount * scale), width, height, palette, band }),
        particles: createParticles({ count: Math.round(particleCount * scale), width, height, palette, band }),
      };
    },
    frame: (state, frame) => {
      frame.ctx.clearRect(0, 0, frame.width, frame.height);
      stepAndDrawShapes(state.shapes, frame);
      stepAndDrawParticles(state.particles, frame, pointer.current);
    },
  });

  return <canvas ref={canvasRef} aria-hidden="true" data-motion-canvas="background" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
