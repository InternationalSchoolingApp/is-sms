"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChevronDown, FileText, Folder, Search, UserRoundCheck, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { K5_CARD, SubjectIcon } from "@/components/k5/home/k5Bits";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { getStudentCourseContent } from "@/services/dashboardApi";
import { courseTint, subjectStyle } from "@/utils/k5Calendar";
import { hasDueDate, openLmsLesson } from "@/utils/lmsCourseLink";
import { K5Loading, K5Sk, K5TeacherSkeleton } from "@/components/k5/K5Skeletons";

function asArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function initials(name) {
  return String(name || "?")
    .replace(/^(mr|ms|mrs|dr)\.?\s+/i, "")
    .split(/\s+/)
    // a stray "." or "-" in the name is not a word ("Abhilasha ." is "A", not "A.")
    .filter((part) => /[\p{L}\p{N}]/u.test(part[0] || ""))
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

// "01.06 Southern Mysteries: ..." -> code "01.06" + title (mockup shows the lesson code above its title).
function splitLesson(name) {
  const match = String(name || "").match(/^(\d+(?:\.\d+)*)\s+(.*)$/);
  return match ? { code: match[1], title: match[2] } : { code: "", title: String(name || "") };
}

/** The course's lessons, grouped by module and collapsible (mockup "Course calendar" dialog), in the course's colour. */
function CourseContentDialog({ course, color, onClose }) {
  const { context, isMiddle, isHigh } = useDashboardContext();
  const { schoolUUID, userId } = context ?? {};
  const themeProps = useK5ThemeProps(
    "flex h-[560px] max-h-[min(560px,calc(100vh-32px))] flex-col gap-0 overflow-hidden rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-0 text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[760px]",
  );
  const { data, isLoading } = useQuery({
    queryKey: ["student-course-content", schoolUUID, course.lmsUserId, course.lmsCourseId],
    queryFn: () => getStudentCourseContent({ schoolUUID, userId, lmsUserId: course.lmsUserId, lmsCourseId: course.lmsCourseId }),
    enabled: Boolean(schoolUUID && userId && course.lmsUserId),
  });
  const modules = asArray(data?.modules);
  const [closed, setClosed] = useState({});
  const tint = courseTint(color);

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      {/* Grade 6–8: the dialog is 20px round (the shared skin would make it 18px); Grade 9–12: 12px. */}
      <DialogContent showCloseButton={false} {...themeProps} style={isHigh ? { borderRadius: 12 } : isMiddle ? { borderRadius: 20 } : undefined}>
        <div className="flex items-center gap-3 py-3.5 pl-5 pr-4 text-white" style={{ background: color }}>
          <DialogTitle className="m-0 min-w-0 flex-1 font-k5-display text-[22px] font-semibold leading-[1.2]">Course calendar: {course.courseName}</DialogTitle>
          <DialogDescription className="sr-only">Lessons and due dates for {course.courseName}</DialogDescription>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-[#D7263D] text-white">
            <X className="h-4 w-4" strokeWidth={3.5} aria-hidden="true" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-scroll overscroll-contain p-4">
          {isLoading ? (
            <K5Loading label="Getting your lessons" className="flex flex-col gap-3.5">
              <p className="m-0 text-center text-[15px] font-extrabold text-k5-mut">Getting your lessons… this can take a little while.</p>
              {[3, 2].map((rows, m) => (
                <div key={m} className="overflow-hidden rounded-[22px] border-[3px] border-k5-line">
                  <div className="flex items-center gap-3 bg-k5-soft px-3.5 py-2.5">
                    <K5Sk className="h-5 w-5 flex-none rounded-full" />
                    <K5Sk className="h-11 w-11 flex-none rounded-[14px]" />
                    <K5Sk className="h-5 flex-1" />
                    <K5Sk className="h-4 w-16" />
                  </div>
                  {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="flex items-center gap-3 border-t-2 border-k5-line px-3.5 py-2.5">
                      <K5Sk className="h-10 w-10 flex-none rounded-xl" />
                      <span className="flex flex-1 flex-col gap-1.5">
                        <K5Sk className="h-3 w-12" />
                        <K5Sk className="h-4 w-3/5" />
                      </span>
                      <K5Sk className="h-7 w-24 flex-none rounded-full" />
                    </div>
                  ))}
                </div>
              ))}
            </K5Loading>
          ) : modules.length === 0 ? (
            <p className="m-0 rounded-[20px] bg-k5-soft px-4 py-7 text-center font-k5-display text-xl font-semibold text-k5-mut" style={isHigh ? { borderRadius: 10 } : isMiddle ? { borderRadius: 14 } : undefined}>{data === null ? "Unable to load the course calendar." : "No course content found."}</p>
          ) : (
            modules.map((module, index) => {
              const items = asArray(module.items);
              const open = !closed[index];
              return (
                <section key={index} className="shrink-0 overflow-hidden rounded-[22px] border-[3px] border-k5-line">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => setClosed((c) => ({ ...c, [index]: open }))}
                    className="flex w-full cursor-pointer items-center gap-3 border-none px-3.5 py-2.5 text-start text-k5-ink"
                    style={{ background: tint }}
                  >
                    <ChevronDown className={`h-5 w-5 flex-none transition-transform ${open ? "" : "-rotate-90"}`} strokeWidth={3} aria-hidden="true" />
                    <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-k5-card">
                      <Folder className="h-6 w-6" style={{ color }} strokeWidth={2.2} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1 font-k5-display text-xl font-semibold">{module.moduleName}</span>
                    <span className="text-sm font-extrabold text-k5-mut">{items.length} {items.length === 1 ? "lesson" : "lessons"}</span>
                  </button>
                  {open && items.length === 0 && (
                    <div className="flex items-center gap-3 border-t-2 border-k5-line px-3.5 py-2.5 text-k5-mut" style={isMiddle ? { borderTopWidth: 1.5 } : undefined}>
                      <span className="min-w-0 flex-1 font-k5-display text-lg font-semibold">No content found</span>
                      <span className="flex-none whitespace-nowrap rounded-full bg-k5-soft px-3 py-1.5 text-sm font-black">N/A</span>
                    </div>
                  )}
                  {open &&
                    items.map((item, itemIndex) => {
                      const { code, title } = splitLesson(item.contentName);
                      return (
                        <button
                          key={itemIndex}
                          type="button"
                          onClick={() => openLmsLesson(item)}
                          className="flex w-full cursor-pointer items-center gap-3 border-x-0 border-b-0 border-t-2 border-solid border-k5-line bg-transparent px-3.5 py-2.5 text-start text-k5-ink"
                          style={isMiddle ? { borderTopWidth: 1.5 } : undefined}
                        >
                          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-k5-soft" style={isMiddle ? { borderRadius: 8 } : undefined}>
                            <FileText className="h-[22px] w-[22px]" style={{ color }} strokeWidth={2.2} aria-hidden="true" />
                          </span>
                          <span className="flex min-w-0 flex-1 flex-col leading-[1.2]">
                            {code && <span className="text-[13px] font-black text-k5-mut">{code}</span>}
                            <span className="font-k5-display text-lg font-semibold">{title}</span>
                          </span>
                          {hasDueDate(item.dueDate) ? (
                            <span className="flex-none whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-black text-k5-ink" style={{ background: tint }}>
                              Due {item.dueDate}
                            </span>
                          ) : (
                            <span className="flex-none whitespace-nowrap rounded-full bg-k5-soft px-3 py-1.5 text-sm font-black text-k5-mut">N/A</span>
                          )}
                        </button>
                      );
                    })}
                </section>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** K–5 look of "Syllabus & Assigned Teacher" (mockup My Assigned Teacher): one card per course, in the course's colour. */
const PAGE_SIZE = 9;

export function K5AssignedTeacher({ courses, isLoading }) {
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  // Legacy search box + paging of the course list.
  const matching = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? courses.filter((c) => `${c.courseName} ${c.teacherName || ""}`.toLowerCase().includes(needle)) : courses;
  }, [courses, search]);
  const pageCount = Math.max(1, Math.ceil(matching.length / PAGE_SIZE));
  const shown = matching.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const { isMiddle, isHigh } = useDashboardContext();
  usePicoContentReady(!isLoading);
  const colorFor = useK5CourseColors();
  // The colour the student already sees on the home plan; a course without one falls back to its subject colour.
  const colorOf = (course) => colorFor({ id: course.coruseId, name: course.courseName }) || subjectStyle(course.courseName).color;

  return (
    <div className="flex flex-col gap-4">
      {isMiddle ? (
        // Grade 6–8 (Middle.dc.html): no card around the title — a 62px accent tile, a 30px heading.
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex h-[62px] w-[62px] flex-none items-center justify-center rounded-[14px] bg-k5-act" style={{ borderRadius: isHigh ? 10 : 14 }}>
            <UserRoundCheck className="h-[34px] w-[34px] text-k5-ac" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
            <h1 className="m-0 font-k5-display text-[30px] font-semibold leading-[1.05]">My Assigned Teacher</h1>
            <p className="m-0 text-base font-extrabold text-k5-mut">Your courses and the teacher for each one</p>
          </div>
        </div>
      ) : (
        <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
          <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-vt">
            <UserRoundCheck className="h-12 w-12 text-k5-vi" strokeWidth={2} aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
            <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">My Assigned Teacher</h1>
            <p className="m-0 text-lg font-extrabold text-k5-mut">Your courses and the teacher for each one</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <K5TeacherSkeleton />
      ) : courses.length === 0 ? (
        <p className={`${K5_CARD} m-0 p-8 text-center font-k5-display text-2xl font-semibold text-k5-mut`}>No courses yet.</p>
      ) : (
        <>
          <label className="relative block max-w-sm">
            <span className="sr-only">Search courses</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-k5-mut" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search courses..."
              className="min-h-12 w-full rounded-full border-[3px] border-k5-line bg-k5-card py-0 pl-11 pr-4 font-k5-body text-base font-extrabold text-k5-ink"
            />
          </label>
          {matching.length === 0 && <p className={`${K5_CARD} m-0 p-6 text-center font-k5-display text-xl font-semibold text-k5-mut`}>No matching courses.</p>}
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
          {shown.map((course) => {
            const color = colorOf(course);
            return (
              <article key={course.coruseId} className={`${K5_CARD} flex flex-col gap-3.5 p-4`}>
                <div className="flex items-center gap-3">
                  <span className="flex h-[60px] w-[60px] flex-none items-center justify-center rounded-[18px]" style={{ background: courseTint(color) }}>
                    <span style={{ color }} className="flex">
                      <SubjectIcon name={course.courseName} className="h-8 w-8" />
                    </span>
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <h2 className="m-0 font-k5-display text-[22px] font-semibold leading-[1.15] text-k5-ink">{course.courseName}</h2>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-full bg-k5-soft py-1.5 pl-1.5 pr-3">
                  <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-k5-vi font-k5-display text-base font-semibold text-white" style={isMiddle ? { background: color } : undefined}>
                    {course.teacherName ? initials(course.teacherName) : "?"}
                  </span>
                  <span className="flex min-w-0 flex-col leading-[1.2]">
                    <span className="text-[13px] font-black text-[var(--k5-vX)]">Your teacher</span>
                    <span className="font-k5-display text-[17px] font-semibold text-k5-ink">{course.teacherName || "Not picked yet"}</span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected({ course, color })}
                  className={`mt-auto flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-full border-none font-k5-display text-lg font-semibold text-white ${isMiddle ? "shadow-none" : "shadow-[0_4px_0_rgba(0,0,0,0.22)]"}`}
                  style={{ background: color }}
                >
                  <CalendarDays className="h-[22px] w-[22px]" strokeWidth={2.4} aria-hidden="true" />
                  See course calendar
                </button>
              </article>
            );
          })}
        </div>
          {pageCount > 1 && (
            <nav aria-label="Courses pages" className="flex flex-wrap items-center justify-center gap-3">
              <button type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-50">
                Previous
              </button>
              <span className="font-k5-display text-base font-semibold text-k5-mut">
                Page {page + 1} of {pageCount}
              </span>
              <button type="button" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)} className="min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-base font-semibold text-k5-ink disabled:cursor-default disabled:opacity-50">
                Next
              </button>
            </nav>
          )}
        </>
      )}

      {selected && <CourseContentDialog course={selected.course} color={selected.color} onClose={() => setSelected(null)} />}
    </div>
  );
}
