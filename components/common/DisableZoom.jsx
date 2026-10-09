"use client";

import { useEffect } from "react";

/**
 * Blocks pinch-zoom and double-tap-zoom on touch devices. The viewport meta
 * tag's maximumScale/userScalable is ignored by iOS Safari (since iOS 10, by
 * design, for accessibility) so pinch/double-tap zoom still works there even
 * with that meta set — this covers what the meta tag can't.
 */
export function DisableZoom() {
  useEffect(() => {
    function blockGesture(e) {
      e.preventDefault();
    }

    function blockMultiTouchMove(e) {
      if (e.touches.length > 1) e.preventDefault();
    }

    let lastTouchEnd = 0;
    function blockDoubleTapZoom(e) {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    }

    // Safari-only gesture events, fired for pinch (and rotation).
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("touchmove", blockMultiTouchMove, { passive: false });
    document.addEventListener("touchend", blockDoubleTapZoom, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("touchmove", blockMultiTouchMove);
      document.removeEventListener("touchend", blockDoubleTapZoom);
    };
  }, []);

  return null;
}
