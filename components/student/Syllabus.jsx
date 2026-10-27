"use client";

import { useState } from "react";
import { BookOpen, User } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAssignedTeacher } from "@/hooks/useStudentAssignedTeacher";
import { SyllabusCourseContentModal } from "@/components/student/SyllabusCourseContentModal";

/**
 * Syllabus & Assigned Teacher — legacy studentSyllabusAssignedTeacherContent.js.
 * ONE_TO_ONE students only; BATCH students use a separate legacy variant not
 * covered here (out of scope, same as re-enrollment being its own branch).
 */
export function Syllabus() {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, courses } = useStudentAssignedTeacher({ schoolUUID, userId });
  const [selected, setSelected] = useState(null);
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-center gap-2 px-1 pb-4">
        <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
        <h1 className="text-lg font-extrabold text-black sm:text-xl">Syllabus &amp; Assigned Teacher</h1>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-black/50">Loading…</p>
      ) : courses.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-black/50">
          No courses assigned yet.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {courses.map((course) => (
            <button
              key={course.coruseId}
              type="button"
              onClick={() => setSelected(course)}
              className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-primary/50 hover:shadow-sm"
            >
              <h2 className="font-extrabold text-black">{course.courseName}</h2>
              <div className="mt-2 flex items-center gap-1.5 text-sm text-black/60">
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{course.teacherName || "Not assigned yet"}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <SyllabusCourseContentModal course={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
