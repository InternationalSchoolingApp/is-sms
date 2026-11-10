"use client";

import { useEffect, useRef } from "react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";

/**
 * Reading ruler (mockup .read-ruler): dims everything except a 60px band that follows the
 * pointer / finger so a child can keep their place on a line. Purely visual, never intercepts input.
 */
export function ReadingRuler() {
  const { preferences } = useAppearance();
  const on = preferences.ruler === "on";
  const bandRef = useRef(null);

  useEffect(() => {
    if (!on) return undefined;
    const move = (e) => {
      if (bandRef.current) bandRef.current.style.transform = `translateY(${Math.round(e.clientY)}px)`;
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", move, { passive: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", move);
    };
  }, [on]);

  if (!on) return null;
  return (
    <div
      ref={bandRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-0 z-[85] h-0"
      style={{ transform: "translateY(45vh)" }}
    >
      <div className="absolute inset-x-0 bottom-[30px] h-[200vh] bg-[rgba(10,16,34,0.32)]" />
      <div className="absolute inset-x-0 top-[30px] h-[200vh] bg-[rgba(10,16,34,0.32)]" />
      <div className="absolute inset-x-0 -top-[30px] box-border h-[60px] border-y-[3px] border-[#FFC531] bg-[rgba(255,243,196,0.18)]" />
    </div>
  );
}
