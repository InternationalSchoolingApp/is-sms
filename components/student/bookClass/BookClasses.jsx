"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { CalendarPlus, Info } from "lucide-react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getBookAClassStatus, getStudentBookClassDetails } from "@/services/bookClassApi";
import { getBrowserTimezone } from "@/utils/calendarEvents";
import { studentNavHref } from "@/utils/dashboardNav";
import { BookClassSlotModal } from "@/components/student/bookClass/BookClassSlotModal";
import { AllCoursesPickerModal } from "@/components/student/bookClass/AllCoursesPickerModal";
import { BookedClasses } from "@/components/student/bookClass/BookedClasses";

function PageTitle() {
  return (
    <div className="flex items-center gap-2 px-1 pb-4">
      <CalendarPlus className="h-5 w-5 text-primary" aria-hidden="true" />
      <h1 className="text-lg font-extrabold text-black sm:text-xl">Book a Class</h1>
    </div>
  );
}

function Notice({ children }) {
  return (
    <div className="mx-auto w-full">
      <PageTitle />
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-lg font-bold text-primary">{children}</div>
    </div>
  );
}

function Count({ label, value, className }) {
  return (
    <span className="text-sm font-semibold text-black">
      {label}: <span className={`ml-1 rounded px-2 py-0.5 text-white ${className}`}>{value}</span>
    </span>
  );
}

/**
 * Book Classes (sidebar pageLink `book-a-session`) — legacy renderBookClassContent
 * in studentBookClassContent.js: entry gate, complimentary-class summary, course
 * list, the selected course's counts, and the weekly booking / booked-classes flows.
 */
