"use client";

import { useEffect, useRef, useState } from "react";
import { DEFAULT_COURSE_PALETTE } from "@/utils/calendarEvents";

/**
 * Course color swatch + palette popup (legacy renderCourseFilters' color
 * picker: click the dot, pick a new color, every CLASS event/chip for that
 * course re-colors immediately via courseRegistry).
 */
export function CourseColorPicker({ color, onPick }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label="Change course color"
        className="h-4 w-4 flex-shrink-0 rounded-full border border-black/10"
        style={{ background: color }}
      />
      {open && (
        <div className="absolute left-0 top-6 z-20 grid w-[136px] grid-cols-5 gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
          {DEFAULT_COURSE_PALETTE.map((swatch) => (
            <button
              key={swatch}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPick(swatch);
                setOpen(false);
              }}
              aria-label={`Pick color ${swatch}`}
              className={`h-5 w-5 rounded-full border-2 ${swatch === color ? "border-black" : "border-transparent"}`}
              style={{ background: swatch }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
