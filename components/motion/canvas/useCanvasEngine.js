"use client";

import { useEffect, useRef } from "react";
import { fitCanvas, subscribeCanvasEffect } from "@/components/motion/canvas/canvasEngine";

/**
 * Runs a canvas effect on the shared loop. Nothing here re-renders React: `setup` and `frame` work on plain objects
 * and the canvas itself.
 *   canvasRef - ref of the <canvas> (its CSS box sets the drawing size)
 *   enabled   - false stops the loop and clears the canvas (reduced motion, effect off)
 *   setup({ width, height }) -> state object, called on mount and again after every resize
 *   frame(state, { ctx, width, height, dt, time }) -> return false to finish (one-shot effects)
 * `setup` / `frame` are read from refs, so passing fresh closures every render never restarts the effect.
 */
export function useCanvasEngine(canvasRef, { enabled, setup, frame }) {
  const setupRef = useRef(setup);
  const frameRef = useRef(frame);
  useEffect(() => {
    setupRef.current = setup;
    frameRef.current = frame;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !enabled) return undefined;

    let size = fitCanvas(canvas);
    let state = setupRef.current({ width: size.width, height: size.height });

    const observer = new ResizeObserver(() => {
      // A ResizeObserver reports once right after observe(); only a real size change may rebuild the effect, or a running
      // effect (confetti, a sparkle) would be wiped on its first frame.
      if (!canvas.isConnected) return; // removed from the page: its effect is about to be cleaned up
      const rect = canvas.getBoundingClientRect();
      if (Math.round(rect.width) === size.width && Math.round(rect.height) === size.height) return;
      size = fitCanvas(canvas);
      state = setupRef.current({ width: size.width, height: size.height });
    });
    observer.observe(canvas);

    const unsubscribe = subscribeCanvasEffect({
      frame: (dt, time) => frameRef.current(state, { ctx: size.ctx, width: size.width, height: size.height, dt, time }),
    });

    return () => {
      unsubscribe();
      observer.disconnect();
      size.ctx.clearRect(0, 0, size.width, size.height);
    };
  }, [canvasRef, enabled]);
}
