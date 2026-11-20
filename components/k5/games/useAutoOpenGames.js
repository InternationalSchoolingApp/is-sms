"use client";

import { useEffect } from "react";

/**
 * "Play games" on the dashboard's Today's Goal brings the student to My Classes with ?games=open. Once the page is
 * there: glide to the Your Games section, then let it slide open (its own collapse animation), and drop the marker
 * from the address. Does nothing without the marker, and runs once per visit of the section.
 */
export function useAutoOpenGames(sectionRef, setOpen) {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (new URLSearchParams(window.location.search).get("games") !== "open") return undefined;
    const timers = [];
    timers.push(
      setTimeout(() => {
        const el = sectionRef.current;
        if (el) {
          const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || Boolean(el.closest('[data-motion="reduced"]'));
          // 104 = the sticky header plus a little air.
          const top = el.getBoundingClientRect().top + window.scrollY - 104;
          window.scrollTo({ top: Math.max(0, top), behavior: reduced ? "auto" : "smooth" });
        }
        timers.push(
          setTimeout(() => {
            setOpen(true);
            window.history.replaceState(null, "", window.location.pathname);
          }, 600),
        );
      }, 500),
    );
    return () => timers.forEach(clearTimeout);
  }, [sectionRef, setOpen]);
}
