"use client";

import { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";
import { useMotion } from "@/components/motion/MotionProvider";
import { DUR, EASE_OUT } from "@/components/motion/motionConfig";

/**
 * A number that counts up to `value` (from 0 on first show, from the old number on later changes), `decimals` places
 * (0 by default; 1 for an average like 87.5). Percent signs, "of 8" and other text stay outside: write
 * `<CountUp value={87.5} decimals={1} />%`. It renders plain text, so layout and screen readers see the final number
 * whenever the count is not running, and it only runs when `value` itself changes - not on unrelated re-renders.
 * Reduced Motion (the look setting or the OS) shows the final number straight away. A value that is not a number is
 * rendered as it is ("-", null).
 */
export function CountUp({ value, decimals = 0 }) {
  const { reduced } = useMotion();
  const number = value === null || value === undefined || value === "" ? NaN : Number(value);
  const target = Number.isFinite(number) ? number : null;
  const [shown, setShown] = useState(0);
  const from = useRef(0);

  useEffect(() => {
    if (target === null || reduced) return undefined;
    const controls = animate(from.current, target, {
      duration: DUR.count,
      ease: EASE_OUT,
      onUpdate: (v) => {
        from.current = v;
        setShown(v);
      },
    });
    return () => controls.stop();
  }, [target, reduced]);

  // Reduced motion (or a value that is not a number) shows the real value, never an in-between one.
  if (target === null) return value ?? "";
  return (reduced ? target : shown).toFixed(decimals);
}
