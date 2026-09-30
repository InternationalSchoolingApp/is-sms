"use client";

import { useState } from "react";
import { BookOpen, GraduationCap } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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
  // Display-only split of the same `courses` array — grouping mandatory
  // courses into their own section, matching the reference design. Neither
  // list is a new data source; `checked`/`toggle`/`handleConfirm` are
  // unchanged and still operate over the full `courses` array.
  const mandatoryCourses = courses.filter(isMandatory);
  const optionalCourses = courses.filter((course) => !isMandatory(course));

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
      <DialogContent className="sm:max-w-lg p-0">
        <DialogHeader className="gap-0 border-b py-2  px-4">
          <DialogTitle className="text-lg">Recommended Courses</DialogTitle>
          {data?.gradeName && <p className="text-sm text-slate-500">{data.gradeName}</p>}
        </DialogHeader>
        <div className="w-full px-4">
          <div className="flex items-center gap-3 rounded-lg bg-[#eef4ff] px-4 py-3 mb-5 border border-primary">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div className="inline-flex flex-col">
                <p className="flex-1 text-sm font-bold text-black-900">Total Credits</p>
                <p className="flex-1 text-xs text-black-900">Including all recommended courses</p>
            </div>
            <span className="flex h-8 w-8 ml-auto shrink-0 items-center justify-center rounded-md bg-[#d8e4fb] text-black-900 text-2xl font-bold">
              {totalCredit}
            </span>
          </div>

          {mandatoryCourses.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-semibold text-black-900">Mandatory Courses ({mandatoryCourses.length})</p>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {mandatoryCourses.map((course) => (
                  <li key={course.subjectId} className="flex items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-primary">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div className="inline-flex flex-col">
                        <span className="flex-1 font-bold text-black-900">{course.subjectName}</span>
                        <span className="shrink-0 text-xs text-slate-500">{course.subjectCredit} Credit</span>
                      </div>
                    <span className="shrink-0 rounded-md bg-emerald-50 px-2 py-1 text-center text-xs font-semibold text-emerald-700">
                      Mandatory
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {optionalCourses.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-black-900">We recommend these courses for {data?.gradeName}</p>
                <Button type="button" size="sm" onClick={toggleAll} className="rounded-md bg-primary hover:bg-primary/90">
                  {allOptionalChecked ? "Remove All" : "+ Add All"}
                </Button>
              </div>
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200">
                {optionalCourses.map((course) => {
                  const id = String(course.subjectId);
                  const selected = checked.has(id);
                  return (
                    <li key={id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef4ff] text-primary">
                        <BookOpen className="h-4 w-4" />
                      </span>
                      <div className="inline-flex flex-col">
                        <span className="flex-1 font-bold text-black-900">{course.subjectName}</span>
                        <span className="shrink-0 text-xs text-slate-500">{course.subjectCredit} Credit</span>
                      </div>
                      <Checkbox className="ml-auto" checked={selected} onCheckedChange={() => toggle(id)} />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <strong>Note:</strong> selecting courses above updates your Recommended Courses list for this grade — any other
            course you already picked stays in your selection.
          </p>
        
          <DialogFooter className="sm:justify-center">
            <Button type="button" onClick={handleConfirm} disabled={busy} className="rounded-md bg-primary px-10 hover:bg-primary/90">
              {busy ? "Please wait…" : "Confirm"}
            </Button>
          </DialogFooter>
        </div>  
      </DialogContent>
    </Dialog>
  );
}
