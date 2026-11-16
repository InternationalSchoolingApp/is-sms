"use client";

import { useMemo, useState } from "react";
import { BookOpen, Search } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAssignedTeacher } from "@/hooks/useStudentAssignedTeacher";
import { SyllabusCourseContentModal } from "@/components/student/SyllabusCourseContentModal";
import { TableFooter } from "@/components/student/TableFooter";
import { K5AssignedTeacher } from "@/components/k5/pages/K5AssignedTeacher";

const PAGE_SIZE = 10;

/**
 * Syllabus & Assigned Teacher — legacy studentSyllabusAssignedTeacherContent.js: "Assigned Course Teachers" table
 * (S.No, Selected Courses, Assigned Teacher) with a search box and 10 rows a page; a course name opens its calendar
 * (the lessons, each opening the LMS). ONE_TO_ONE students only; BATCH students use a separate legacy variant not
 * covered here (out of scope, same as re-enrollment being its own branch).
 */
export function Syllabus() {
  const { context, isK5 } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const { isLoading, courses } = useStudentAssignedTeacher({ schoolUUID, userId });
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);

  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return courses;
    return courses.filter((course) => `${course.courseName} ${course.teacherName || ""}`.toLowerCase().includes(needle));
  }, [courses, search]);
  const visible = matching.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (isK5) return <K5AssignedTeacher courses={courses} isLoading={isLoading} />;
  return (
    <div className="mx-auto w-full">
      <div className="rounded-[15px] border border-slate-200 bg-white py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" aria-hidden="true" />
            <h1 className="m-0 text-lg font-bold text-black sm:text-xl">Assigned Course Teachers</h1>
          </div>
          <label className="relative block w-full max-w-[260px]">
            <span className="sr-only">Search sessions</span>
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search sessions..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm text-black"
            />
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full whitespace-nowrap text-left text-sm text-black">
            <thead className="bg-primary text-white">
              <tr>
                <th className="py-3 pl-4 pr-3 font-normal">S.No</th>
                <th className="px-3 py-3 font-normal">Selected Courses</th>
                <th className="px-3 py-3 font-normal">Assigned Teacher</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-black/50">
                    Loading…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-black/50">
                    {courses.length === 0 ? "No courses assigned yet." : "No matching records found"}
                  </td>
                </tr>
              ) : (
                visible.map((course, index) => (
                  <tr key={course.coruseId ?? `${course.courseName}-${index}`} className="border-b border-slate-200">
                    <td className="py-3 pl-4 pr-3">{page * PAGE_SIZE + index + 1}</td>
                    <td className="px-3 py-3">
                      <button type="button" onClick={() => setSelected(course)} className="cursor-pointer border-none bg-transparent p-0 text-left font-semibold text-primary hover:underline">
                        {course.courseName}
                      </button>
                    </td>
                    <td className="px-3 py-3">{course.teacherName || "Not assigned yet"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && matching.length > 0 && <TableFooter page={page} pageSize={PAGE_SIZE} total={matching.length} onPageChange={setPage} />}
      </div>

      {selected && <SyllabusCourseContentModal course={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
