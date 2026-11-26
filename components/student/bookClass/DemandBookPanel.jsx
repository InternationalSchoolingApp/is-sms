"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getAssignedTeacherForCourse, getDemandBookingOptions, linkDemandBooking, requestDemandSlot, submitBookClassSlot } from "@/services/bookClassApi";
import { hhmmOf, labelOf, newDemandSessionId, rememberDemandSession, timeGroups } from "@/utils/demandBooking";

const UNKNOWN_OUTCOME =
  "We could not confirm whether your class was booked. Please refresh the page and check your booked classes before trying again.";

const LOOK = {
  legacy: {
    label: "mb-2 block text-base font-bold text-black",
    day: "flex cursor-pointer flex-col items-center rounded-lg border border-primary bg-white px-1 py-2 text-primary hover:bg-primary/10",
    daySel: "flex cursor-pointer flex-col items-center rounded-lg border border-primary bg-primary px-1 py-2 text-white",
    dayOff: "flex cursor-not-allowed flex-col items-center rounded-lg border border-transparent bg-slate-100 px-1 py-2 text-slate-400",
    chip: "cursor-pointer rounded-md border border-primary bg-white py-1 text-sm text-primary hover:bg-primary/10",
    chipSel: "cursor-pointer rounded-md border border-primary bg-primary py-1 text-sm text-white",
    chipOff: "cursor-not-allowed rounded-md border border-slate-200 bg-slate-100 py-1 text-sm text-slate-400",
    btn: "cursor-pointer rounded-lg border-none bg-primary px-5 py-2 text-sm font-bold text-white disabled:opacity-50",
    ghost: "cursor-pointer rounded-lg border border-primary bg-white px-4 py-2 text-sm font-bold text-primary",
    ok: "cursor-pointer rounded-lg border-none bg-green-600 px-5 py-2 text-sm font-bold text-white disabled:opacity-50",
    cancel: "cursor-pointer rounded-lg border-none bg-red-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50",
    bar: "flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3",
    alt: "cursor-pointer rounded-md border border-green-600 bg-green-100 px-3 py-1.5 text-sm text-black hover:bg-green-200",
    box: "rounded-xl border border-slate-200 bg-white p-4 text-sm text-black",
    taken: "rounded border border-red-600 bg-red-100 px-2 py-0.5 font-bold text-black",
    note: "text-sm font-semibold text-black/70",
  },
  k5: {
    label: "mb-2 block font-k5-display text-xl font-semibold text-k5-ink",
    day: "flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-3xl border-[3px] border-k5-line bg-k5-card text-k5-ink",
    daySel: "flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-3xl border-[3px] border-k5-ac bg-k5-ac text-white",
    dayOff: "flex min-h-20 cursor-not-allowed flex-col items-center justify-center rounded-3xl border-[3px] border-k5-line bg-k5-soft text-k5-mut opacity-60",
    chip: "min-h-11 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card text-[15px] font-black text-k5-ink",
    chipSel: "min-h-11 cursor-pointer rounded-full border-[3px] border-k5-ac bg-k5-ac text-[15px] font-black text-white",
    chipOff: "min-h-11 cursor-not-allowed rounded-full border-[3px] border-k5-line bg-k5-soft text-[15px] font-black text-k5-mut opacity-60",
    btn: "min-h-12 cursor-pointer rounded-full border-none bg-k5-ac px-6 font-k5-display text-lg font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:opacity-50",
    ghost: "min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-6 font-k5-display text-lg font-semibold text-k5-ink",
    ok: "min-h-12 cursor-pointer rounded-full border-none bg-k5-grn px-6 font-k5-display text-lg font-semibold text-white shadow-[0_4px_0_var(--k5-grnD)] disabled:opacity-50",
    cancel: "min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-6 font-k5-display text-lg font-semibold text-k5-ink",
    bar: "flex flex-wrap items-center gap-4 rounded-3xl bg-k5-yt px-4 py-3.5",
    alt: "min-h-11 cursor-pointer rounded-full border-[3px] border-k5-grn bg-k5-gt px-4 text-[15px] font-black text-k5-gx",
    box: "rounded-3xl border-[3px] border-k5-line bg-k5-card p-4 font-bold text-k5-ink",
    taken: "rounded-full border-[3px] border-k5-ri bg-k5-rt px-3 font-black text-k5-ink",
    note: "text-sm font-extrabold text-k5-mut",
  },
};

function dayParts(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return {
    weekday: d.toLocaleDateString("en-US", { weekday: "short" }),
    num: d.getDate(),
    month: d.toLocaleDateString("en-US", { month: "short" }),
    long: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "2-digit", year: "numeric" }),
  };
}

/**
 * Demand-based booking: the student picks a date and a time first; the request is saved as demand and the
 * answer is the slot (confirm straight away), the nearest free slots, or "fully booked". "View all slots"
 * hands over to the existing weekly grid. With DEMAND_BOOKING_ENABLED = N it calls onDisabled.
 */
