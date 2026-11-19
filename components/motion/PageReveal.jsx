"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { motion, useAnimationControls } from "framer-motion";
import { DUR, EASE_OUT, ZOOM } from "@/components/motion/motionConfig";
import { useMotionBand } from "@/components/motion/useMotionBand";
import { routeTransition } from "@/components/motion/routeTransition";

/**
 * <main> of the dashboard shell: the shared Zoom In. It plays when the shell first appears (this replaces the old 0.3 s
 * opacity fade of the whole shell) and on route changes that Curtains: Blinds does not cover (browser Back / Forward,
 * router.push). The element is animated in place - no key, so nothing remounts and no state is lost. The scale starts at
 * the grade band's value (K-5 0.80, Middle 0.88, High 0.94) and grows from the top edge, so the page never shifts sideways.
 * Reduced Motion (MotionProvider) removes the scale and leaves only the opacity change.
 *
 * First mount: the hidden state comes from the `initial` prop (so there is no flash of the finished page) and the
 * animation is started from a passive effect, once the element has mounted - starting controls from a layout effect on
 * the very first render does not run. Later route changes reset and start inside a layout effect, before paint.
 */
export function PageReveal({ children, className }) {
  const pathname = usePathname();
  const band = useMotionBand();
  const controls = useAnimationControls();
  const lastPath = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    lastPath.current = pathname;
    controls.start({ opacity: 1, scale: 1, transition: { duration: DUR.card, ease: EASE_OUT } });
    // first mount only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    if (!mounted.current || lastPath.current === pathname) return;
    lastPath.current = pathname;
    // Curtains: Blinds already reveals this page; the zoom would double it.
    if (routeTransition.blinds) return;
    controls.set({ opacity: 0, scale: ZOOM[band] });
    controls.start({ opacity: 1, scale: 1, transition: { duration: DUR.card, ease: EASE_OUT } });
  }, [pathname, band, controls]);

  return (
    <motion.main initial={{ opacity: 0, scale: ZOOM[band] }} animate={controls} className={`origin-top ${className || ""}`}>
      {children}
    </motion.main>
  );
}
