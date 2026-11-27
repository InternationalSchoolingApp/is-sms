"use client";

import { useEffect, useRef, useState } from "react";
import { useMotion } from "@/components/motion/MotionProvider";
import { useCanvasEngine } from "@/components/motion/canvas/useCanvasEngine";
import { readPalette } from "@/components/motion/canvas/palette";
import { onCelebrate } from "@/components/motion/canvas/celebrationEvents";
import { createConfetti, stepAndDrawConfetti } from "@/components/motion/canvas/ConfettiCanvas";
import { createBurst, stepAndDrawBurst } from "@/components/motion/canvas/AchievementCanvas";

// Piece / star counts per grade band (Playful is the most colourful, Mature the most restrained).
const CONFETTI_COUNT = { k5: 150, middle: 90, high: 45 };
const BURST_COUNT = { k5: 18, middle: 14, high: 9 };
const HARD_STOP_MS = 3200;

/**
 * The one place celebrations are drawn. It listens for celebrate(...) (canvas/celebrationEvents.js) and, only while an
 * effect is running, mounts a single full-screen canvas that cannot take clicks; when the last effect ends the canvas is
 * removed, so an idle dashboard has no canvas and no loop. Reduced Motion drops every celebration.
 */
export function CelebrationHost() {
  const { band, canvasEnabled, lowPower } = useMotion();
  const [active, setActive] = useState(false);
  const queue = useRef([]); // requested effects, built on the first frame (the canvas size is known by then)

  useEffect(() => {
    if (!canvasEnabled) return undefined;
    return onCelebrate((effect) => {
      const kinds = effect.kind === "day-complete" ? ["confetti", "burst"] : [effect.kind];
      for (const kind of kinds) queue.current.push({ kind, x: effect.x, y: effect.y, built: null });
      setActive(true);
    });
  }, [canvasEnabled]);

  if (!canvasEnabled || !active) return null;
  return <CelebrationCanvas band={band} lowPower={lowPower} queue={queue} onDone={() => setActive(false)} />;
}

function CelebrationCanvas({ band, lowPower, queue, onDone }) {
  const canvasRef = useRef(null);
  const factor = lowPower ? 0.5 : 1;

  useCanvasEngine(canvasRef, {
    enabled: true,
    setup: () => ({ palette: readPalette(canvasRef.current, "k5"), running: [] }),
    frame: (state, frame) => {
      const { width, height } = frame;
      // Build whatever was requested since the last frame.
      for (const request of queue.current.splice(0)) {
        const x = request.x ?? width / 2;
        const y = request.y ?? height * 0.38;
        state.running.push(
          request.kind === "burst"
            ? { startedAt: frame.time, step: stepAndDrawBurst, data: createBurst({ x, y, count: Math.round(BURST_COUNT[band] * factor), palette: state.palette }) }
            : { startedAt: frame.time, step: stepAndDrawConfetti, data: createConfetti({ width, height, count: Math.round(CONFETTI_COUNT[band] * factor), palette: state.palette }) },
        );
      }
      frame.ctx.clearRect(0, 0, width, height);
      // An effect ages by frame time, which is clamped on a slow machine; HARD_STOP_MS guarantees it ends in real time anyway.
      state.running = state.running.filter((effect) => frame.time - effect.startedAt < HARD_STOP_MS && effect.step(effect.data, frame) !== false);
      // Nothing left: unmount the canvas (the loop ends with it). The frame keeps its place in the loop until React removes
      // the canvas, so a celebration requested in that gap is still picked up on the next frame.
      if (!state.running.length) queueMicrotask(() => !queue.current.length && onDone());
      return true;
    },
  });

  return <canvas ref={canvasRef} aria-hidden="true" data-motion-canvas="celebration" className="pointer-events-none fixed inset-0 z-[65] h-full w-full" />;
}