export function DemandBookPanel({ options, k5 = false, subjectLast = false, fixedDate = null, onChoose, onStage, onViewAll, onBooked, onDisabled }) {
  const look = k5 ? LOOK.k5 : LOOK.legacy;
  const [course, setCourse] = useState(options.length === 1 || subjectLast ? options[0] : null);
  const [subject, setSubject] = useState(null);
  const [date, setDate] = useState(fixedDate);
  const [time, setTime] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmSlot, setConfirmSlot] = useState(null);
  const [busy, setBusy] = useState(false);
  const [unknown, setUnknown] = useState(false);
  const sessionId = useRef(newDemandSessionId());

  useEffect(() => {
    onStage?.(confirmSlot || result ? 3 : date ? 2 : 1);
  }, [confirmSlot, result, date, onStage]);

  const teacherQuery = useQuery({
    queryKey: ["demand-teacher", course?.subjectId, course?.studentStandardId],
    queryFn: () => getAssignedTeacherForCourse({ subjectId: course.subjectId, studentStandardId: course.studentStandardId }),
    enabled: Boolean(course),
    staleTime: 0,
  });
  const teacher = teacherQuery.data;
  const assigned = teacher?.teacherAssigned === "YES";
  const ssId = teacher?.studentStandardId ?? course?.studentStandardId;

  const optsQuery = useQuery({
    queryKey: ["demand-options", ssId, course?.subjectId, teacher?.assignedTeacherUserId],
    queryFn: () => getDemandBookingOptions({ studentStandardId: ssId, subjectId: course.subjectId, teacherUserId: teacher.assignedTeacherUserId }),
    enabled: Boolean(course && assigned),
    staleTime: 0,
  });
  const opts = optsQuery.data;

  useEffect(() => {
    if (optsQuery.isSuccess && (!opts || !opts.enabled || !opts.days)) onDisabled?.(course);
  }, [optsQuery.isSuccess, opts, course, onDisabled]);

  function pickCourse(option) {
    setCourse(option);
    setDate(null);
    setTime(null);
    setResult(null);
  }

  function pickAnother() {
    setTime(null);
    setResult(null);
    setConfirmSlot(null);
  }

  async function ask() {
    if (!date || !time || busy) return;
    setBusy(true);
    rememberDemandSession(ssId, sessionId.current);
    const r = await requestDemandSlot({
      studentStandardId: ssId,
      subjectId: course.subjectId,
      teacherUserId: teacher.assignedTeacherUserId,
      date,
      time,
      sessionId: sessionId.current,
    });
    setBusy(false);
    if (!r || r.error) {
      toast.error(r?.error || "Something went wrong. Please try again.");
      return;
    }
    if (r.result === "AVAILABLE") {
      if (onChoose) onChoose(r.requested, course);
      else setConfirmSlot(r.requested);
      return;
    }
    setResult(r);
  }

  async function confirm() {
    if (busy || unknown || !confirmSlot || (subjectLast && !subject)) return;
    setBusy(true);
    const res = await submitBookClassSlot({
      meetingDate: confirmSlot.meetingStart,
      meetingEndDate: confirmSlot.meetingEnd,
      subjectId: (subjectLast ? subject : course).subjectId,
      studentStandardId: subjectLast ? subject.studentStandardId ?? ssId : ssId,
      teacherUserId: teacher.assignedTeacherUserId,
    });
    setBusy(false);
    if (!res) {
      setUnknown(true);
      toast.error(UNKNOWN_OUTCOME);
      return;
    }
    if (res.status !== "1") {
      toast.error(res.message || "Unable to book this class. Please try again.");
      return;
    }
    rememberDemandSession(null, null);
    linkDemandBooking({ studentStandardId: ssId, sessionId: sessionId.current, meetingStart: confirmSlot.meetingStart }).catch(() => {});
    toast.success(res.message || "Your class has been booked.");
    onBooked?.({ option: subjectLast ? subject : course, slot: confirmSlot, teacherName: opts?.teacherName });
  }

  if (!course) {
    return (
      <div>
        <span className={look.label}>Choose a course</span>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
          {options.map((o) => (
            <button key={o.subjectId} type="button" onClick={() => pickCourse(o)} className={look.chip}>
              {o.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (teacherQuery.isLoading || (assigned && optsQuery.isLoading)) return <p className={`py-8 text-center ${look.note}`}>Loading…</p>;
  if (!assigned) return <p className={`py-8 text-center ${look.note}`}>{teacher ? "You do not have a teacher assigned yet" : "Unable to load teacher details. Please try again."}</p>;
  if (!opts?.days) return null;

  const duration = Number(opts.duration) || 50;
  const courseSwitch =
    options.length > 1 && !subjectLast ? (
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className={look.note}>Course:</span>
        {options.map((o) => (
          <button key={o.subjectId} type="button" onClick={() => pickCourse(o)} className={o.subjectId === course.subjectId ? look.chipSel : look.chip} style={{ padding: "0 14px" }}>
            {o.name}
          </button>
        ))}
      </div>
    ) : null;
  const notes = (
    <p className={`mt-3 ${look.note}`}>
      Times are in {opts.timezone}. Each class is {duration} minutes.
    </p>
  );

  if (confirmSlot) {
    return (
      <div className={look.box}>
        <p className={`${look.label} mb-3`}>Confirm Booking</p>
        {subjectLast && (
          <div className="mb-3">
            <span className={look.label}>Choose a course</span>
            <div className="flex flex-wrap gap-2">
              {options.map((o) => (
                <button key={o.subjectId} type="button" onClick={() => setSubject(o)} className={subject?.subjectId === o.subjectId ? look.chipSel : look.chip} style={{ padding: "0 14px" }}>
                  {o.name}
                </button>
              ))}
            </div>
          </div>
        )}
        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
          {[
            ["Course", subjectLast ? subject?.name || "Choose a course above" : opts.subjectName || course.name],
            ["Teacher", opts.teacherName],
            ["Date", confirmSlot.dateLabel],
            [`Time (${opts.timezone})`, `${confirmSlot.startLabel} – ${confirmSlot.endLabel}`],
            ["Duration", `${duration} minutes`],
          ].map(([k, v]) => (
            <div key={k} className="border-b border-slate-200 pb-1.5">
              <dt className={look.note}>{k}</dt>
              <dd className="m-0 font-bold">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={pickAnother} disabled={busy} className={look.cancel}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={busy || unknown || (subjectLast && !subject)} className={look.ok}>
            {busy ? "Booking…" : "Confirm"}
          </button>
        </div>
      </div>
    );
  }

  if (result) {
    const q = result.requested;
    return (
      <div className={look.box}>
        {result.result === "NEAREST" ? (
          <>
            <p className="m-0 mb-3">
              Oh no! <span className={look.taken}>{q.startLabel} on {q.dateLabel}</span> is already taken with {opts.teacherName}. Here are the closest free
              slots — just tap one to book it:
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {result.nearest.map((s) => (
                <button key={s.meetingStart} type="button" onClick={() => (onChoose ? onChoose(s, course) : setConfirmSlot(s))} className={look.alt}>
                  {s.dateLabel} · <b>{s.startLabel}</b>
                </button>
              ))}
            </div>
          </>
        ) : (
          <p className="m-0 mb-4">{opts.teacherName} is fully booked this week. Please try another week.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => onViewAll?.(course)} className={look.ghost}>
            View all slots
          </button>
          <button type="button" onClick={pickAnother} className={look.btn}>
            Pick another time
          </button>
        </div>
      </div>
    );
  }

  const initials = (opts.teacherName || "")
    .split(" ")
    .map((w) => w.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const chosen = date ? dayParts(date) : null;

  return (
    <div>
      {courseSwitch}
      {!fixedDate && <span className={look.label}>Choose a date</span>}
      <div className={fixedDate ? "hidden" : "grid grid-cols-4 gap-2 sm:grid-cols-7"}>
        {opts.days.map((d) => {
          const p = dayParts(d.date);
          return (
            <button
              key={d.date}
              type="button"
              disabled={d.past}
              onClick={() => {
                setDate(d.date);
                setTime(null);
              }}
              className={d.past ? look.dayOff : d.date === date ? look.daySel : look.day}
            >
              <small className="text-xs">{p.weekday}</small>
              <b className="text-xl leading-tight">{p.num}</b>
              <small className="text-xs">{p.month}</small>
            </button>
          );
        })}
      </div>

      {date && (
        <div className="mt-4">
          {!fixedDate && <span className={look.label}>Choose your preferred time</span>}
          {timeGroups(opts.pickerFrom, opts.pickerTo, opts.pickerStep).map((g) => (
            <div key={g.label} className="mb-2">
              <span className="mb-1 block text-sm font-bold">{g.label}</span>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(88px,1fr))] gap-1.5">
                {g.times.map((m) => {
                  const t = hhmmOf(m);
                  const past = `${date} ${t}:00` < opts.earliest;
                  return (
                    <button key={t} type="button" disabled={past} onClick={() => setTime(t)} className={past ? look.chipOff : t === time ? look.chipSel : look.chip}>
                      {labelOf(m)}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {date && time && (
        <div className={`mt-4 ${look.bar}`}>
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-white font-bold text-black">{initials}</span>
          <div className="min-w-0">
            <b className="block">{opts.teacherName}</b>
            <span className="text-sm">
              {opts.subjectName || course.name}
              {opts.gradeName ? ` · ${opts.gradeName}` : ""}
            </span>
          </div>
          <div className="min-w-0">
            <b className="block">{chosen.long}</b>
            <span className="text-sm">
              {labelOf(Number(time.slice(0, 2)) * 60 + Number(time.slice(3)))} – {labelOf(Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + duration)}
            </span>
          </div>
          <button type="button" onClick={ask} disabled={busy} className={`ml-auto ${look.btn}`}>
            {busy ? "Checking…" : "Book Class"}
          </button>
        </div>
      )}
      {notes}
    </div>
  );
}
