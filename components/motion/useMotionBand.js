"use client";

import { useMotion } from "@/components/motion/MotionProvider";

/** "k5" (Playful), "middle" (Balanced) or "high" (Mature): the look the shell is showing. */
export function useMotionBand() {
  return useMotion().band;
}
