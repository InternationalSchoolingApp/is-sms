"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
// import { useQueries } from "@tanstack/react-query"; // course-wise table (commented out below)
import toast from "react-hot-toast";
import { addDays, format, isValid, startOfDay, startOfWeek } from "date-fns";
import { Check, ChevronDown, ChevronLeft, Info, Loader2, Volume2 } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { K5_CARD, SubjectIcon } from "@/components/k5/home/k5Bits";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { BUDDIES } from "@/constant/appearance";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { getAssignedTeacherForCourse, getAssignedTeachersForAllCourses, getClassCalculationForGrownUps, getStudentBookedClasses, getTeacherWeeklySlots, submitBookClassSlot } from "@/services/bookClassApi";
import { getSlotEnd, getSlotState } from "@/utils/bookClass";
import { courseTint, subjectStyle } from "@/utils/k5Calendar";

const MAX_TICKETS = 10;
const BOOK_SAY = "This is where you book classes! Each ticket is one class with a teacher.";
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
function BookArt() {
  return (
    <svg width="96" height="84" viewBox="0 0 96 84" aria-hidden="true" className="flex-none">
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

function BookHeader({ teacherName }) {
  return (
    <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span className="flex h-[84px] w-[84px] flex-none items-center justify-center">
        <BookArt />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Book a Class</h1>
        <p className="m-0 text-lg font-extrabold text-k5-mut">Pick a subject, a day and a time. That&apos;s it!</p>
        {teacherName !== undefined && <TeacherChip name={teacherName} />}
      </div>
    </div>
  );
}

/** Centered message card for the gate states (loading, not started, buy a class, ...). */
export function K5BookNotice({ children }) {
  return (
    <div className="flex flex-col gap-4">
      <BookHeader />
      <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold`}>{children}</div>
    </div>
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
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-acx"
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

/** "My class tickets" (mockup): this week's tickets, used ones are filled with a tick. */
function Tickets({ perWeek, left, color }) {
  const total = Math.max(perWeek, left, 0);
  const shown = Math.min(total, MAX_TICKETS);
  const used = Math.max(total - left, 0);
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const range = format(monday, "MMM d") + " – " + format(addDays(monday, 4), "d");
  return (
    <section aria-labelledby="k5-tix" className="flex flex-[1_1_400px] flex-col gap-2.5 rounded-[26px] bg-k5-yt px-5 py-4">
      <h2 id="k5-tix" className="m-0 font-k5-display text-[22px] font-semibold">My class tickets</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-white/45 px-2.5 py-2">
        <span className="flex min-w-[104px] flex-col leading-[1.15]">
          <span className="font-k5-display text-lg font-semibold">This week</span>
          <span className="text-[13px] font-extrabold text-k5-yx">{range}</span>
        </span>
        <span role="img" aria-label={used + " of " + total + " used"} className="flex gap-2">
          {Array.from({ length: shown }, (_, i) => (
            <TicketSvg key={i} used={i < used} color={color} />
          ))}
        </span>
        <span className="ms-auto whitespace-nowrap rounded-full bg-k5-card px-3 py-1 font-k5-display text-[17px] font-semibold">{left} left</span>
      </div>
      <p className="m-0 flex items-center gap-1.5 text-[15px] font-black text-k5-yx">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-yX)" }}>
          <path d="M6 3h12M6 21h12M7 3c0 5 10 6 10 9s-10 4-10 9M17 3c0 5-10 6-10 9s10 4 10 9" />
        </svg>
        Use them by Friday!
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

const STEP_LABELS = ["Pick a subject", "Pick a day", "Pick a time"];

function StepPills({ step }) {
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

function SubjectStep({ options, loading, left, colorFor, onPick }) {
  if (loading) return <p className="m-0 py-6 text-center font-k5-display text-xl font-semibold text-k5-mut">Loading…</p>;
  if (options.length === 0) return <p className="m-0 py-6 text-center font-k5-display text-xl font-semibold text-k5-mut">You do not have a teacher assigned yet</p>;
  const none = left < 1;
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {options.map((s) => {
        const color = colorFor({ id: s.subjectId, name: s.name }) || subjectStyle(s.name).color;
        return (
          <button
            key={s.subjectId}
            type="button"
            aria-disabled={none}
            onClick={() => onPick(s)}
            className="flex min-h-[200px] flex-col items-center justify-start gap-2 rounded-3xl border-[3px] px-3 pb-3.5 pt-4 text-center text-k5-ink"
            style={{ borderColor: color, background: courseTint(color), boxShadow: "0 5px 0 " + color, opacity: none ? 0.6 : 1, cursor: none ? "default" : "pointer" }}
          >
            <span className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[22px] bg-k5-card" style={{ color }}>
              <SubjectIcon name={s.name} className="h-10 w-10" />
            </span>
            <span className="font-k5-display text-[22px] font-semibold leading-[1.1]">{s.name}</span>
            {s.booked > 0 && (
              <span className="flex items-center gap-1 whitespace-nowrap rounded-full border-[3px] border-k5-grn bg-k5-card px-2.5 py-1 text-[13px] font-black">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "currentColor" }}>
                  <path d={CHECK_PATH} />
                </svg>
                {s.booked} booked
              </span>
            )}
            {!none && (
              <span className="mt-auto rounded-full px-[18px] py-1.5 font-k5-display text-[17px] font-semibold text-white" style={{ background: color }}>
                Pick me!
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function AllUsed() {
  return (
    <div className="flex flex-wrap items-center gap-[18px] rounded-3xl bg-k5-gt px-[22px] py-5">
      <svg width="88" height="64" viewBox="0 0 88 64" aria-hidden="true">
        <g transform="translate(4 14) rotate(-8)">
          <path d={TICKET_PATH} style={{ fill: "var(--k5-grn)", stroke: "var(--k5-ink)" }} strokeWidth="3" />
          <path d="M33 20l5 5 10-10" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        </g>
        <path d={STAR_PATH} transform="translate(64 2)" fill="#FFC531" style={{ stroke: "var(--k5-ink)" }} strokeWidth="1.4" />
      </svg>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-k5-display text-[26px] font-semibold">All your tickets are used!</h3>
        <p className="m-0 text-[17px] font-extrabold text-k5-gx">Super job! New tickets come on Monday.</p>
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
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-2.5">
      {model.map((d) => (
        <button
          key={d.key}
          type="button"
          aria-disabled={!d.can}
          onClick={() => d.can && onPick(d)}
          className={
            "flex min-h-[150px] flex-col items-center gap-1 rounded-3xl border-[3px] px-1.5 py-3 text-k5-ink " +
            (!d.can ? "cursor-default border-transparent bg-k5-soft opacity-55 " : d.isToday ? "cursor-pointer border-k5-ac bg-k5-act shadow-[0_5px_0_var(--k5-acd)] " : "cursor-pointer border-k5-line bg-k5-card shadow-[0_5px_0_var(--k5-line)] ")
          }
        >
          <span className="text-[15px] font-black text-k5-mut">{d.weekday}</span>
          <span className="font-k5-display text-[44px] font-semibold leading-none">{d.num}</span>
          <span className={"rounded-full px-3 py-[3px] text-sm font-black " + (!d.can ? "bg-k5-line text-k5-mut" : d.isToday ? "bg-k5-ac text-white" : "bg-k5-yt text-k5-yx")}>{d.tag}</span>
          {d.can && <span className="mt-auto text-[13px] font-extrabold text-k5-mut">Free times: {d.free}</span>}
        </button>
      ))}
    </div>
  );
}

function TimeStep({ dayItem, selected, onSelect }) {
  const list = dayItem.entries.slice().sort((a, b) => String(a.slot.bookedStartDate).localeCompare(String(b.slot.bookedStartDate)));
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3">
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
            className={
              "relative flex min-h-[120px] flex-col items-center gap-1.5 rounded-3xl border-4 px-2 py-2.5 text-k5-ink " +
              (!open ? "cursor-default border-transparent bg-k5-soft " + (state === "booked" ? "opacity-55" : "opacity-45") : sel ? "cursor-pointer border-k5-ac bg-k5-act shadow-[0_5px_0_var(--k5-acd)]" : "cursor-pointer border-k5-line bg-k5-card shadow-[0_5px_0_var(--k5-line)]")
            }
          >
            {am ? (
              <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="5" fill="#FFC531" />
                <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" stroke="#FFB020" strokeWidth="2" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="32" height="32" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="9" cy="9" r="4.5" fill="#FFC531" />
                <path d="M8 20h10a4 4 0 0 0 0-8 5.5 5.5 0 0 0-10.5 1.5A3.3 3.3 0 0 0 8 20z" fill="#B9C6E4" />
              </svg>
            )}
            <span className="font-k5-display text-2xl font-semibold leading-none">{niceTime(slot.displayStartTime)}</span>
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

function StatTile({ label, value }) {
  return (
    <div className="flex flex-col rounded-[22px] bg-k5-act px-[18px] py-3.5">
      <span className="text-base font-black text-k5-mut">{label}</span>
      <span className="font-k5-display text-[40px] font-bold leading-[1.1]">{value}</span>
    </div>
  );
}

/** "For grown-ups" (mockup): the class numbers in one place, closed until a grown-up opens it. */
function GrownUps({ details, calc, busy, perWeek, open, onToggle }) {
  const comp = details.compClassPerweek > 0;
  const n = (v) => Number(v) || 0;
  const sum = calc?.summary;
  const free = sum?.complimentary;
  const extra = sum?.customPlan;
  // Cards: numbers come from the grown-ups API (summary). A spinner shows while they load or are being
  // updated (a booking takes a while, then the numbers are asked again); "–" if they could not be read.
  const spinner = (size) => <Loader2 className={size + " animate-spin text-k5-mut"} role="status" aria-label="Updating the numbers" />;
  const card = (value) => (busy ? spinner("h-9 w-9") : calc ? value : "–");
  const perWeekAll = n(sum?.maxClassPerWeek) || n(free?.perWeek) + n(extra?.perWeek ?? extra?.perweek);
  const rows = calc?.subjects?.length ? calc.subjects : [{ subjectId: "all", subjectName: "All Courses", placeholder: true }];
  return (
    <section aria-labelledby="k5-grown" className={`${K5_CARD} flex flex-col gap-3.5 px-[18px] py-3.5`}>
      <button type="button" onClick={onToggle} aria-expanded={open} aria-controls="k5-grown-body" className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-none bg-transparent p-0 text-start text-k5-ink">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl bg-k5-vt">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-vI)" }}>
            <circle cx="8" cy="6" r="3" />
            <circle cx="17" cy="9" r="2.3" />
            <path d="M2.5 20v-1a5.5 5.5 0 0 1 11 0v1M13.5 20v-.5a3.5 3.5 0 0 1 7 0v.5" />
          </svg>
        </span>
        <span className="flex flex-1 flex-col">
          <span id="k5-grown" className="font-k5-display text-[22px] font-semibold">For grown-ups</span>
          <span className="text-sm font-extrabold text-k5-mut">All the class numbers in one place</span>
        </span>
        <span className="flex items-center gap-1.5 rounded-full border-[3px] border-k5-line px-3.5 py-1.5 text-[15px] font-black">
          {open ? "Hide" : "Show"}
          <ChevronDown className={"h-4 w-4 " + (open ? "rotate-180" : "")} strokeWidth={3} aria-hidden="true" />
        </span>
      </button>
      {open && (
        <div id="k5-grown-body" className="flex flex-col gap-3.5">
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

          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-2.5">
            <StatTile label="Total" value={card(n(free?.total) + n(extra?.total))} />
            <StatTile label="Complimentary classes" value={card(n(free?.total))} />
            <StatTile label="Extra classes" value={card(n(extra?.total))} />
            <StatTile label="Per week" value={card(perWeekAll)} />
            <StatTile label="Unused this week" value={card(n(free?.unused) + n(extra?.unused))} />
          </div>

          <div className="overflow-x-auto rounded-[22px] border-[3px] border-k5-line">
            <div role="table" aria-label="Class numbers" className="text-[15px] font-extrabold">
              <div role="row" className="grid min-w-[900px] grid-cols-[minmax(200px,1.8fr)_repeat(7,minmax(92px,1fr))] items-center bg-k5-act text-[17px] font-black">
                <span role="columnheader" className="px-4 py-3.5 text-start">Subject</span>
                {TABLE_COLS.map(([label, , dot]) => (
                  <span key={label} role="columnheader" className="px-3 py-3.5 text-center leading-[1.25]">
                    <span aria-hidden="true" className="me-1.5 inline-block h-3 w-3 rounded-full align-[-1px]" style={{ background: dot }} />
                    {label}
                  </span>
                ))}
              </div>
              {rows.map((s) => (
                <div key={s.subjectId} role="row" className="grid min-w-[900px] grid-cols-[minmax(200px,1.8fr)_repeat(7,minmax(92px,1fr))] items-center border-t-2 border-k5-line">
                  <span role="cell" className="px-4 py-3 font-k5-display text-xl font-semibold">{s.subjectName}</span>
                  {TABLE_COLS.map(([label, key, , tone]) => (
                    <span key={label} role="cell" className="px-3 py-2 text-center">
                      <span className={"inline-block min-w-9 rounded-full px-2.5 py-0.5 font-black " + tone}>{busy ? spinner("h-5 w-5") : s.placeholder ? "–" : n(s.complimentary?.[key]) + n(s.customPlan?.[key])}</span>
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
 * K-5 look of Book Classes (mockup Book a Class): header with your teacher, class tickets, the buddy,
 * and the three steps - pick a subject, pick a day, pick a time - then "Book it!". Real data and the
 * real booking request: the teacher, this week's slots, the free/busy/closed rules (getSlotState) and
 * the submit (submitBookClassSlot) are the ones the weekly slot picker used; only the flow is steps.
 */
export function K5BookView({ details, subjects, course, onShowBooked, onBooked }) {
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
        ? "Now pick a time when " + firstName(teacherName) + " is free."
        : step === 2
          ? "Great choice! Now pick a day."
          : left < 1
            ? "Wow, you used all your tickets this week!"
            : BOOK_SAY;
  const title = step === 4 ? "Yay! Class booked!" : step === 1 && left < 1 ? "All your tickets are used!" : STEP_LABELS[step - 1];

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
      toast.error(UNKNOWN_OUTCOME);
      return;
    }
    if (result.status === "1") {
      toast.success(result.message || "Your class has been booked.");
      setDone({ name: picked.name, weekday: dayItem.weekday, num: dayItem.num, time: niceTime(selected.displayStartTime) });
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ["book-class-slots"] });
      queryClient.invalidateQueries({ queryKey: ["book-class-grown-ups"] });
      onBooked();
      return;
    }
    toast.error(result.message || "Unable to book this class. Please try again.");
  }

  function another() {
    setDone(null);
    setUnknown(false);
    goTo(1);
  }

  const notice = (text) => <p className="m-0 py-6 text-center font-k5-display text-xl font-semibold text-k5-mut">{text}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex-[1_1_340px]">
          <BookHeader teacherName={teacherName} />
        </div>
        <Tickets perWeek={perWeek} left={left} color={color} />
      </div>

      <section aria-labelledby="k5-step" className={`${K5_CARD} flex flex-col gap-[18px] px-[22px] py-5`}>
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
            {step === 1 && <span className="mt-0.5 text-[15px] font-black text-k5-gx">Every subject is open. Pick any one you like!</span>}
            {step === 3 && (
              <span className="mt-0.5 flex items-center gap-1.5 text-[15px] font-black text-[var(--k5-vX)]">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-k5-vi text-[10px] text-white">{initialsOf(teacherName)}</span>
                {firstName(teacherName)} is free at these times
              </span>
            )}
          </div>
          {(step === 2 || step === 3) && picked && <SubjectChip name={picked.name} color={color} />}
          {step === 1 && (
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
            <SubjectStep options={options} loading={allMode && allQuery.isLoading} left={left} colorFor={colorFor} onPick={pickSubject} />
            {left < 1 && <AllUsed />}
          </>
        )}

        {step === 2 &&
          (book.loading
            ? notice("Loading available slots…")
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
            <TimeStep dayItem={dayItem} selected={selected} onSelect={setSelected} />
            <p className="m-0 text-sm font-extrabold text-k5-mut">
              Times are in {book.slots?.timeZoneName}. Each class is {book.slots?.classDuration} minutes.
            </p>
            {selected && (
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
            <svg width="140" height="88" viewBox="0 0 64 40" aria-hidden="true" className="flex-none">
              <g transform="rotate(-8 32 20)">
                <path d={TICKET_PATH} style={{ fill: color, stroke: "var(--k5-ink)" }} strokeWidth="2" />
                <path d="M22 7v26" stroke="#FFFFFF" strokeWidth="1.6" strokeDasharray="3 3" />
                <path d="M33 20l5 5 10-10" fill="none" stroke="#FFFFFF" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
              </g>
            </svg>
            <div className="flex flex-[1_1_260px] flex-col items-start gap-1.5 text-start">
              <p className="m-0 font-k5-display text-[22px] font-semibold leading-[1.25]">
                {done.name} · {done.weekday} {done.num} · {done.time}
              </p>
              <span className="text-[15px] font-extrabold text-k5-gx">with {teacherName}</span>
              <div className="mt-2 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  onClick={another}
                  className="min-h-[54px] cursor-pointer rounded-full border-none bg-[#FFC531] px-6 font-k5-display text-[19px] font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A]"
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
      </section>

      <GrownUps details={details} calc={calc} busy={calcQuery.isFetching || submitting} perWeek={perWeek} open={grownOpen} onToggle={() => setGrownOpen((v) => !v)} />
    </div>
  );
}
