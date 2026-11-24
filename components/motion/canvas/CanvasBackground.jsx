"use client";

import { useMotion } from "@/components/motion/MotionProvider";
import { DotGridBackground } from "@/components/motion/canvas/DotGridBackground";

/**
 * The shell's page background, as in the mockups: the Elementary (Playful.dc.html) page has the interactive dot grid behind
 * everything; the Grade 6–8 and 9–12 pages (Middle.dc.html, High.dc.html) have a flat background, so they get nothing.
 * It never takes clicks (pointer-events-none) and never touches layout (fixed, inset-0). Under Reduced Motion the dots stay
 * but never move. `themeKey` remounts it when the student changes colour / Day-Night so the dot colour is read again.
 */
export function CanvasBackground({ themeKey }) {
  const { band, reduced } = useMotion();
  if (band !== "k5") return null;
  return <DotGridBackground key={themeKey} still={reduced} />;
}
