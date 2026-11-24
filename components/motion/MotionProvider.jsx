"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { MotionConfig } from "framer-motion";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { CANVAS } from "@/components/motion/motionConfig";

/**
 * The one place that decides how much the dashboard animates. Everything else (page reveal, count-up, canvas effects)
 * reads it with useMotion().
 *  - band:   "k5" | "middle" | "high", from the same flags the shell uses (the student's Theme pick overrides the grade).
 *  - reduced: the student's "Motion" look setting OR the OS "reduce motion" setting. AppearanceProvider already folds both
 *            into themeProps["data-motion"], so there is no second matchMedia here.
 *  - canvasEnabled: false when reduced; continuous canvas loops, particles and confetti all stop.
 *  - lowPower: few CPU cores or little memory -> canvas counts are halved.
 */
const MotionContext = createContext({ band: "k5", reduced: true, canvasEnabled: false, lowPower: false, particleCount: 0, shapeCount: 0 });

const noSubscribe = () => () => {};
const readLowPower = () => {
  const cores = navigator.hardwareConcurrency;
  const memory = navigator.deviceMemory;
  return (Number.isFinite(cores) && cores <= 4) || (Number.isFinite(memory) && memory <= 4);
};

export function MotionProvider({ children }) {
  const { themeProps } = useAppearance();
  const { isMiddle, isHigh } = useDashboardContext();
  // false on the server and during hydration, so nothing differs between the two renders.
  const lowPower = useSyncExternalStore(noSubscribe, readLowPower, () => false);
  const reduced = themeProps["data-motion"] === "reduced";
  const band = isHigh ? "high" : isMiddle ? "middle" : "k5";

  const value = useMemo(() => {
    const factor = lowPower ? CANVAS.lowPowerFactor : 1;
    return {
      band,
      reduced,
      canvasEnabled: !reduced,
      lowPower,
      particleCount: reduced ? 0 : Math.round(CANVAS.particles[band] * factor),
      shapeCount: reduced ? 0 : Math.round(CANVAS.shapes[band] * factor),
    };
  }, [band, reduced, lowPower]);

  // "always" makes every motion component skip transforms (opacity-only changes still run); "never" keeps them as written.
  return (
    <MotionContext.Provider value={value}>
      <MotionConfig reducedMotion={reduced ? "always" : "never"}>{children}</MotionConfig>
    </MotionContext.Provider>
  );
}

export function useMotion() {
  return useContext(MotionContext);
}
