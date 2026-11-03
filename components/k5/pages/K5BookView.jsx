"use client";

import { CalendarPlus, Check, Info, Ticket, Volume2 } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { K5_CARD, K5_PRIMARY_BTN, SubjectIcon } from "@/components/k5/home/k5Bits";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { BUDDIES } from "@/constant/appearance";
import { useK5CourseColors } from "@/hooks/useK5CourseColors";
import { courseTint, subjectStyle } from "@/utils/k5Calendar";

const MAX_TICKETS = 10;
const BOOK_SAY = "This is where you book classes! Each ticket is one class with a teacher.";

function TeacherChip({ name }) {
  const initials = String(name || "?")
    .replace(/^(mr|ms|mrs|dr)\.?\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
  return (
    <span className="flex items-center gap-2.5 self-start rounded-full bg-k5-vt py-1 pl-1 pr-3.5">
      <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full bg-k5-vi font-k5-display text-[15px] font-semibold text-white">{name ? initials : "?"}</span>
      <span className="flex flex-col leading-[1.15]">
        <span className="text-xs font-black text-k5-vi">Your teacher</span>
        <span className="font-k5-display text-[17px] font-semibold">{name || "Not picked yet"}</span>
      </span>
    </span>
  );
}

function BookHeader({ teacherName }) {
  return (
    <div className={`${K5_CARD} flex items-center gap-4 px-[22px] py-[18px]`}>
      <span className="flex h-24 w-24 flex-none items-center justify-center rounded-[28px] bg-k5-ot">
        <CalendarPlus className="h-14 w-14 text-k5-oi" strokeWidth={2} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">Book a Class</h1>
        <p className="m-0 text-lg font-extrabold text-k5-mut">Pick a course, then pick a time with your teacher.</p>
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

/** The student buddy explains the page (mockup: Booky says this is where you book classes); tap the speaker to hear it. */
function BuddyStrip() {
  const { preferences } = useAppearance();
  const { speak } = useSpeech();
  const buddy = BUDDIES[preferences.buddy] || BUDDIES.pico;
  return (
    <div role="status" className="flex items-center gap-3 rounded-[22px] bg-k5-vt py-2 pl-2 pr-2.5">
      <PicoMascot buddy={preferences.buddy} width={48} full={false} />
      <p className="m-0 min-w-0 flex-1 text-[17px] font-bold">
        <span className="font-k5-display font-semibold text-k5-vi">{buddy.name}: </span>
        {BOOK_SAY}
      </p>
      <button
        type="button"
        onClick={() => speak(BOOK_SAY, { force: true })}
        aria-label="Hear it"
        className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-acx"
      >
        <Volume2 className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

/** Weekly tickets (mockup): one ticket per class you can book this week, used ones are faded. */
function Tickets({ perWeek, left, compYear }) {
  const total = Math.max(perWeek, left, 0);
  const shown = Math.min(total, MAX_TICKETS);
  const used = Math.max(total - left, 0);
  return (
    <section aria-labelledby="k5-tix" className="flex flex-[1_1_400px] flex-col gap-2.5 rounded-[26px] bg-k5-yt px-5 py-4">
      <h2 id="k5-tix" className="m-0 font-k5-display text-[22px] font-semibold">Your tickets this week</h2>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[18px] bg-k5-card px-3 py-2">
        <span role="img" aria-label={left + " of " + total + " tickets left"} className="flex flex-wrap gap-2">
          {Array.from({ length: shown }, (_, i) => (
            <Ticket key={i} className={"h-[45px] w-[56px] " + (i < used ? "text-k5-line" : "fill-k5-hi text-k5-yx")} strokeWidth={2} aria-hidden="true" />
          ))}
        </span>
        <span className="ms-auto whitespace-nowrap rounded-full bg-k5-soft px-3 py-1 font-k5-display text-[17px] font-semibold">{left} left</span>
      </div>
      {compYear > 0 && <p className="m-0 text-[15px] font-black text-k5-yx">Free classes for the year: {compYear}</p>}
    </section>
  );
}

const COUNTS = [
  ["Left", "left", "bg-k5-yt text-k5-yx"],
  ["Completed", "completed", "bg-k5-gt text-k5-gx"],
  ["Missed by you", "missedByYou", "bg-k5-rt text-k5-ri"],
  ["Missed by teacher", "missedByTeacher", "bg-k5-pt text-k5-pi"],
  ["Rescheduled", "rescheduled", "bg-k5-ot text-k5-oi"],
];

/**
 * K-5 look of Book Classes (mockup Book a Class): header with your teacher, weekly tickets, the
 * buddy message, the course cards (each in its own calendar colour) and the selected course
 * counts. The booking itself still goes through the same weekly slot picker (BookClassSlotModal):
 * nothing about what gets booked changes.
 */
export function K5BookView({ details, subjects, course, onSelect, onShowBooked, onBook }) {
  const colorFor = useK5CourseColors();
  const year = details.classData?.year?.[0] ?? {};
  const weekCounts = details.classData?.week?.[0] ?? {};
  const perWeek = (weekCounts.comp > 0 ? details.compClassPerweek : weekCounts.extra) || 0;
  const left = Math.max(course.weekLeftClass || 0, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-stretch gap-4">
        <div className="flex-[1_1_340px]">
          <BookHeader teacherName={course.teacherName} />
        </div>
        <Tickets perWeek={perWeek} left={left} compYear={year.comp > 0 ? details.compClassYear : 0} />
      </div>

      <BuddyStrip />

      <section aria-labelledby="k5-pick" className={K5_CARD + " flex flex-col gap-4 px-[22px] py-5"}>
        <h2 id="k5-pick" className="m-0 font-k5-display text-[30px] font-semibold leading-[1.1]">
          {subjects.length === 1 ? "Your course" : "Pick your course"}
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
          {subjects.map((s) => {
            const active = s.subjectId === course.subjectId;
            // The calendar colour of this course; the subject palette only when the calendar has none.
            const color = colorFor({ id: s.subjectId, name: s.name }) || subjectStyle(s.name).color;
            return (
              <button
                key={s.subjectId}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(s.subjectId)}
                className={"relative flex cursor-pointer flex-col items-center gap-2 rounded-3xl border-[3px] p-3.5 text-center text-k5-ink " + (active ? "outline outline-[3px] outline-offset-2 outline-k5-ink" : "")}
                style={{ borderColor: color, background: courseTint(color), boxShadow: "0 " + (active ? 3 : 5) + "px 0 " + color }}
              >
                {active && (
                  <span aria-hidden="true" className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: color }}>
                    <Check className="h-4 w-4" strokeWidth={3.5} />
                  </span>
                )}
                <span className="flex h-[66px] w-[66px] flex-none items-center justify-center rounded-[20px] bg-k5-card" style={{ color }}>
                  <SubjectIcon name={s.name} className="h-9 w-9" />
                </span>
                <span className="font-k5-display text-xl font-semibold leading-tight">{s.name}</span>
                <span className="text-sm font-extrabold text-k5-mut">
                  {s.booked} booked · {s.total} in all
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          {COUNTS.map(([label, key, cls]) => (
            <span key={key} className={"rounded-full px-3.5 py-2 text-[15px] font-black " + cls}>
              {label}: {course[key] ?? 0}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onShowBooked}
            className="min-h-[54px] flex-1 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-6 font-k5-display text-xl font-semibold text-k5-ink shadow-k5-btn"
          >
            My booked classes
          </button>
          <button type="button" onClick={onBook} className={K5_PRIMARY_BTN + " min-h-[54px] flex-1 justify-center" + (left < 1 ? " opacity-60" : "")}>
            Book a class ({left})
          </button>
        </div>
      </section>

      <section aria-labelledby="k5-how" className={K5_CARD + " flex flex-col gap-2 px-[22px] py-4"}>
        <h2 id="k5-how" className="m-0 flex items-center gap-2 font-k5-display text-xl font-semibold">
          <Info className="h-5 w-5 text-k5-acx" aria-hidden="true" /> How it works
        </h2>
        <ol className="m-0 list-decimal pl-6 text-base font-bold text-k5-mut">
          <li>Classes are Monday to Friday.</li>
          <li>
            You can book {perWeek} {details.compClassPerweek > 0 ? "free " : ""}classes in a week.
          </li>
          {details.compClassPerweek > 0 && <li>Free classes you do not book expire at the end of the week.</li>}
        </ol>
      </section>
    </div>
  );
}
