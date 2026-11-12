"use client";

import { usePathname } from "next/navigation";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { AddAnotherChildButton } from "@/components/parent/AddAnotherChildButton";

// "GRADE 8" -> "Grade 8" (the backend sends the standard name in capitals).
const gradeLabel = (standardName) =>
  String(standardName ?? "")
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

// "Mohammed Bin Mubarak Al Dayani" -> "Mohammed": the tab shows the first name only.
const firstName = (name) => String(name ?? "").trim().split(/\s+/)[0] || "";

/**
 * All the parent's children side by side at the top of every parent page (legacy "Child 1: Mohammed . Grade 8"
 * tabs): the selected one is highlighted and underlined, a click switches the whole dashboard to that child
 * (data and theme). Opens on Child 1. Arrow keys move between the tabs, Home / End jump to the first / last.
 */
export function ChildTabs() {
  const { children, selectedChild, selectChild } = useSelectedChild();
  const pathname = usePathname();
  // My Profile is about the parent, not a child: no child tabs there.
  if (children.length === 0 || /^\/[^/]+\/parent\/my-profile\/?$/.test(pathname || "")) return null;
  const selectedId = selectedChild ? String(selectedChild.userId) : null;

  const onKeyDown = (event, index) => {
    const last = children.length - 1;
    const next = { ArrowRight: index === last ? 0 : index + 1, ArrowLeft: index === 0 ? last : index - 1, Home: 0, End: last }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    selectChild(children[next].userId);
    document.getElementById(`child-tab-${children[next].userId}`)?.focus();
  };

  return (
    <div className="mx-auto mb-4 flex max-w-7xl items-center gap-3 border-b border-slate-200">
      <div className="min-w-0 flex-1 overflow-x-auto">
      <div role="tablist" aria-label="Children" className="flex min-w-max justify-center">
        {children.map((child, index) => {
          const active = String(child.userId) === selectedId;
          const grade = gradeLabel(child.standardName);
          return (
            <button
              key={child.userId || child.studentId}
              id={`child-tab-${child.userId}`}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => selectChild(child.userId)}
              onKeyDown={(e) => onKeyDown(e, index)}
              className={`flex items-center gap-2.5 border-b-[3px] px-5 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                active ? "border-primary bg-primary/10 font-bold text-black" : "border-transparent text-black hover:bg-slate-50"
              }`}
            >
              <ChildAvatar child={child} size={30} />
              <span className="text-sm leading-snug">
                Child {index + 1}: {firstName(child.studentName)}
                {grade && <span className="ml-1 text-xs text-black/70"> · {grade}</span>}
              </span>
            </button>
          );
        })}
      </div>
      </div>
      <div className="pb-1">
        <AddAnotherChildButton />
      </div>
    </div>
  );
}
