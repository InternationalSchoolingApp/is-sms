"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FullScreenLoader } from "@/components/common/Loader";
import { usePendingRequests } from "@/utils/loaderStore";

// While a page is first loading the overlay appears immediately (a delay would let the page's own
// skeleton flash before the dark overlay covers it). Once that initial load has settled, later
// calls wait SHOW_DELAY_MS so quick ones never flash it. The overlay lingers HIDE_GRACE_MS after
// the last call ends so back-to-back calls don't make it blink off and on.
const SHOW_DELAY_MS = 250;
const HIDE_GRACE_MS = 200;

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
  }, [active, visible]);

  return visible ? <FullScreenLoader /> : null;
}