export function BookClasses() {
  const { context } = useDashboardContext();
  const { school } = useParams();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState("book");
  const [slotCourse, setSlotCourse] = useState(null);
  const [pickAllCourses, setPickAllCourses] = useState(false);

  const statusQuery = useQuery({
    queryKey: ["book-a-class", context?.userId],
    queryFn: () => getBookAClassStatus({ userTimezone: getBrowserTimezone() }),
    enabled: Boolean(context?.userId),
    staleTime: 0,
  });
  const gate = statusQuery.data;
  const studentStandardId = gate?.details?.studentStandardId;

  const detailsQuery = useQuery({
    queryKey: ["book-class-details", studentStandardId],
    queryFn: () => getStudentBookClassDetails({ studentStandardId }),
    enabled: Boolean(studentStandardId) && gate?.details?.showAcademicYearValidation !== "Y",
    staleTime: 0,
  });
  const details = detailsQuery.data;
  const subjects = details?.subjectList ?? [];
  const course = subjects.find((s) => s.subjectId === selectedId) ?? subjects[0];

  function startBooking(target) {
    if (!target.teacherName) {
      toast.error("You do not have a teacher assigned yet");
      return;
    }
    if (target.weekLeftClass < 1) {
      toast.error("You have booked all your classes for this week");
      return;
    }
    if (target.subjectId === 0) setPickAllCourses(true);
    else setSlotCourse(target);
  }

  function handleBooked() {
    setSlotCourse(null);
    queryClient.invalidateQueries({ queryKey: ["book-class-details"] });
    queryClient.invalidateQueries({ queryKey: ["booked-classes"] });
  }

  if (!context || statusQuery.isLoading || (studentStandardId && detailsQuery.isLoading)) {
    return <Notice>Loading…</Notice>;
  }
  if (!gate) return <Notice>Unable to load your classes right now. Please try again.</Notice>;
  if (gate.statusCode === "AY_NOT_STARTED") return <Notice>{gate.message}</Notice>;
  if (gate.statusCode === "BUY_A_CLASS") {
    return (
      <Notice>
        Oops! Looks like you haven&apos;t purchased a class yet.
        <br />
        <Link href={studentNavHref(school, "student-addon")} className="mt-3 inline-block rounded-lg bg-primary px-4 py-2 text-base text-white">
          Go to Buy Extra Classes
        </Link>
      </Notice>
    );
  }
  if (gate.details?.showAcademicYearValidation === "Y") {
    return <Notice>Your academic year has not started yet. You will be able to book your classes once your academic year starts</Notice>;
  }
  if (!details || !course) return <Notice>Unable to load your classes right now. Please try again.</Notice>;

  const modals = (
    <>
      {slotCourse && <BookClassSlotModal course={slotCourse} onClose={() => setSlotCourse(null)} onBooked={handleBooked} />}
      {pickAllCourses && (
        <AllCoursesPickerModal
          studentStandardId={course.studentStandardId}
          onClose={() => setPickAllCourses(false)}
          onPick={(picked) => {
            setPickAllCourses(false);
            setSlotCourse(picked);
          }}
        />
      )}
    </>
  );

  if (view === "booked") {
    return (
      <>
        <BookedClasses course={course} onBack={() => setView("book")} onBook={() => startBooking(course)} />
        {modals}
      </>
    );
  }

  const year = details.classData?.year?.[0] ?? {};
  const weekCounts = details.classData?.week?.[0] ?? {};
  const classPlanCount = details.compClassPerweek;
  const allCourses = subjects[0]?.name === "All Courses";

  return (
    <div className="mx-auto w-full">
      <PageTitle />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
          {year.comp > 0 && (
            <div className="rounded-xl bg-primary p-4 text-center text-white">
              <h2 className="text-lg font-bold">Your Complimentary Classes</h2>
              <div className="mt-2 flex justify-between"><span>For 42 weeks</span><span className="text-xl font-bold">{details.compClassYear}</span></div>
              {weekCounts.comp > 0 && (
                <div className="flex justify-between"><span>per week</span><span className="text-xl font-bold">{details.compClassPerweek}</span></div>
              )}
            </div>
          )}
          <h3 className="font-semibold text-black">
            {subjects.length === 1 ? "Your Selected Course" : allCourses ? `Your ${subjects.length} Selected Courses` : "Your Selected Courses"}
          </h3>
          <ul className="space-y-2">
            {subjects.map((s) => {
              const active = s.subjectId === course.subjectId;
              return (
                <li key={s.subjectId}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(s.subjectId)}
                    className={`w-full rounded-lg border p-2 ${active ? "border-primary bg-primary text-white" : "border-slate-200 text-black hover:border-primary/50"}`}
                  >
                    <span className="mb-2 block text-center text-sm font-semibold">{s.name}</span>
                    <span className="flex flex-wrap items-center justify-between text-xs">
                      <span>Total: <b className={active ? "" : "text-primary"}>{s.total}</b></span>
                      <span>Booked: <b className={active ? "" : "text-green-600"}>{s.booked}</b></span>
                      <span>Expired: <b className={active ? "" : "text-red-600"}>{s.expired}</b></span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-1 font-semibold text-black">
              <Info className="h-4 w-4" aria-hidden="true" /> Class Booking Instructions
            </h2>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-black">
              <li>Weekly Class Structure: Monday to Friday</li>
              <li>
                You can book {weekCounts.comp > 0 ? classPlanCount : weekCounts.extra}
                {classPlanCount > 0 ? " complimentary" : ""} classes in a week.
              </li>
              {classPlanCount > 0 && <li>Unbooked complimentary classes will expire at the end of week.</li>}
            </ol>
          </div>

          <h2 className="px-1 font-semibold text-black">Book Classes for this week</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            {course.img && <img src={course.img} alt="" className="h-40 w-full rounded-xl object-cover" />}
            <h3 className="my-3 font-semibold text-black">{course.name}</h3>
            <div className="flex flex-wrap gap-3">
              <Count label="Left" value={course.left} className="bg-amber-500" />
              <Count label="Missed by You" value={course.missedByYou} className="bg-black" />
              <Count label="Missed by Teacher" value={course.missedByTeacher} className="bg-pink-600" />
              <Count label="Rescheduled" value={course.rescheduled} className="bg-orange-500" />
              <Count label="Completed" value={course.completed} className="bg-violet-600" />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" onClick={() => setView("booked")} className="flex-1 rounded-lg bg-primary px-4 py-2 font-bold text-white">
                Booked Classes
              </button>
              <button
                type="button"
                onClick={() => startBooking(course)}
                title={
                  course.weekLeftClass < 1
                    ? "You have booked all your classes for this week"
                    : course.assignedTeacherCount === 1 && course.teacherName
                      ? `Book a class with ${course.teacherName}`
                      : "Book a class"
                }
                className={`flex-1 rounded-lg border px-4 py-2 font-bold ${course.weekLeftClass < 1 ? "border-black text-black" : "border-primary text-primary"}`}
              >
                Book a Class ({course.weekLeftClass})
              </button>
            </div>
          </div>
        </div>
      </div>
      {modals}
    </div>
  );
}
