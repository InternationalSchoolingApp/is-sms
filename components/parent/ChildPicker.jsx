"use client";

import { GraduationCap } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { ChildAvatar } from "@/components/parent/ChildAvatar";
import { AddAnotherChildButton } from "@/components/parent/AddAnotherChildButton";
import { ParentAppInstallPrompt } from "@/components/parent/profile/ParentAppInstallPrompt";
import { firstName, gradeLabel } from "@/components/parent/childLabels";

/**
 * The parent's child picker, the first screen of the parent dashboard (legacy renderParentChildSelectionScreen):
 * "Hi {first name}, which dashboard would you like to open?", the number of linked children, and one card per child
 * (photo or initial, name, grade, "View Dashboard"). The whole card is the button. Choosing one opens that child's
 * dashboard (the choice is held in the page, not the URL). A parent with a single child skips it. Add Another Child
 * (when the school has it on) sits under the cards, and the app-install prompt may open here, as in legacy.
 */
export function ChildPicker() {
  const { context } = useDashboardContext();
  const { children, selectChild } = useSelectedChild();

  if (children.length === 0) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center">
        <h1 className="text-lg font-extrabold text-black sm:text-xl">No children found</h1>
        <p className="mt-2 text-sm text-black/60">There is no active child linked to this account yet.</p>
      </div>
    );
  }

  const parentName = firstName(context?.userName) || "there";

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="mt-4 text-center text-2xl font-bold text-slate-800 sm:text-3xl">
        Hi {parentName}, which dashboard would you like to open?
      </h1>
      <p className="mt-2 text-center text-base text-slate-600">
        You have <b>{children.length}</b> {children.length === 1 ? "child" : "children"} linked to this account. Pick one to continue.
      </p>

      <ul className="mt-8 flex flex-wrap justify-center gap-5">
        {children.map((child) => {
          const grade = gradeLabel(child.standardName);
          return (
            <li key={child.userId || child.studentId} className="w-full sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.85rem)] xl:w-[calc(25%-0.95rem)]">
              <button
                type="button"
                onClick={() => selectChild(child.userId)}
                className="flex h-full w-full items-center gap-4 rounded-xl bg-white p-4 text-left shadow-md transition-shadow hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary md:flex-col md:justify-center md:px-6 md:py-8 md:text-center"
              >
                <ChildAvatar child={child} size={80} />
                <span className="min-w-0 md:w-full">
                  <span className="block break-words text-lg font-bold leading-snug text-slate-800 md:text-2xl">{child.studentName}</span>
                  {grade && (
                    <span className="mt-1 inline-flex items-center gap-2 text-base text-slate-600">
                      <GraduationCap className="h-5 w-5 text-primary" aria-hidden="true" />
                      {grade}
                    </span>
                  )}
                  <span className="mt-2 block text-base font-semibold text-primary md:mt-3">View Dashboard</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex justify-center">
        <AddAnotherChildButton />
      </div>
      <ParentAppInstallPrompt />
    </div>
  );
}
