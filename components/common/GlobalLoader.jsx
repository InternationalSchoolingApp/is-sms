"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { FullScreenLoader } from "@/components/common/Loader";
import { usePendingRequests } from "@/utils/loaderStore";

// While a page is first loading the overlay appears immediately (a delay would let the page's own
// skeleton flash before the dark overlay covers it) - except in the student dashboard, which has its own skeletons
// (DashboardLoadingSkeleton, module skeletons) and must not be greyed out on every first load. Once that initial load
// has settled, later calls wait SHOW_DELAY_MS so quick ones never flash it. The overlay lingers HIDE_GRACE_MS after
// the last call ends so back-to-back calls don't make it blink off and on.
const SHOW_DELAY_MS = 250;
const HIDE_GRACE_MS = 200;
const DASHBOARD_PATH = /^\/[^/]+\/student(\/|$)/;

export function GlobalLoader() {
  const active = usePendingRequests() > 0;
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const sawActivity = useRef(false);
  const settled = useRef(false);

  useEffect(() => {
    sawActivity.current = false;
    settled.current = false;
  }, [pathname]);

  useEffect(() => {
    if (active) {
      sawActivity.current = true;
      if (visible) return;
      // Dashboard first load: the page shows skeletons, no overlay (settled turns true when the calls end).
      if (!settled.current && DASHBOARD_PATH.test(pathname || "")) return;
      const timer = setTimeout(() => setVisible(true), settled.current ? SHOW_DELAY_MS : 0);
      return () => clearTimeout(timer);
    }
    if (!sawActivity.current) return;
    const timer = setTimeout(
      () => {
        setVisible(false);
        settled.current = true;
      },
      visible ? HIDE_GRACE_MS : 0
    );
    return () => clearTimeout(timer);
  }, [active, visible, pathname]);

  const isPaymentResponsePage = pathname?.includes("/payment-response-");
  // The overlay zooms out and fades (0.22 s) instead of vanishing, so the page underneath is revealed smoothly. The wrapper is
  // fixed itself: a transformed non-fixed parent would shrink the fixed overlay inside it while it animates. The OS
  // "reduce motion" setting drops the zoom (this sits above the student's own look settings, so only the OS one is known here).
  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence>
        {visible && !isPaymentResponsePage ? (
          <motion.div
            key="loader"
            className="fixed inset-0 z-[100]"
            initial={{ opacity: 1, scale: 1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <FullScreenLoader />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </MotionConfig>
  );
}
