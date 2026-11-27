import { DUR, EASE_OUT, SPRING, STAGGER, ZOOM } from "@/components/motion/motionConfig";

/**
 * Props for a motion element that Zooms In when it first mounts (scale from the band's value to 1, opacity 0 to 1);
 * `index` places it in a stagger. K-5 (and a little Middle) scale with a light spring, High with a plain ease-out.
 * Opacity never springs (it would overshoot). Spread onto motion.div: `<motion.div {...zoomProps(1, band)} className="...">`.
 * Reduced Motion needs nothing here: MotionProvider turns transforms off, only the opacity change is left.
 */
export function zoomProps(index, band) {
  const delay = index * STAGGER[band];
  const spring = SPRING[band];
  return {
    initial: { opacity: 0, scale: ZOOM[band] },
    animate: { opacity: 1, scale: 1 },
    transition: {
      opacity: { duration: DUR.card, ease: EASE_OUT, delay },
      scale: spring ? { ...spring, delay } : { duration: DUR.card, ease: EASE_OUT, delay },
    },
  };
}
