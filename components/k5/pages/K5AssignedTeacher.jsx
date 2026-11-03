"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, UserRoundCheck } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { K5_CARD, K5_PRIMARY_BTN, SubjectTile } from "@/components/k5/home/k5Bits";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getStudentCourseContent } from "@/services/dashboardApi";

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function initials(name) {
  return String(name || "?")
    .replace(/^(mr|ms|mrs|dr)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

/** The course's lessons, grouped by module and collapsible (mockup "teacher calendar" dialog). */
function CourseContentDialog({ course, onClose }) {
  const { context } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const themeProps = useK5ThemeProps(
    "flex max-h-[min(560px,calc(100vh-32px))] flex-col gap-0 overflow-hidden rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-0 text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[760px]",
  );
  const { data, isLoading } = useQuery({
    queryKey: ["student-course-content", schoolUUID, course.lmsUserId, course.lmsCourseId],
    queryFn: () => getStudentCourseContent({ schoolUUID, userId, lmsUserId: course.lmsUserId, lmsCourseId: course.lmsCourseId }),
    enabled: Boolean(schoolUUID && userId && course.lmsUserId),
  });
  const modules = asArray(data?.modules);
  const [closed, setClosed] = useState({});

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} {...themeProps}>
        <div className="flex items-center gap-3 bg-k5-vi px-5 py-3.5 text-white">
          <DialogTitle className="m-0 min-w-0 flex-1 font-k5-display text-[22px] font-semibold leading-tight">{course.courseName}</DialogTitle>
          <DialogDescription className="sr-only">Lessons and due dates for {course.courseName}</DialogDescription>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-k5-red text-xl font-black text-white">
            ×
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
          {isLoading ? (
            <p className="m-0 py-6 text-center font-k5-display text-xl font-semibold text-k5-mut">Loading…</p>
          ) : modules.length === 0 ? (
            <p className="m-0 rounded-[20px] bg-k5-soft px-4 py-7 text-center font-k5-display text-xl font-semibold text-k5-mut">No lessons here yet.</p>
          ) : (
            modules.map((module, index) => {
              const items = asArray(module.items);
              const open = !closed[index];
              return (
                <section key={index} className="overflow-hidden rounded-[22px] border-[3px] border-k5-line">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setClosed((c) => ({ ...c, [index]: open }))}
                    className="flex w-full cursor-pointer items-center gap-3 border-none bg-k5-vt px-3.5 py-2.5 text-start text-k5-ink"
                  >
                    <ChevronDown className={`h-5 w-5 flex-none transition-transform ${open ? "" : "-rotate-90"}`} strokeWidth={3} aria-hidden="true" />
                    <span className="min-w-0 flex-1 font-k5-display text-xl font-semibold">{module.moduleName}</span>
                    <span className="text-sm font-extrabold text-k5-mut">{items.length} {items.length === 1 ? "lesson" : "lessons"}</span>
                  </button>
                  {open &&
                    items.map((item, itemIndex) => (
                      <div key={itemIndex} className="flex items-center gap-3 border-t-2 border-k5-line px-3.5 py-2.5">
                        <span className="min-w-0 flex-1 font-k5-display text-lg font-semibold">{item.contentName}</span>
                        {item.dueDate && <span className="flex-none whitespace-nowrap rounded-full bg-k5-vt px-3 py-1.5 text-sm font-black">Due {item.dueDate}</span>}
                      </div>
                    ))}
                </section>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** K–5 look of "Syllabus & Assigned Teacher" (mockup My Assigned Teacher): one card per course. */
export function K5AssignedTeacher({ courses, isLoading }) {
  const [selected, setSelected] = useState(null);
  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-vt">
          <UserRoundCheck className="h-12 w-12 text-k5-vi" strokeWidth={2} aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">My Assigned Teacher</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">Your courses and the teacher for each one.</p>
        </div>
      </div>

      {isLoading ? (
        <p className="m-0 py-8 text-center font-k5-display text-2xl font-semibold text-k5-mut">Loading…</p>
      ) : courses.length === 0 ? (
        <p className={`${K5_CARD} m-0 p-8 text-center font-k5-display text-2xl font-semibold text-k5-mut`}>No courses yet.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {courses.map((course) => (
            <article key={course.coruseId} className={`${K5_CARD} flex flex-col gap-3.5 p-4`}>
              <div className="flex items-center gap-3">
                <SubjectTile name={course.courseName} />
                <h2 className="m-0 min-w-0 flex-1 font-k5-display text-[22px] font-semibold leading-[1.15]">{course.courseName}</h2>
              </div>
              <div className="flex items-center gap-2.5 rounded-full bg-k5-soft py-1.5 pl-1.5 pr-3">
                <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-k5-vi font-k5-display text-base font-semibold text-white">
                  {course.teacherName ? initials(course.teacherName) : "?"}
                </span>
                <span className="flex min-w-0 flex-col leading-tight">
                  <span className="text-[13px] font-black text-k5-vi">Your teacher</span>
                  <span className="truncate font-k5-display text-[17px] font-semibold">{course.teacherName || "Not picked yet"}</span>
                </span>
              </div>
              <button type="button" onClick={() => setSelected(course)} className={`${K5_PRIMARY_BTN} mt-auto min-h-[52px] justify-center bg-k5-vi pl-[18px] shadow-[0_4px_0_rgba(0,0,0,0.22)]`}>
                See my lessons
              </button>
            </article>
          ))}
        </div>
      )}

      {selected && <CourseContentDialog course={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
