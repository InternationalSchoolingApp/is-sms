"use client";

import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { ChildAvatar } from "@/components/parent/ChildAvatar";

/**
 * The parent's child cards (legacy renderParentChildSelectionScreen). The dashboard no longer opens on this: the
 * children are tabs across the top (ChildTabs) and Child 1 is selected, so this only shows the "no children"
 * message for a parent with none. Kept as a card list for that case: choosing one makes
 * it the selected child (held in the page, not the URL) and the page behind it shows that child's data.
 */
export function ChildPicker() {
  const { children, selectChild } = useSelectedChild();

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-extrabold text-black sm:text-xl">No children found</h1>
        <p className="mt-2 text-sm text-black/60">There is no active child linked to this account yet.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-lg font-extrabold text-black sm:text-xl">Select a child</h1>
      <p className="mt-1 text-sm text-black/60">Choose whose dashboard you want to see.</p>
      <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <li key={child.userId || child.studentId}>
            <button
              type="button"
              onClick={() => selectChild(child.userId)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            >
              <ChildAvatar child={child} size={48} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-black">{child.studentName}</span>
                {child.standardName && <span className="block truncate text-xs text-black/60">{child.standardName}</span>}
                {child.learningProgramName && <span className="block truncate text-xs text-black/50">{child.learningProgramName}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
