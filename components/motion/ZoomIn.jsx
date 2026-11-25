"use client";

import { motion } from "framer-motion";
import { zoomProps } from "@/components/motion/zoom";
import { useMotionBand } from "@/components/motion/useMotionBand";

/**
 * A block that Zooms In once, when it first appears (a card whose data just arrived, a list item in a stagger).
 * It is a plain div with the same layout as the element it wraps; it does not animate again on re-renders or refetches
 * because it only runs on mount, so give it a stable key when it sits in a list.
 */
export function ZoomIn({ index = 0, className, children }) {
  const band = useMotionBand();
  return (
    <motion.div {...zoomProps(index, band)} className={`origin-top ${className || ""}`}>
      {children}
    </motion.div>
  );
}
