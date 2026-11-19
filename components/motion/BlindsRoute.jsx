"use client";

import { useCallback, useEffect, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { BlindsTransition } from "@/components/motion/BlindsTransition";
import { useMotion } from "@/components/motion/MotionProvider";
import { routeTransition } from "@/components/motion/routeTransition";

// If the new route has not arrived after this long (slow network, an error) the blinds open anyway: they are cosmetic
// and must never keep the old page hidden.
const FAILSAFE_MS = 700;

// Pages that leave the dashboard shell: no point playing blinds for them.
const LEAVES_SHELL = /\/student\/(re-enrollment|welcome|setup)(\/|$)/;

/**
 * Curtains: Blinds between student dashboard routes.
 *  1. A click on an internal student link closes the blinds at once. Navigation starts as usual and is never delayed or awaited.
 *  2. When the pathname changes (the new route is committed) the blinds open and reveal it.
 *  3. Failsafe: they open after FAILSAFE_MS even if the route never arrives. Rapid clicks just keep them closed.
 * Links only: the browser's Back / Forward and router.push() calls get the plain page reveal. Reduced Motion plays nothing.
 */
export function BlindsRoute() {
  const pathname = usePathname();
  const { school } = useParams();
  const { reduced } = useMotion();
  const blinds = useRef(null);
  const pending = useRef(null); // { closed: Promise, timer }
  const pathRef = useRef(pathname);

  const finish = useCallback(async () => {
    const current = pending.current;
    if (!current) return;
    pending.current = null;
    clearTimeout(current.timer);
    await current.closed;
    await blinds.current?.open();
    routeTransition.blinds = false;
  }, []);

  useEffect(() => {
    pathRef.current = pathname;
    if (pending.current) finish();
  }, [pathname, finish]);

  useEffect(() => {
    if (reduced || !school) return undefined;
    const prefix = `/${school}/student`;
    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = e.target instanceof Element ? e.target.closest("a[href]") : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;
      let url;
      try {
        url = new URL(link.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (!url.pathname.startsWith(prefix) || LEAVES_SHELL.test(url.pathname) || url.pathname === pathRef.current) return;

      routeTransition.blinds = true;
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = {
        closed: blinds.current.close(),
        timer: setTimeout(finish, FAILSAFE_MS),
      };
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      if (pending.current) clearTimeout(pending.current.timer);
      pending.current = null;
      routeTransition.blinds = false;
    };
  }, [reduced, school, finish]);

  return <BlindsTransition ref={blinds} />;
}
