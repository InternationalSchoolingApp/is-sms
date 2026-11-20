"use client";

import { useSyncExternalStore } from "react";
import { useMotion } from "@/components/motion/MotionProvider";

/*
 * Should this dashboard show 3D (three.js) right now? One rule for every 3D piece:
 *   - the browser can do WebGL;
 *   - motion is not reduced (the student's Appearance setting or the OS, from MotionProvider);
 *   - not a low-power device (few CPU cores / little memory);
 *   - the grade look allows it: K-5 and Middle yes, High (Mature) no - it keeps its plain 2D look.
 * When it says no, the caller shows its existing 2D version. Server render: always no (3D is browser-only).
 */
let webglCache = null;
function readWebGL() {
  if (webglCache === null) {
    try {
      const canvas = document.createElement("canvas");
      webglCache = Boolean(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglCache = false;
    }
  }
  return webglCache;
}
const noSubscribe = () => () => {};

export function use3D() {
  const { band, reduced, lowPower } = useMotion();
  const webgl = useSyncExternalStore(noSubscribe, readWebGL, () => false);
  return { enabled: webgl && !reduced && !lowPower && band !== "high", band };
}
