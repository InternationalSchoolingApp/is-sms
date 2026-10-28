"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarModal } from "@/components/dashboard/calendar/CalendarModal";
import { getAssignedTeachersForAllCourses } from "@/services/bookClassApi";

/**
 * "All Courses" card (subjectId 0: some elementary standards and SSP) — legacy
 * bookingSlotModalForElementry: the student first picks a course, then the
 * normal per-course slot flow runs for it.
 */
export function AllCoursesPickerModal({ studentStandardId, onPick, onClose }) {
  const [subjectId, setSubjectId] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["book-class-all-courses", studentStandardId],
    queryFn: () => getAssignedTeachersForAllCourses({ studentStandardId }),
    staleTime: 0,
  });
  const list = data?.studentSubjectList ?? [];
  const singleTeacher = new Set(list.map((s) => s.assignedTeacherUserId)).size === 1;
  const picked = list.find((s) => String(s.subjectId) === String(subjectId));

  return (
    <CalendarModal title={singleTeacher && list[0] ? `Book a Class with ${list[0].teacherName}` : "Book a Class"} onClose={onClose}>
      {isLoading ? (
        <p className="py-4 text-center text-black/50">Loading…</p>
      ) : list.length === 0 ? (
        <p className="py-4 text-center text-black/60">You do not have a teacher assigned yet</p>
      ) : (
        <>
          <select
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-black"
          >
            <option value="">Select Course*</option>
            {list.map((s) => (
              <option key={s.subjectId} value={s.subjectId}>
                {singleTeacher ? s.subjectName : `${s.subjectName} | ${s.teacherName}`}
              </option>
            ))}
          </select>
          <div className="flex justify-end pt-3">
            <button
              type="button"
              disabled={!picked}
              onClick={() => onPick({ subjectId: picked.subjectId, name: picked.subjectName, studentStandardId })}
              className="rounded-lg bg-primary px-4 py-2 font-bold text-white disabled:opacity-40"
            >
              View Available Slots
            </button>
          </div>
        </>
      )}
    </CalendarModal>
  );
}
