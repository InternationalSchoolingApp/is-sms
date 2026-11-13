"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { useQueries } from "@tanstack/react-query"; // course-wise table (commented out below)
import toast from "react-hot-toast";
import { addDays, format, isValid, startOfDay, startOfWeek } from "date-fns";
import { Check, ChevronDown, ChevronLeft, Info, Volume2 } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { K5_CARD, SubjectIcon } from "@/components/k5/home/k5Bits";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { BUDDIES } from "@/constant/appearance";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { getAssignedTeacherForCourse, getAssignedTeachersForAllCourses, getClassCalculationForGrownUps, getStudentBookedClasses, getTeacherWeeklySlots, submitBookClassSlot } from "@/services/bookClassApi";
import { getSlotEnd, getSlotState } from "@/utils/bookClass";
import { courseTint, subjectStyle } from "@/utils/k5Calendar";
import { K5Loading, K5CardsSkeleton, K5Sk } from "@/components/k5/K5Skeletons";

const MAX_TICKETS = 10;
const BOOK_SAY = "This is where you book classes! Each ticket is one class with a teacher.";
// Wording per look: the Grade 6–8 mockup talks about "classes" and "select", the K–5 one about tickets and "pick".
const COPY = {
  k5: {
    sub: "Pick a course, a day and a time. That's it!",
    tickets: "My class tickets",
    steps: ["Pick a course", "Pick a day", "Pick a time"],
    any: "Every course is open. Pick any one you like!",
    pickMe: "Pick me!",
    say: BOOK_SAY,
    say2: "Great choice! Now pick a day.",
    say3: (name) => "Now pick a time when " + name + " is free.",
    sayAll: "Wow, you used all your tickets this week!",
    allTitle: "All your tickets are used!",
    allSub: "Super job! New tickets come on Monday.",
    noLeft: "No tickets left",
  },
  // Grade 9–12 (High.dc.html): classes are bought, so there are no weekly free classes and nothing expires on Friday.
  high: {
    sub: "Select a course, a day and a time. That's it!",
    tickets: "My classes",
    steps: ["Select a course", "Select a day", "Select a time"],
    any: "Only the courses you bought classes for are shown.",
    pickMe: "Book a class",
    say: "This is where you book classes! Each class is with your teacher.",
    say2: "Great choice! Now select a day.",
    say3: () => "Now select a time.",
    sayAll: "You booked all the classes you bought!",
    allTitle: "All your classes are booked!",
    allSub: "Buy extra classes to book more.",
    noLeft: "No classes left",
    fly: "Unused classes carry forward.",
    bookedN: (n) => n + " booked",
  },
  middle: {
    sub: "Select a course, a day and a time. That's it!",
    tickets: "My classes",
    steps: ["Select a course", "Select a day", "Select a time"],
    any: "Every course is open. Select any one you like!",
    pickMe: "Book a class",
    say: "This is where you book classes! Each class is with your teacher.",
    say2: "Great choice! Now select a day.",
    say3: () => "Now select a time.",
    sayAll: "Wow, you booked all your classes this week!",
    allTitle: "All your classes are booked!",
    allSub: "Super job! New classes come on Monday.",
    noLeft: "No classes left",
  },
};
function useCopy() {
  const { isMiddle, isHigh } = useDashboardContext();
  return { middle: Boolean(isMiddle), high: Boolean(isHigh), copy: isHigh ? COPY.high : isMiddle ? COPY.middle : COPY.k5 };
}
const UNKNOWN_OUTCOME =
  "We could not confirm whether your class was booked. Please refresh the page and check your booked classes before trying again.";
const TICKET_PATH = "M8 3h48a5 5 0 0 1 5 5v7a5 5 0 0 0 0 10v7a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-7a5 5 0 0 0 0-10V8a5 5 0 0 1 5-5z";
const STAR_PATH = "M10 1l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.4 4.8 17.2l1-5.9L1.5 7.2l5.9-.8z";
const CHECK_PATH = "M5 12l5 5 9-10";

