"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Recommended-courses picker, mirroring recommendedCourseModalContent() /
 * chooseRecomendedCourse() in the legacy signup JS. Mandatory courses are
 * always included; already-selected ones start checked.
 *
 * On confirm, the recommended toggles are merged into the current selection:
 * non-recommended courses the student already picked are kept. (Legacy
 * computes this same merge, then overwrites it with only the recommended
 * list on the next line, dropping any other selected course.)
 */
export function RecommendedCoursesDialog({ data, selectedIds, onClose, onConfirm, busy }) {
  const courses = data?.recommendedCourses || [];
  const isMandatory = (course) => course.courseMandatory === 1;

  const [checked, setChecked] = useState(
    () =>
      new Set(
        courses
          .filter((course) => isMandatory(course) || selectedIds.includes(String(course.subjectId)))
          .map((course) => String(course.subjectId))
      )
  );

  const optionalIds = courses.filter((course) => !isMandatory(course)).map((course) => String(course.subjectId));
  const allOptionalChecked = optionalIds.length > 0 && optionalIds.every((id) => checked.has(id));
  const totalCredit = courses.reduce((sum, course) => sum + (parseFloat(course.subjectCredit) || 0), 0);

  function toggle(id) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setChecked((prev) => {
      const next = new Set(prev);
      optionalIds.forEach((id) => (allOptionalChecked ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function handleConfirm() {
    const recommendedIds = new Set(courses.map((course) => String(course.subjectId)));
    const kept = selectedIds.filter((id) => !recommendedIds.has(id));
    onConfirm([...kept, ...checked]);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">Recommended courses</DialogTitle>
          {data?.gradeName && <p className="text-sm text-slate-500">{data.gradeName}</p>}
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-800">We recommend these courses for {data?.gradeName}</p>
          {optionalIds.length > 0 && (
            <Button type="button" size="sm" variant="outline" onClick={toggleAll}>
              {allOptionalChecked ? "Remove all" : "Add all"}
            </Button>
          )}
        </div>

        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
          {courses.map((course, index) => {
            const id = String(course.subjectId);
            const selected = checked.has(id);
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2 text-sm">
                <span className="w-5 shrink-0 text-slate-400">{index + 1}.</span>
                <span className="flex-1 text-slate-800">{course.subjectName}</span>
                <span className="shrink-0 text-xs text-slate-500">{course.subjectCredit} credit</span>
                {isMandatory(course) ? (
                  <span className="w-20 shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-center text-xs font-semibold text-emerald-700">
                    Mandatory
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant={selected ? "destructive" : "outline"}
                    className="w-20 shrink-0"
                    onClick={() => toggle(id)}
                  >
                    {selected ? "Remove" : "Add"}
                  </Button>
                )}
              </li>
            );
          })}
          <li className="flex items-center gap-3 px-3 py-2 text-sm font-semibold">
            <span className="w-5 shrink-0" />
            <span className="flex-1">Total credit</span>
            <span className="shrink-0">{totalCredit}</span>
            <span className="w-20 shrink-0" />
          </li>
        </ul>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={busy}>
            {busy ? "Please wait…" : "Confirm & add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
