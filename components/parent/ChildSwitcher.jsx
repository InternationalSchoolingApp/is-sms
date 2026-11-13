"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { firstName, gradeLabel } from "@/components/parent/childLabels";

/**
 * The child dropdown in the parent's header: shows who the dashboard is about and lists all the parent's children
 * (name and grade); choosing one switches the whole dashboard to that child straight away, from any page, without going
 * back to the picker. Only for a parent with more than one child and only once a child is chosen (while the picker
 * shows, the picker is the way to choose). On phones only the avatar and arrow show.
 */
export function ChildSwitcher() {
  const { children, selectedChild, selectChild } = useSelectedChild();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    // Keyboard users land on the current child.
    menuRef.current?.querySelector('[aria-checked="true"]')?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  if (!selectedChild || children.length < 2) return null;
  const selectedId = String(selectedChild.userId);

  const moveFocus = (event, index) => {
    const delta = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + children.length) % children.length;
    menuRef.current?.querySelectorAll('[role="menuitemradio"]')[next]?.focus();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Switch child. Showing ${selectedChild.studentName}`}
        className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100"
      >
        <ChildAvatar child={selectedChild} size={28} />
        <span className="hidden text-left leading-tight sm:block">
          <span className="block max-w-[140px] truncate text-sm font-bold text-black">{firstName(selectedChild.studentName)}</span>
          {selectedChild.standardName && <span className="block text-[11px] text-black/60">{gradeLabel(selectedChild.standardName)}</span>}
        </span>
        <ChevronDown className="h-4 w-4 text-black" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label="Children"
          className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {children.map((child, index) => {
            const active = String(child.userId) === selectedId;
            const grade = gradeLabel(child.standardName);
            return (
              <button
                key={child.userId || child.studentId}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                onKeyDown={(e) => moveFocus(e, index)}
                onClick={() => {
                  setOpen(false);
                  if (!active) selectChild(child.userId);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-slate-100 focus-visible:bg-slate-100 focus-visible:outline-none ${active ? "bg-primary/5" : ""}`}
              >
                <ChildAvatar child={child} size={32} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-black">{child.studentName}</span>
                  {grade && <span className="block text-xs text-black/60">{grade}</span>}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