const firstName = (name) => String(name || "").replace(/^(mr|ms|mrs|dr)\.?\s+/i, "").split(/\s+/)[0] || "your teacher";
const initialsOf = (name) =>
  String(name || "?")
    .replace(/^(mr|ms|mrs|dr)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
// "03:00 PM" -> "3:00 PM" (mockup time style).
const niceTime = (value) => String(value || "").replace(/^0/, "");

function TeacherChip({ name }) {
  return (
    <span className="mt-1.5 flex items-center gap-2.5 self-start rounded-full bg-k5-vt py-1 pl-1 pr-3.5">
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-k5-vi font-k5-display text-[15px] font-semibold text-white">{name ? initialsOf(name) : "?"}</span>
      <span className="flex flex-col leading-[1.15]">
        <span className="text-xs font-black text-[var(--k5-vX)]">Your teacher</span>
        <span className="font-k5-display text-[17px] font-semibold">{name || "Not picked yet"}</span>
      </span>
    </span>
  );
}

/** The mockup calendar-with-a-ticket picture. */
function BookArt({ tall = false }) {
  return (
    <svg width="96" height={tall ? 96 : 84} viewBox={tall ? "0 0 96 96" : "0 0 96 84"} aria-hidden="true" className="flex-none">
      <rect x="8" y="14" width="64" height="62" rx="12" style={{ fill: "var(--k5-card)", stroke: "var(--k5-ink)" }} strokeWidth="3.5" />
      <path d="M8 26a12 12 0 0 1 12-12h40a12 12 0 0 1 12 12v8H8z" style={{ fill: "var(--k5-ac)", stroke: "var(--k5-ink)" }} strokeWidth="3.5" />
      <path d="M26 8v12M54 8v12" style={{ stroke: "var(--k5-ink)" }} strokeWidth="5" strokeLinecap="round" />
      <circle cx="25" cy="48" r="5" style={{ fill: "var(--k5-line)" }} />
      <circle cx="40" cy="48" r="5" style={{ fill: "var(--k5-line)" }} />
      <circle cx="55" cy="48" r="5" style={{ fill: "var(--k5-line)" }} />
      <circle cx="25" cy="62" r="5" style={{ fill: "var(--k5-line)" }} />
      <g transform="translate(40 50) rotate(-14)">
        <path d={TICKET_PATH} transform="scale(0.78)" fill="#FFC531" style={{ stroke: "var(--k5-ink)" }} strokeWidth="4" />
        <path d={STAR_PATH} transform="translate(16 7) scale(0.9)" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

function BookHeader({ teacherName, onStart, startLabel, startLoading = false }) {
  const { middle, high, copy } = useCopy();
  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      {high ? (
        <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-[12px] bg-k5-act">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" style={{ stroke: "var(--k5-ac)" }}>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" />
            <path d="M9 15.5l2 2 4-4" />
          </svg>
        </span>
      ) : (
        <span className={`flex flex-none items-center justify-center ${middle ? "h-24 w-24" : "h-[84px] w-[84px]"}`}>
          <BookArt tall={middle} />
        </span>
      )}
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Book a Class</h1>
        <p className="k5h-b-sub m-0 text-lg font-extrabold text-k5-mut">{copy.sub}</p>
        {/* Grade 6–8: no teacher chip here (each course card names its teacher); a "Book a Class (n)" button instead. */}
        {!middle && teacherName !== undefined && <TeacherChip name={teacherName} />}
        {middle && startLoading && (
          <div className="mt-1.5">
            <K5Sk className="h-[46px] w-44 rounded-full" />
          </div>
        )}
        {middle && onStart && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onStart}
              className="min-h-[46px] cursor-pointer whitespace-nowrap rounded-full border-none bg-k5-ac px-[18px] py-1.5 font-k5-display text-[17px] font-semibold text-white shadow-[0_4px_0_var(--k5-acd)]"
            >
              {startLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Centered message card for the gate states (loading, not started, buy a class, ...). */
export function K5BookNotice({ loading = false, children }) {
  if (loading) return <BookPageSkeleton />;
  return (
    <div className="flex flex-col gap-4">
      <BookHeader />
      <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold`}>{children}</div>
    </div>
  );
}

/**
 * The Book a Class page while its numbers load, laid out exactly like the page: the header and the tickets side by
 * side, "Good to know" (Grade 6–8), then the steps card (buddy, step pills, heading, course cards) and the
 * grown-ups / Class Breakdown bar — so nothing jumps when the data arrives.
 */
function BookPageSkeleton() {
  const { middle, high } = useCopy();
  return (
    <K5Loading label="Loading your classes" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex-[1_1_340px]">
          <BookHeader startLoading />
        </div>
        <section
          className="flex flex-[1_1_400px] flex-col gap-2.5 rounded-[26px] bg-k5-yt px-5 py-4"
          style={high ? { background: "var(--k5-act)", border: "none", borderRadius: 12 } : middle ? { background: "color-mix(in srgb, var(--k5-ac) 13%, var(--k5-card))", border: "1.5px solid color-mix(in srgb, var(--k5-ac) 28%, var(--k5-card))", borderRadius: 18 } : undefined}
        >
          <K5Sk className="h-7 w-36" />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-white/45 px-2.5 py-2">
            <span className="flex min-w-[104px] flex-col gap-1.5">
              <K5Sk className="h-4 w-20" />
              <K5Sk className="h-3 w-14" />
            </span>
            <span className="flex flex-wrap gap-2">
              {Array.from({ length: 5 }, (_, i) => (
                <K5Sk key={i} className={middle ? "h-10 w-10 rounded-[9px]" : "h-[45px] w-[72px] rounded-lg"} />
              ))}
            </span>
            <K5Sk className="ms-auto h-8 w-20 rounded-full" />
          </div>
          <K5Sk className="h-5 w-44" />
        </section>
      </div>

      {middle && (
        <div className={`${K5_CARD} flex flex-col gap-2.5 px-5 py-4`}>
          <K5Sk className="h-6 w-40" />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-3 py-2.5" style={{ borderRadius: high ? 10 : 14 }}>
                <K5Sk className="h-[52px] w-[52px] flex-none rounded-xl" />
                <span className="flex flex-1 flex-col gap-2">
                  <K5Sk className="h-4 w-full" />
                  <K5Sk className="h-4 w-2/3" />
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <section className={`${K5_CARD} flex flex-col gap-[18px] px-[22px] py-5`}>
        <K5Sk className="h-16 w-full rounded-[22px]" />
        <div className="flex flex-wrap items-center gap-2.5">
          {Array.from({ length: 3 }, (_, i) => (
            <K5Sk key={i} className="h-12 w-40 rounded-full" />
          ))}
        </div>
        <div className="flex flex-col gap-2">
          <K5Sk className="h-3.5 w-20" />
          <K5Sk className="h-8 w-56" />
          <K5Sk className="h-4 w-80 max-w-full" />
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex flex-col gap-2">
              <div className="k5h-b-scard-sk flex min-h-[200px] flex-col items-center gap-2.5 rounded-3xl border-[3px] border-k5-line px-3 pb-3.5 pt-4" style={high ? { borderRadius: 12 } : middle ? { borderRadius: 16 } : undefined}>
                <K5Sk className="k5h-b-stile h-[72px] w-[72px] rounded-[22px]" />
                <K5Sk className="h-5 w-4/5" />
                <K5Sk className="h-3.5 w-3/5" />
                <K5Sk className="mt-auto h-9 w-32 rounded-full" />
              </div>
              {middle && <K5Sk className="h-10 w-full rounded-full" />}
            </div>
          ))}
        </div>
      </section>

      <div className={`${K5_CARD} flex items-center gap-3 px-[18px] py-3.5`}>
        <K5Sk className="h-12 w-12 flex-none rounded-2xl" />
        <div className="flex flex-1 flex-col gap-2">
          <K5Sk className="h-5 w-40" />
          <K5Sk className="h-3.5 w-56" />
        </div>
        <K5Sk className="h-10 w-24 rounded-full" />
      </div>
    </K5Loading>
  );
}

/** The student buddy says what to do on this step (mockup: Booky); tap the speaker to hear it. */
function BuddyStrip({ say }) {
  const { preferences } = useAppearance();
  const { speak } = useSpeech();
  const buddy = BUDDIES[preferences.buddy] || BUDDIES.pico;
  return (
    <div role="status" className="flex items-center gap-3 rounded-[22px] bg-k5-vt py-2 pl-2 pr-2.5">
      <PicoMascot buddy={preferences.buddy} width={48} full={false} />
      <p className="m-0 min-w-0 flex-1 font-k5-display text-[19px] font-medium leading-[1.3]">
        <span className="font-semibold text-[var(--k5-vX)]">{buddy.name}: </span>
        {say}
      </p>
      <button
        type="button"
        onClick={() => speak(say, { force: true })}
        aria-label="Hear it"
        className="k5h-b-bud-btn flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-acx"
      >
        <Volume2 className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

function TicketSvg({ used, color }) {
  return (
    <svg width="72" height="45" viewBox="0 0 64 40" aria-hidden="true">
      <path d={TICKET_PATH} style={{ fill: used ? color : "var(--k5-card)", stroke: used ? color : "var(--k5-ac)", strokeDasharray: used ? "none" : "5 4" }} strokeWidth="2.5" />
      <path d="M22 7v26" style={{ stroke: used ? "#FFFFFF" : "var(--k5-line)" }} strokeWidth="2" strokeDasharray="3 3" />
      {used ? (
        <path d="M33 20l5 5 10-10" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d={STAR_PATH} transform="translate(30 10)" style={{ fill: "var(--k5-yI)" }} />
      )}
    </svg>
  );
}

// Grade 6–8 ticket: a 40px rounded square — a graduation cap on a dashed outline, or filled with a tick once used.
function CapTile({ used }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <rect x="2" y="2" width="36" height="36" rx="9" strokeWidth="2.5" style={{ fill: used ? "var(--k5-ac)" : "var(--k5-card)", stroke: "var(--k5-ac)", strokeDasharray: used ? "none" : "5 4" }} />
      {!used && (
        <g>
          <path d="M8 17l12-6 12 6-12 6z" style={{ fill: "var(--k5-ac)" }} />
          <path d="M13 20v5c0 2 3.5 4 7 4s7-2 7-4v-5" fill="none" strokeWidth="2.2" strokeLinecap="round" style={{ stroke: "var(--k5-ac)" }} />
        </g>
      )}
      {used && <path d="M12 20l6 6 10-11" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** "My class tickets" (mockup): this week's tickets, used ones are filled with a tick. */
function Tickets({ perWeek, left, color }) {
  const { middle, high, copy } = useCopy();
  const total = Math.max(perWeek, left, 0);
  const shown = Math.min(total, MAX_TICKETS);
  const used = Math.max(total - left, 0);
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const range = format(monday, "MMM d") + " – " + format(addDays(monday, 4), "d");
  return (
    <section
      aria-labelledby="k5-tix"
      className="flex flex-[1_1_400px] flex-col gap-2.5 rounded-[26px] bg-k5-yt px-5 py-4"
      style={high ? { background: "var(--k5-act)", border: "none", borderRadius: 12 } : middle ? { background: "color-mix(in srgb, var(--k5-ac) 13%, var(--k5-card))", border: "1.5px solid color-mix(in srgb, var(--k5-ac) 28%, var(--k5-card))", borderRadius: 18 } : undefined}
    >
      <h2 id="k5-tix" className="m-0 font-k5-display text-[22px] font-semibold">{copy.tickets}</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-white/45 px-2.5 py-2">
        <span className="flex min-w-[104px] flex-col leading-[1.15]">
          <span className="font-k5-display text-lg font-semibold">This week</span>
          <span className={`text-[13px] font-extrabold ${middle ? "text-k5-acx" : "text-k5-yx"}`}>{range}</span>
        </span>
        <span role="img" aria-label={used + " of " + total + " used"} className={middle ? "flex flex-wrap gap-2" : "flex gap-2"}>
          {Array.from({ length: shown }, (_, i) => (middle ? <CapTile key={i} used={i < used} /> : <TicketSvg key={i} used={i < used} color={color} />))}
        </span>
        <span className="ms-auto whitespace-nowrap rounded-full bg-k5-card px-3 py-1 font-k5-display text-[17px] font-semibold">{left} left</span>
      </div>
      <p className={`m-0 flex items-center gap-1.5 text-[15px] font-black ${middle ? "text-k5-acx" : "text-k5-yx"}`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: middle ? "var(--k5-acx)" : "var(--k5-yX)" }}>
          <path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9" />
        </svg>
        {high ? copy.fly : "Use them by Friday!"}
      </p>
    </section>
  );
}

/**
 * Teacher + this week's slots of the picked course: the same requests (and query keys) the weekly
 * slot picker used, so what can be booked is exactly what it was before.
 */
function useBookSlots(picked) {
  const dummy = useDummyStudent();
  const [startDate] = useState(() => new Date().toISOString());
  const teacherQuery = useQuery({
    queryKey: ["book-class-teacher", picked?.subjectId, picked?.studentStandardId, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.assignedTeacher(picked.subjectId)
        : getAssignedTeacherForCourse({ subjectId: picked.subjectId, studentStandardId: picked.studentStandardId }),
    enabled: dummy.settled && Boolean(picked),
    staleTime: 0,
  });
  const teacher = teacherQuery.data;
  const teacherAssigned = teacher?.teacherAssigned === "YES";
  const slotsQuery = useQuery({
    queryKey: ["book-class-slots", teacher?.assignedTeacherUserId, picked?.subjectId, startDate, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.teacherWeeklyCalendar(teacher.assignedTeacherUserId, picked.subjectId, new Date(startDate))
        : getTeacherWeeklySlots({
            teacherUserId: teacher.assignedTeacherUserId,
            studentStandardId: teacher.studentStandardId ?? picked.studentStandardId,
            subjectId: picked.subjectId,
            startDate,
          }),
    enabled: Boolean(picked) && teacherAssigned,
    staleTime: 0,
  });
  const slots = slotsQuery.data;
  const week = slots?.teacherWeeklyTimeCurrLiveClass?.teacherAssignTimeWeekList?.[0];
  return {
    dummy,
    teacher,
    teacherAssigned,
    slots,
    week,
    days: week?.teacherAllDataInOneList ?? [],
    skipDates: new Set(slots?.skipDateList ?? []),
    loading: Boolean(picked) && (teacherQuery.isLoading || (teacherAssigned && slotsQuery.isLoading)),
  };
}


function StepPills({ step }) {
  const { copy } = useCopy();
  const STEP_LABELS = copy.steps;
  return (
    <ol aria-label="Steps" className="m-0 flex list-none flex-wrap items-center gap-x-2.5 gap-y-2 p-0">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const cur = step === n;
        return (
          <li key={label} aria-current={cur ? "step" : undefined} className={"flex items-center gap-2 rounded-full py-1 pl-1 pr-3.5 " + (cur ? "bg-k5-act" : "")}>
            <span
              className={
                "flex h-10 w-10 flex-none items-center justify-center rounded-full border-[3px] font-k5-display text-[19px] font-semibold " +
                (done ? "border-k5-grn bg-k5-grn text-white" : cur ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card text-k5-mut")
              }
            >
              {done ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "currentColor" }}>
                  <path d={CHECK_PATH} />
                </svg>
              ) : (
                n
              )}
            </span>
            <span className={"font-k5-display text-[17px] font-semibold " + (cur ? "text-k5-ink" : "text-k5-mut")}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SubjectChip({ name, color }) {
  return (
    <span className="ms-auto flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5" style={{ background: courseTint(color) }}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-k5-card" style={{ color }}>
        <SubjectIcon name={name} className="h-[26px] w-[26px]" />
      </span>
      <span className="font-k5-display text-lg font-semibold">{name}</span>
    </span>
  );
}

function SubjectStep({ options, loading, left, colorFor, onPick, onDetails, threePerRow = false }) {
  const { middle, high, copy } = useCopy();
  if (loading) {
    return (
      <K5Loading label="Loading your courses" className="">
        <K5CardsSkeleton count={threePerRow ? 6 : 5} cols={threePerRow ? 3 : undefined} min={160} />
      </K5Loading>
    );
  }
  if (options.length === 0) return <p className="m-0 py-6 text-center font-k5-display text-xl font-semibold text-k5-mut">You do not have a teacher assigned yet</p>;
  const none = left < 1;
  return (
    // In the Grade 6–8 "Book a Class" dialog: three courses in a row, the rest on the next row (two on a small screen).
    <div className={threePerRow ? "grid grid-cols-3 gap-3 max-[640px]:grid-cols-2" : "grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3"}>
      {options.map((s) => {
        const color = colorFor({ id: s.subjectId, name: s.name }) || subjectStyle(s.name).color;
        const card = (
          <button
            key={middle ? undefined : s.subjectId}
            type="button"
            aria-disabled={none}
            onClick={() => onPick(s)}
            className={
              high
                ? "k5h-b-scard-btn flex flex-[1_1_auto] flex-col items-center justify-start gap-1.5 border-none bg-transparent text-center text-k5-ink"
                : `flex min-h-[200px] flex-col items-center justify-start gap-2 rounded-3xl border-[3px] px-3 pb-3.5 pt-4 text-center text-k5-ink ${middle ? "flex-[1_1_auto]" : ""}`
            }
            style={
              high
                ? { padding: "4px 4px 2px", borderRadius: 12, cursor: none ? "default" : "pointer" }
                : { borderColor: color, background: courseTint(color), boxShadow: "0 5px 0 " + color, opacity: none ? 0.6 : 1, cursor: none ? "default" : "pointer", ...(middle ? { borderRadius: 16 } : {}) }
            }
          >
            <span className="k5h-b-stile flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[22px] bg-k5-card" style={{ color }}>
              <SubjectIcon name={s.name} className="k5h-b-sicon h-10 w-10" />
            </span>
            <span className="k5h-b-sname font-k5-display text-[22px] font-semibold leading-[1.1]">{s.name}</span>
            {middle && s.teacherName && <span className="text-sm font-extrabold leading-[1.2] text-k5-mut">{s.teacherName}</span>}
            {s.booked > 0 && (
              <span className="k5h-b-booked flex items-center gap-1 whitespace-nowrap rounded-full border-[3px] border-k5-grn bg-k5-card px-2.5 py-1 text-[13px] font-black" style={middle ? { borderColor: "var(--k5-c-done)" } : undefined}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "currentColor" }}>
                  <path d={CHECK_PATH} />
                </svg>
                {high ? copy.bookedN(s.booked) : s.booked + " booked"}
              </span>
            )}
            {!none && (
              <span className={`k5h-b-pick mt-auto rounded-full px-[18px] py-1.5 font-k5-display text-[17px] font-semibold ${middle ? "text-k5-card" : "text-white"}`} style={{ background: color }}>
                {copy.pickMe}
              </span>
            )}
          </button>
        );
        if (!middle) return card;
        // Grade 6–8: under every course card, a small "Booked class details" button (that course's booked classes).
        // Grade 9–12: both sit inside one coloured card (border, tint and the coloured edge belong to it).
        return (
          <div
            key={s.subjectId}
            className={high ? "k5h-b-scard flex min-w-0 flex-col" : "flex min-w-0 flex-col gap-2"}
            style={high ? { gap: 6, padding: 10, border: "1.5px solid " + color, borderRadius: 12, background: courseTint(color), boxShadow: "0 4px 0 " + color, opacity: none ? 0.6 : 1 } : undefined}
          >
            {card}
            <button
              type="button"
              onClick={() => onDetails(s.subjectId)}
              aria-label={"Booked class details: " + s.name}
              className="k5h-b-details flex min-h-10 cursor-pointer items-center justify-center gap-1 rounded-full border-[3px] border-k5-ac bg-k5-card px-3 py-1 text-center font-k5-display text-sm font-semibold leading-[1.15] text-k5-acx"
            >
              Booked class details
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="flex-none">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function AllUsed() {
  const { copy, high } = useCopy();
  return (
    <div className="flex flex-wrap items-center gap-[18px] rounded-3xl bg-k5-gt px-[22px] py-5">
      {high ? (
        <span aria-hidden="true" className="flex h-14 w-14 flex-none items-center justify-center rounded-full bg-k5-card">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" style={{ stroke: "var(--k5-grn)" }}>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M8 12.5l2.8 2.8L16.5 9.5" />
          </svg>
        </span>
      ) : (
      <svg width="88" height="64" viewBox="0 0 88 64" aria-hidden="true">
        <g transform="translate(4 14) rotate(-8)">
          <path d={TICKET_PATH} style={{ fill: "var(--k5-grn)", stroke: "var(--k5-ink)" }} strokeWidth="3" />
          <path d="M33 20l5 5 10-10" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d={STAR_PATH} transform="translate(64 2)" fill="#FFC531" style={{ stroke: "var(--k5-ink)" }} strokeWidth="1.4" />
      </svg>
      )}
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-k5-display text-[26px] font-semibold">{copy.allTitle}</h3>
        <p className={`m-0 text-[17px] font-extrabold ${high ? "text-k5-ink" : "text-k5-gx"}`}>{copy.allSub}</p>
      </div>
    </div>
  );
}

/** The days of this week the teacher teaches, with how many free times each has. */
function dayModel(days, slots, skipDates, left) {
  const today = startOfDay(new Date());
  return days.map((day) => {
    const date = new Date(day.displayStartDateWithoutDay);
    const valid = isValid(date);
    const list = day.dayWiseAllData ?? [];
    const skipped = list.length > 0 && skipDates.has(list[0].bookedDate);
    const entries = list.map((slot) => ({ slot, state: getSlotState(slot, day, slots) }));
    const free = entries.filter((e) => e.state === "available").length;
    const diff = valid ? Math.round((startOfDay(date) - today) / 86400000) : 0;
    let tag = "This week";
    if (valid && diff < 0) tag = "Over";
    else if (list.length === 0 || skipped) tag = "No classes";
    else if (left < 1) tag = "No tickets left";
    else if (free === 0) tag = "Busy";
    else if (diff === 0) tag = "Today";
    else if (diff === 1) tag = "Tomorrow";
    const can = free > 0 && left > 0 && valid && diff >= 0 && !skipped;
    return { day, entries, free, can, tag, isToday: valid && diff === 0, weekday: valid ? format(date, "EEEE") : "", num: valid ? date.getDate() : "", key: day.displayStartDateWithoutDay };
  });
}

function DayStep({ model, onPick }) {
  const { middle, high, copy } = useCopy();
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2.5">
      {model.map((d) => (
        <button
          key={d.key}
          type="button"
          aria-disabled={!d.can}
          onClick={() => d.can && onPick(d)}
          style={middle ? { borderRadius: high ? 12 : 16, boxShadow: d.can ? (d.isToday ? "0 5px 0 var(--k5-acd)" : "0 5px 0 var(--k5-line)") : "none" } : undefined}
          className={
            "k5h-b-day flex min-h-[150px] flex-col items-center gap-1 rounded-3xl border-[3px] px-1.5 py-3 text-k5-ink " +
            (!d.can ? "cursor-default border-transparent bg-k5-soft opacity-55 " : d.isToday ? "cursor-pointer border-k5-ac bg-k5-act shadow-[0_5px_0_var(--k5-acd)] " : "cursor-pointer border-k5-line bg-k5-card shadow-[0_5px_0_var(--k5-line)] ")
          }
        >
          <span className="text-[15px] font-black text-k5-mut">{d.weekday}</span>
          <span className="k5h-b-dnum font-k5-display text-[44px] font-semibold leading-none">{d.num}</span>
          <span className={"rounded-full px-3 py-[3px] text-sm font-black " + (!d.can ? "bg-k5-line text-k5-mut" : d.isToday ? "bg-k5-ac text-white" : "bg-k5-yt text-k5-yx")}>{d.tag === "No tickets left" ? copy.noLeft : d.tag}</span>
          {d.can && <span className="mt-auto text-[13px] font-extrabold text-k5-mut">Free times: {d.free}</span>}
        </button>
      ))}
    </div>
  );
}

function TimeStep({ dayItem, selected, onSelect }) {
  const { middle, high } = useCopy();
  const list = dayItem.entries.slice().sort((a, b) => String(a.slot.bookedStartDate).localeCompare(String(b.slot.bookedStartDate)));
  return (
    <div className="k5h-b-slots grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
      {list.map((entry, i) => {
        const { slot, state } = entry;
        const open = state === "available";
        const sel = selected === slot;
        const am = String(slot.displayStartTime).toUpperCase().includes("AM");
        const chip = open ? "Free" : state === "booked" ? "Busy" : "Closed";
        return (
          <button
            key={slot.bookedStartDate + "-" + i}
            type="button"
            aria-pressed={sel}
            aria-disabled={!open}
            onClick={() => open && onSelect(slot)}
            style={middle ? { borderRadius: high ? 12 : 16, boxShadow: open && !high ? (sel ? "0 5px 0 var(--k5-acd)" : "0 5px 0 var(--k5-line)") : "none" } : undefined}
            className={
              "k5h-b-slot relative flex min-h-[120px] flex-col items-center gap-1.5 rounded-3xl border-4 px-2 py-2.5 text-k5-ink " +
              (!open ? "cursor-default border-transparent bg-k5-soft " + (state === "booked" ? "opacity-55" : "opacity-45") : sel ? "cursor-pointer border-k5-ac bg-k5-act shadow-[0_5px_0_var(--k5-acd)]" : "cursor-pointer border-k5-line bg-k5-card shadow-[0_5px_0_var(--k5-line)]")
            }
          >
            {am ? (
              <svg className="k5h-b-sico" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="5" fill="#FFC531" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg className="k5h-b-sico" width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="9" r="4.5" fill="#FFC531" />
                <path d="M8 20h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.5A3.3 3.3 0 0 0 8 20z" fill="#B9C6E4" />
              </svg>
            )}
            <span className="k5h-b-time font-k5-display text-2xl font-semibold leading-none">{niceTime(slot.displayStartTime)}</span>
            <span className="text-[13px] font-black text-k5-mut">{am ? "Morning" : "Afternoon"}</span>
            <span className={"mt-auto rounded-full px-3 py-[3px] text-center text-sm font-black " + (open ? "bg-k5-gt text-k5-gx" : "bg-k5-card text-k5-mut")}>{chip}</span>
            {sel && (
              <span className="absolute -top-3 -end-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-k5-ac text-white shadow-[0_3px_0_var(--k5-acd)]">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "currentColor" }}>
                  <path d={CHECK_PATH} />
                </svg>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

const TABLE_COLS = [
  ["Booked", "booked", "var(--k5-bI)", "bg-k5-bt text-k5-bi"],
  ["Left", "unused", "#FFC531", "bg-k5-yt text-k5-yx"],
  ["Completed", "completed", "var(--k5-grn)", "bg-k5-gt text-k5-gx"],
  ["Missed by student", "missedByStudent", "var(--k5-oI)", "bg-k5-ot text-k5-oi"],
  ["Missed by teacher", "missedByTeacher", "var(--k5-pI)", "bg-k5-pt text-k5-pi"],
  ["Rescheduled", "rescheduled", "var(--k5-vI)", "bg-k5-vt text-k5-vi"],
  ["Expired", "expired", "var(--k5-rI)", "bg-k5-rt text-k5-ri"],
];

function RuleTile({ tone, icon, children }) {
  return (
    <div className={"flex items-center gap-4 rounded-[22px] border-[3px] border-k5-yb px-3.5 py-3 " + tone}>
      <span className="flex h-[74px] w-[74px] flex-none items-center justify-center rounded-[20px] bg-k5-card">{icon}</span>
      <span className="font-k5-display text-[22px] font-semibold leading-[1.2]">{children}</span>
    </div>
  );
}

function StatTile({ label, value, sub }) {
  return (
    <div className="k5h-b-stat flex flex-col rounded-[22px] bg-k5-act px-[18px] py-3.5">
      <span className="k5h-b-stat-l text-base font-black text-k5-mut">{label}</span>
      <span className="k5h-b-stat-v font-k5-display text-[40px] font-bold leading-[1.1]">{value}</span>
      {sub && <span className="text-xs font-medium text-k5-mut">{sub}</span>}
    </div>
  );
}

/** Grade 6–8 "Good to know": the three class rules, always visible between the tickets and the steps. */
function MiddleRules({ perWeek, comp }) {
  const { high } = useCopy();
  const tile = "flex items-center gap-3 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-3 py-2.5";
  const box = "flex h-[52px] w-[52px] flex-none items-center justify-center bg-k5-card";
  const text = "k5h-b-rule text-[17px] font-extrabold leading-[1.3]";
  const tr = high ? 10 : 14;
  if (high) {
    // Grade 9–12 (High.dc.html): a different set of rules and simple outline icons.
    const ico = { width: 26, height: 26, viewBox: "0 0 24 24", fill: "none", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.8, style: { stroke: "var(--k5-yX)" } };
    return (
      <div role="group" aria-labelledby="k5-rules-m" className={`${K5_CARD} flex flex-col gap-2.5 px-5 py-4`}>
        <h3 id="k5-rules-m" className="m-0 flex items-center gap-2 font-k5-display text-[22px] font-semibold">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" aria-hidden="true" style={{ stroke: "var(--k5-yX)" }}>
            <circle cx="12" cy="12" r="9.5" />
            <path d="M12 11v5.5M12 7.6v.01" />
          </svg>
          Good to know
        </h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          <div className={tile} style={{ borderRadius: tr }}>
            <span className={box} style={{ borderRadius: 12 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-yX)" }}>
                <rect x="3" y="5" width="18" height="16" rx="3" />
                <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" />
              </svg>
            </span>
            <span className={text}>Classes are Monday to Friday</span>
          </div>
          <div className={tile} style={{ borderRadius: tr }}>
            <span className={box} style={{ borderRadius: 12 }}>
              <svg {...ico} aria-hidden="true">
                <path d="M20 11a8 8 0 0 0-14.3-4.9L4 8" />
                <path d="M4 3.5V8h4.5" />
                <path d="M4 13a8 8 0 0 0 14.3 4.9L20 16" />
                <path d="M20 20.5V16h-4.5" />
              </svg>
            </span>
            <span className={text}>There are no free classes in Self Study</span>
          </div>
          <div className={tile} style={{ borderRadius: tr }}>
            <span className={box} style={{ borderRadius: 12 }}>
              <svg {...ico} aria-hidden="true">
                <path d="M6 3h12M6 21h12" />
                <path d="M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9" />
              </svg>
            </span>
            <span className={text}>You can book only the classes you buy</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div role="group" aria-labelledby="k5-rules-m" className={`${K5_CARD} flex flex-col gap-2.5 px-5 py-4`}>
      <h3 id="k5-rules-m" className="m-0 flex items-center gap-2 font-k5-display text-[22px] font-semibold">
        <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10" fill="#FFC531" />
          <path d="M12 11v6M12 7.5v.01" stroke="#3A2A00" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        Good to know
      </h3>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <div className={tile} style={{ borderRadius: 14 }}>
          <span className={box} style={{ borderRadius: 12 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-yX)" }}>
              <rect x="3" y="5" width="18" height="16" rx="3" />
              <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" />
            </svg>
          </span>
          <span className={text}>Classes are Monday to Friday</span>
        </div>
        <div className={tile} style={{ borderRadius: 14 }}>
          <span className={box} style={{ borderRadius: 12 }}>
            <svg width="34" height="22" viewBox="0 0 64 40" aria-hidden="true">
              <path d={TICKET_PATH} fill="#FFC531" style={{ stroke: "var(--k5-ink)" }} strokeWidth="3" />
              <text x="38" y="27" textAnchor="middle" fontWeight="700" fontSize="18" fill="#171B2E">{perWeek}</text>
            </svg>
          </span>
          <span className={text}>You get {perWeek} {comp ? "free " : ""}classes every week</span>
        </div>
        {comp && (
          <div className={tile} style={{ borderRadius: 14 }}>
            <span className={box} style={{ borderRadius: 12 }}>
              <svg width="40" height="30" viewBox="0 0 80 60" aria-hidden="true">
                <path d="M4 20h12M2 30h14M6 40h10" style={{ stroke: "var(--k5-yX)" }} strokeWidth="4" strokeLinecap="round" />
                <g transform="translate(20 12) rotate(-10)">
                  <path d={TICKET_PATH} transform="scale(0.85)" style={{ fill: "var(--k5-card)", stroke: "var(--k5-pI)" }} strokeWidth="4" />
                </g>
                <path d="M58 14q8-10 16-2q-8 2-10 10z" style={{ fill: "var(--k5-pI)" }} />
              </svg>
            </span>
            <span className={text}>Classes you don&apos;t book expire after Friday</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** "For grown-ups" (mockup): the class numbers in one place, closed until a grown-up opens it. */
function GrownUps({ details, calc, busy, perWeek, open, onToggle }) {
  const { middle, high } = useCopy();
  const comp = details.compClassPerweek > 0;
  const n = (v) => Number(v) || 0;
  const sum = calc?.summary;
  const free = sum?.complimentary;
  const extra = sum?.customPlan;
  // Cards: numbers come from the grown-ups API (summary). A spinner shows while they load or are being
  // updated (a booking takes a while, then the numbers are asked again); "–" if they could not be read.
  const spinner = (size) => <K5Sk className={size.includes("h-9") ? "h-10 w-20" : "inline-block h-5 w-8 align-middle"} />;
  const card = (value) => (busy ? spinner("h-9 w-9") : calc ? value : "–");
  const perWeekAll = n(free?.perWeek) + n(extra?.perWeek ?? extra?.perweek);
  const rows = calc?.subjects?.length ? calc.subjects : [{ subjectId: "all", subjectName: "All Courses", placeholder: true }];
  // Grade 9–12: no "Left" column (High.dc.html), and the four tiles add up the table.
  const cols = high ? TABLE_COLS.filter(([, key]) => key !== "unused") : TABLE_COLS;
  const colSum = (key) => rows.reduce((a, r) => a + n(r.complimentary?.[key]) + n(r.customPlan?.[key]), 0);
  return (
    <section aria-labelledby="k5-grown" className={`${K5_CARD} flex flex-col gap-3.5 px-[18px] py-3.5`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="k5-grown-body" className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-start text-k5-ink">
        <span className={`flex h-12 w-12 flex-none items-center justify-center rounded-2xl ${high ? "bg-k5-act" : "bg-k5-vt"}`}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth={high ? 1.8 : 2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: high ? "var(--k5-ac)" : "var(--k5-vI)" }}>
            <circle cx="8" cy="6" r="3" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1M13.5 20v-.5a3.5 3.5 0 0 1 7 0v.5" />
          </svg>
        </span>
        <span className="flex flex-1 flex-col">
          <span id="k5-grown" className="font-k5-display text-[22px] font-semibold">{middle ? "Class Breakdown" : "For grown-ups"}</span>
          <span className="text-sm font-extrabold text-k5-mut">All the class numbers in one place</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border-[3px] border-k5-line px-3.5 py-1.5 text-[15px] font-black">
          {open ? "Hide" : "Show"}
          <ChevronDown className={"h-4 w-4 " + (open ? "rotate-180" : "")} strokeWidth={3} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div id="k5-grown-body" className="flex flex-col gap-3.5">
          {!middle && (
            <div role="group" aria-labelledby="k5-rules" className="flex flex-col gap-2.5">
              <h3 id="k5-rules" className="m-0 flex items-center gap-2 font-k5-display text-[22px] font-semibold">
                <Info className="h-[26px] w-[26px] fill-k5-ac text-white" aria-hidden="true" /> Good to know
              </h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                <RuleTile
                  tone="bg-k5-yt"
                  icon={
                    <svg width="38" height="38" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "#8A5A00" }}>
                      <rect x="3" y="5" width="18" height="16" rx="3" />
                      <path d="M3 10h18M8 3v4M16 3v4M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2" />
                    </svg>
                  }
                >
                  Classes are Monday to Friday
                </RuleTile>
                <RuleTile
                  tone="bg-k5-yt"
                  icon={
                    <svg width="44" height="28" viewBox="0 0 64 40" aria-hidden="true">
                      <path d={TICKET_PATH} fill="#FFC531" style={{ stroke: "var(--k5-ink)" }} strokeWidth="3" />
                      <text x="38" y="27" textAnchor="middle" fontWeight="700" fontSize="18" fill="#1C2640">{perWeek}</text>
                    </svg>
                  }
                >
                  You get {perWeek} {comp ? "free " : ""}class tickets every week
                </RuleTile>
                {comp && (
                  <RuleTile
                    tone="bg-k5-yt"
                    icon={
                      <svg width="48" height="36" viewBox="0 0 80 60" aria-hidden="true">
                        <path d="M4 20h12M2 30h14M6 40h10" style={{ stroke: "#8A5A00" }} strokeWidth="4" strokeLinecap="round" />
                        <g transform="translate(20 12) rotate(-10)">
                          <path d={TICKET_PATH} transform="scale(0.85)" style={{ fill: "var(--k5-card)", stroke: "#D6336C" }} strokeWidth="4" />
                        </g>
                      </svg>
                    }
                  >
                    Tickets you don&apos;t use fly away after Friday
                  </RuleTile>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            {high ? (
              <>
                <StatTile label="Purchased classes" sub="Extra classes you bought" value={card(n(extra?.total))} />
                <StatTile label="Booked" value={card(colSum("booked"))} />
                <StatTile label="Unused" value={card(n(free?.unused) + n(extra?.unused))} />
                <StatTile label="Expired" value={card(colSum("expired"))} />
              </>
            ) : (
              <>
                <StatTile label="Total" value={card(n(free?.total) + n(extra?.total))} />
                <StatTile label="Complimentary classes" value={card(n(free?.total))} />
                <StatTile label="Extra classes" value={card(n(extra?.total))} />
                <StatTile label="Per week" value={card(perWeekAll)} />
                <StatTile label="Unused this week" value={card(n(free?.unused) + n(extra?.unused))} />
              </>
            )}
          </div>

          <div className="overflow-x-auto rounded-[22px] border-[3px] border-k5-line">
            <div role="table" aria-label="Class numbers" className="text-[15px] font-extrabold">
              <div role="row" className={`k5h-b-thead grid items-center bg-k5-act text-[17px] font-black ${high ? "min-w-[800px] grid-cols-[minmax(200px,1.8fr)_repeat(6,minmax(92px,1fr))]" : "min-w-[900px] grid-cols-[minmax(200px,1.8fr)_repeat(7,minmax(92px,1fr))]"}`}>
                <span role="columnheader" className="px-4 py-3.5 text-start">Course</span>
                {cols.map(([label, , dot]) => (
                  <span key={label} role="columnheader" className="px-3 py-3.5 text-center leading-[1.25]">
                    <span aria-hidden="true" className="me-1.5 inline-block h-3 w-3 rounded-full align-[-1px]" style={{ background: dot }} />
                    {label}
                  </span>
                ))}
              </div>
              {rows.map((s) => (
                <div key={s.subjectId} role="row" className={`grid items-center border-t-2 border-k5-line ${high ? "min-w-[800px] grid-cols-[minmax(200px,1.8fr)_repeat(6,minmax(92px,1fr))]" : "min-w-[900px] grid-cols-[minmax(200px,1.8fr)_repeat(7,minmax(92px,1fr))]"}`}>
                  <span role="cell" className="px-4 py-3 font-k5-display font-semibold">{s.subjectName}</span>
                  {cols.map(([label, key, , tone]) => (
                    <span key={label} role="cell" className="px-3 py-2 text-center">
                      <span className={"k5h-b-count inline-block min-w-9 rounded-full px-2.5 py-0.5 font-black " + tone}>{busy ? spinner("h-5 w-5") : s.placeholder ? "–" : n(s.complimentary?.[key]) + n(s.customPlan?.[key])}</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/**
 * Grade 6–8 (Middle.dc.html bkPop): "Book a Class (n)" on Booked Class Details opens the same three steps in a dialog
 * (940px, 20px round) — a title, a red close button, then the buddy, the steps and the booking.
 */
function BookPopup({ onClose, children }) {
  const { high } = useCopy();
  const themeProps = useK5ThemeProps(
    "flex max-h-[min(100%,calc(100vh-32px))] flex-col gap-[18px] overflow-y-auto rounded-[18px] border-[3px] border-k5-ink bg-k5-card p-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)] ring-0 sm:max-w-[940px]",
  );
  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent showCloseButton={false} {...themeProps} style={{ borderRadius: high ? 12 : 20 }}>
        <div className="flex items-center gap-3">
          <DialogTitle className="m-0 flex-1 font-k5-display text-[28px] font-semibold leading-[1.15]">Book a Class</DialogTitle>
          <DialogDescription className="sr-only">Select a course, a day and a time to book a class.</DialogDescription>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-red bg-k5-red">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="3" strokeLinecap="round" aria-hidden="true" style={{ stroke: "#FFFFFF" }}>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Grades 6–12: after a time is picked, a dialog asks "Confirm your class" (mockup bkCf): a centred card with a calendar
 * badge, the date and time, the course and the teacher in one list, then Back / Confirm.
 */
function ConfirmBooking({ open, when, course, color, teacher, busy, onBack, onConfirm }) {
  const themeProps = useK5ThemeProps(
    "flex max-h-[min(100%,calc(100vh-32px))] flex-col gap-[18px] overflow-y-auto rounded-[16px] border border-k5-line bg-k5-card px-[22px] pb-5 pt-6 text-k5-ink shadow-[0_20px_48px_rgba(16,24,40,0.22)] ring-0 sm:max-w-[460px]",
  );
  const icon = { fill: "none", strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.9, style: { stroke: "var(--k5-ac)" }, "aria-hidden": true };
  const tile = "flex h-10 w-10 flex-none items-center justify-center bg-k5-act";
  const label = "k5h-b-cfl text-[13px] font-medium text-k5-mut";
  const value = "k5h-b-cfv text-[17px] font-semibold text-k5-ink";
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onBack()}>
      <DialogContent showCloseButton={false} {...themeProps} style={{ borderRadius: 16 }}>
        <button type="button" onClick={onBack} disabled={busy} aria-label="Close" className="absolute end-[14px] top-[14px] flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-k5-line bg-k5-card">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" style={{ stroke: "var(--k5-mut)" }}>
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
        <div className="flex flex-col items-center gap-2.5 px-[30px] pb-0 pt-1 text-center">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-k5-act">
            <svg width="28" height="28" viewBox="0 0 24 24" {...icon}>
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path d="M3 10h18M8 3v4M16 3v4" />
              <path d="M9 15.5l2 2 4-4" />
            </svg>
          </span>
          <DialogTitle className="k5h-b-cft m-0 font-k5-display text-2xl font-semibold leading-[1.2]">Confirm your class</DialogTitle>
          <DialogDescription className="m-0 text-[15px] text-k5-mut">Please check the details before you book.</DialogDescription>
        </div>
        <div className="flex flex-col border border-k5-line bg-k5-soft" style={{ borderRadius: 12 }}>
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span aria-hidden="true" className={tile} style={{ borderRadius: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" {...icon}>
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M3 10h18M8 3v4M16 3v4" />
                <path d="M12 13.5v2.5l1.6 1" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={label}>Date &amp; time</span>
              <span className={value}>{when}</span>
            </span>
          </div>
          <div className="mx-3.5 h-px bg-k5-line" />
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span aria-hidden="true" className={tile} style={{ borderRadius: 10 }}>
              <svg width="20" height="20" viewBox="0 0 24 24" {...icon}>
                <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" />
                <path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
              </svg>
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={label}>Course Name</span>
              <span className={value + " inline-flex items-center gap-2"}>
                <span aria-hidden="true" className="h-2.5 w-2.5 flex-none rounded-full" style={{ background: color }} />
                {course}
              </span>
            </span>
          </div>
          <div className="mx-3.5 h-px bg-k5-line" />
          <div className="flex items-center gap-3 px-3.5 py-3">
            <span aria-hidden="true" className="k5h-b-cfini flex h-10 w-10 flex-none items-center justify-center rounded-full bg-k5-act font-k5-display text-[13px] font-semibold text-k5-ink">
              {initialsOf(teacher)}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className={label}>Teacher Name</span>
              <span className={value}>{teacher}</span>
            </span>
          </div>
        </div>
        <div className="grid grid-cols-[1fr_1.4fr] gap-2.5">
          <button type="button" onClick={onBack} disabled={busy} className="k5h-b-cfbtn min-h-[46px] cursor-pointer border border-k5-line bg-k5-card px-4 font-k5-display text-[17px] font-semibold text-k5-ink disabled:opacity-60" style={{ borderRadius: 10 }}>
            Back
          </button>
          <button type="button" onClick={onConfirm} disabled={busy} className="k5h-b-cfbtn flex min-h-[46px] cursor-pointer items-center justify-center gap-2 border-none bg-k5-ac px-4 font-k5-display text-[17px] font-semibold text-white disabled:opacity-60" style={{ borderRadius: 10 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "#FFFFFF" }}>
              <path d="M5 12l5 5 9-10" />
            </svg>
            {busy ? "Booking…" : "Confirm"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * K-5 look of Book Classes (mockup Book a Class): header with your teacher, class tickets, the buddy,
 * and the three steps - pick a subject, pick a day, pick a time - then "Book it!". Real data and the
 * real booking request: the teacher, this week's slots, the free/busy/closed rules (getSlotState) and
 * the submit (submitBookClassSlot) are the ones the weekly slot picker used; only the flow is steps.
 */
export function K5BookView({ details, subjects, course, onShowBooked, onBooked, popup = false, onClose }) {
  const { middle, high, copy } = useCopy();
  const colorFor = useK5CourseColors();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [picked, setPicked] = useState(null);
  const [dayKey, setDayKey] = useState(null);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const [grownOpen, setGrownOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const inFlight = useRef(false);
  const book = useBookSlots(picked);

  const allMode = subjects.length === 1 && subjects[0].subjectId === 0;
  const allQuery = useQuery({
    queryKey: ["book-class-all-courses", course.studentStandardId, book.dummy.key],
    queryFn: () => (book.dummy.enabled ? book.dummy.student.assignedTeachersForAllCourses() : getAssignedTeachersForAllCourses({ studentStandardId: course.studentStandardId })),
    enabled: allMode && book.dummy.settled,
    staleTime: 0,
  });
  const options = allMode
    ? (allQuery.data?.studentSubjectList ?? []).map((s) => ({ subjectId: s.subjectId, name: s.subjectName, studentStandardId: course.studentStandardId, teacherName: s.teacherName }))
    : subjects.filter((s) => s.subjectId !== 0).map((s) => ({ subjectId: s.subjectId, name: s.name, studentStandardId: s.studentStandardId, teacherName: s.teacherName, booked: s.booked }));
  const leftOf = (opt) => (allMode ? course.weekLeftClass : subjects.find((s) => s.subjectId === opt.subjectId)?.weekLeftClass ?? 0);
  const left = Math.max(picked ? leftOf(picked) : allMode ? course.weekLeftClass || 0 : Math.max(0, ...options.map(leftOf)), 0);
  // For grown-ups: cards + the "All Courses" table both come from one API, asked only once the section is opened.
  const calcQuery = useQuery({
    queryKey: ["book-class-grown-ups", course.studentStandardId, book.dummy.key],
    queryFn: () => (book.dummy.enabled ? book.dummy.student.classCalculationForGrownUps() : getClassCalculationForGrownUps({ studentStandardId: course.studentStandardId })),
    enabled: grownOpen && book.dummy.settled,
    staleTime: 0,
  });
  const calc = calcQuery.data ?? null;

  /* COURSE-WISE TABLE (kept for later, switched off): one row per subject. With an "All Courses" plan the
     details only have one combined row, so each course's numbers come from its booked-classes counts
     (asked only once the section is opened). To bring it back: restore the useQueries import above, delete
     the "All Courses" rows in GrownUps and use this instead.

  const countQueries = useQueries({
    queries: (allMode ? options : []).map((o) => ({
      queryKey: ["booked-classes", o.subjectId, o.studentStandardId, "k5-counts", book.dummy.key],
      queryFn: () =>
        book.dummy.enabled
          ? book.dummy.student.bookedClasses(o.subjectId)
          : getStudentBookedClasses({ subjectId: o.subjectId, studentStandardId: o.studentStandardId, dateType: "today" }),
      enabled: grownOpen && book.dummy.settled,
      staleTime: 0,
    })),
  });
  const tableRows = allMode
    ? options.map((o, i) => ({ subjectId: o.subjectId, name: o.name, loading: countQueries[i]?.isLoading, ...(countQueries[i]?.data?.subjectCountDatials ?? {}) }))
    : subjects;
  */
  const weekCounts = details.classData?.week?.[0] ?? {};
  const perWeek = (weekCounts.comp > 0 ? details.compClassPerweek : weekCounts.extra) || 0;

  // One name everywhere: the teacher whose slots are shown, else the course teacher.
  const teacherName = (picked && (book.slots?.teacherName || book.teacher?.teacherName || picked.teacherName)) || course.teacherName;
  const color = picked ? colorFor({ id: picked.subjectId, name: picked.name }) || subjectStyle(picked.name).color : "var(--k5-ac)";
  // Mockup: only today and the days after it are offered.
  const model = dayModel(book.days, book.slots, book.skipDates, left).filter((d) => d.tag !== "Over");
  const dayItem = model.find((m) => m.key === dayKey) || null;
  const end = selected ? getSlotEnd(selected.bookedStartDate, book.slots?.classDuration) : null;

  const say =
    step === 4
      ? "Yay! Your class is booked. See you there!"
      : step === 3
        ? copy.say3(firstName(teacherName))
        : step === 2
          ? copy.say2
          : left < 1
            ? copy.sayAll
            : copy.say;
  const title = step === 4 ? "Yay! Class booked!" : step === 1 && left < 1 ? copy.allTitle : copy.steps[step - 1];

  function goTo(nextStep) {
    if (nextStep < 3) setSelected(null);
    if (nextStep < 2) {
      setPicked(null);
      setDayKey(null);
    }
    setStep(nextStep);
  }

  function pickSubject(option) {
    if (left < 1) return;
    if (!allMode && !option.teacherName) {
      toast.error("You do not have a teacher assigned yet");
      return;
    }
    if (leftOf(option) < 1) {
      toast.error("You have booked all your classes for this week");
      return;
    }
    setPicked(option);
    setDayKey(null);
    setSelected(null);
    setStep(2);
  }

  async function bookIt() {
    if (inFlight.current || unknown || !selected || !dayItem) return;
    inFlight.current = true;
    setSubmitting(true);
    const result = book.dummy.enabled
      ? book.dummy.student.bookClassSubmit()
      : await submitBookClassSlot({
          meetingDate: selected.bookedStartDate,
          meetingEndDate: end?.endDateTime,
          subjectId: picked.subjectId,
          studentStandardId: book.teacher?.studentStandardId ?? picked.studentStandardId,
          teacherUserId: book.slots.teacherUserId,
        });
    inFlight.current = false;
    setSubmitting(false);
    if (!result) {
      // The request may have reached the server: keep Book it locked so a retry can not double-book.
      setUnknown(true);
      setConfirming(false);
      toast.error(UNKNOWN_OUTCOME);
      return;
    }
    if (result.status === "1") {
      setConfirming(false);
      toast.success(result.message || "Your class has been booked.");
      setDone({ name: picked.name, weekday: dayItem.weekday, num: dayItem.num, time: niceTime(selected.displayStartTime) });
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["book-class-slots"] });
      queryClient.invalidateQueries({ queryKey: ["book-class-grown-ups"] });
      onBooked();
      return;
    }
    setConfirming(false);
    toast.error(result.message || "Unable to book this class. Please try again.");
  }

  // "Book a Class (n)" in the header: back to the first step, scrolled to it.
  function startOver() {
    setDone(null);
    setUnknown(false);
    goTo(1);
    window.setTimeout(() => document.getElementById("k5-step")?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  }

  function another() {
    setDone(null);
    setUnknown(false);
    goTo(1);
  }

  const notice = (text) => <p className="m-0 py-6 text-center font-k5-display text-xl font-semibold text-k5-mut">{text}</p>;

  // The three steps: the section of the page, and the whole body of the Grade 6–8 "Book a Class" dialog.
  const flow = (
    <>
          <BuddyStrip say={say} />
          <StepPills step={step} />
          <div className="flex flex-wrap items-center gap-3">
            {(step === 2 || step === 3) && (
              <button
                type="button"
                onClick={() => goTo(step - 1)}
                className="flex min-h-12 cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-k5-line bg-k5-card py-0 pl-3 pr-[18px] font-k5-display text-[17px] font-semibold text-k5-ink"
              >
                <ChevronLeft className="h-5 w-5 text-k5-acx" strokeWidth={3} aria-hidden="true" /> Back
              </button>
            )}
            <div className="flex flex-col">
              {step < 4 && <span className="text-sm font-black text-k5-mut">Step {step} of 3</span>}
              <h2 id="k5-step" className="m-0 font-k5-display text-[30px] font-semibold leading-[1.1]">{title}</h2>
              {step === 1 && <span className="mt-0.5 text-[15px] font-black text-k5-gx">{copy.any}</span>}
              {step === 3 && (
                <span className="mt-0.5 flex items-center gap-1.5 text-[15px] font-black text-[var(--k5-vX)]">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-k5-vi text-[10px] text-white">{initialsOf(teacherName)}</span>
                  {firstName(teacherName)} is free at these times
                </span>
              )}
            </div>
            {(step === 2 || step === 3) && picked && <SubjectChip name={picked.name} color={color} />}
            {step === 1 && !middle && (
              <button
                type="button"
                onClick={() => onShowBooked(picked?.subjectId)}
                className="ms-auto min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-5 font-k5-display text-[17px] font-semibold text-k5-ink"
              >
                My booked classes
              </button>
            )}
          </div>

          {step === 1 && (
            <>
              <SubjectStep options={options} loading={allMode && allQuery.isLoading} left={left} colorFor={colorFor} onPick={pickSubject} onDetails={onShowBooked} threePerRow={popup} />
              {left < 1 && <AllUsed />}
            </>
          )}

          {step === 2 &&
            (book.loading
              ? (
                <K5Loading label="Loading available days" className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <K5Sk key={i} className="k5h-b-day-sk h-[150px] rounded-3xl" />
                  ))}
                </K5Loading>
              )
              : !book.teacher || !book.teacherAssigned
                ? notice(book.teacher ? "You do not have a teacher assigned yet" : "Unable to load teacher details. Please try again.")
                : !book.week
                  ? notice("No class slots are available for this week.")
                  : (
                    <DayStep
                      model={model}
                      onPick={(d) => {
                        setDayKey(d.key);
                        setSelected(null);
                        setStep(3);
                      }}
                    />
                  ))}

          {step === 3 && dayItem && (
            <>
              <TimeStep
                dayItem={dayItem}
                selected={selected}
                onSelect={(slot) => {
                  setSelected(slot);
                  if (middle) setConfirming(true);
                }}
              />
              <p className="m-0 text-sm font-extrabold text-k5-mut">
                Times are in {book.slots?.timeZoneName}. Each class is {book.slots?.classDuration} minutes.
              </p>
              {selected && !middle && (
                <div className="flex flex-wrap items-center gap-3.5 rounded-3xl bg-k5-yt px-4 py-3.5">
                  <span className="flex h-14 w-14 flex-none items-center justify-center rounded-[18px] bg-k5-card" style={{ color }}>
                    <SubjectIcon name={picked.name} className="h-[26px] w-[26px]" />
                  </span>
                  <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
                    <span className="text-sm font-black text-k5-yx">You picked</span>
                    <span className="font-k5-display text-[22px] font-semibold leading-[1.2]">
                      {picked.name} · {dayItem.weekday} {dayItem.num} · {niceTime(selected.displayStartTime)}
                    </span>
                    <span className="text-sm font-extrabold text-k5-mut">with {teacherName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={bookIt}
                    disabled={submitting || unknown}
                    className="flex min-h-16 cursor-pointer items-center gap-2.5 rounded-full border-none bg-k5-grn px-[30px] font-k5-display text-2xl font-semibold text-white shadow-[0_6px_0_var(--k5-grnD)] disabled:opacity-60"
                  >
                    <svg width="30" height="20" viewBox="0 0 64 40" aria-hidden="true">
                      <path d={TICKET_PATH} fill="#FFC531" />
                    </svg>
                    {submitting ? "Booking…" : "Book it!"}
                  </button>
                </div>
              )}
              {unknown && <p className="m-0 text-center font-extrabold text-k5-ri">{UNKNOWN_OUTCOME}</p>}
            </>
          )}

          {step === 4 && done && (
            <div className="flex flex-wrap items-center justify-center gap-[22px] rounded-3xl bg-k5-gt p-[22px] text-center">
              {high ? (
                <span aria-hidden="true" className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-full bg-k5-card">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" style={{ stroke: "var(--k5-grn)" }}>
                    <circle cx="12" cy="12" r="9.5" />
                    <path d="M8 12.5l2.8 2.8L16.5 9.5" />
                  </svg>
                </span>
              ) : (
              <svg width="140" height="88" viewBox="0 0 64 40" aria-hidden="true" className="flex-none">
                <g transform="rotate(-8 32 20)">
                  <path d={TICKET_PATH} style={{ fill: color, stroke: "var(--k5-ink)" }} strokeWidth="2" />
                  <path d="M22 7v26" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="3 3" />
                  <path d="M33 20l5 5 10-10" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
                </g>
              </svg>
              )}
              <div className="flex flex-[1_1_260px] flex-col items-start gap-1.5 text-start">
                <p className="m-0 font-k5-display text-[22px] font-semibold leading-[1.25]">
                  {done.name} · {done.weekday} {done.num} · {done.time}
                </p>
                <span className={`text-[15px] font-extrabold ${high ? "text-k5-ink" : "text-k5-gx"}`}>with {teacherName}</span>
                <div className="mt-2 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={another}
                    className="k5h-b-another min-h-[54px] cursor-pointer rounded-full border-none bg-[#FFC531] px-6 font-k5-display text-[19px] font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A]"
                  >
                    Book another class
                  </button>
                  <button
                    type="button"
                    onClick={() => onShowBooked(picked?.subjectId)}
                    className="min-h-[54px] cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-6 font-k5-display text-[19px] font-semibold text-k5-ink"
                  >
                    See my classes
                  </button>
                </div>
              </div>
            </div>
          )}
    </>
  );
  const confirmDialog =
    middle && confirming && picked && selected && dayItem ? (
        <ConfirmBooking
          open
          when={format(new Date(dayItem.day.displayStartDateWithoutDay), "MMM dd, yyyy") + " · " + niceTime(selected.displayStartTime) + (end?.endTime ? " – " + end.endTime : "")}
          course={picked.name}
          color={color}
          teacher={teacherName}
          busy={submitting}
          onBack={() => {
            setConfirming(false);
            setSelected(null);
          }}
          onConfirm={bookIt}
        />
    ) : null;

  if (popup) {
    return (
      <BookPopup onClose={onClose}>
        {flow}
        {confirmDialog}
      </BookPopup>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex-[1_1_340px]">
          <BookHeader teacherName={teacherName} onStart={startOver} startLabel={"Book a Class (" + left + ")"} />
        </div>
        <Tickets perWeek={perWeek} left={left} color={color} />
      </div>

      {middle && <MiddleRules perWeek={perWeek} comp={details.compClassPerweek > 0} />}

      <section aria-labelledby="k5-step" className={`${K5_CARD} flex flex-col gap-[18px] px-[22px] py-5`}>
        {flow}
      </section>

      {confirmDialog}


      <GrownUps details={details} calc={calc} busy={calcQuery.isFetching || submitting} perWeek={perWeek} open={grownOpen} onToggle={() => setGrownOpen((v) => !v)} />
    </div>
  );
}
