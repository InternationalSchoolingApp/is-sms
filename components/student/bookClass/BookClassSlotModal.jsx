"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { getAssignedTeacherForCourse, getTeacherWeeklySlots, submitBookClassSlot } from "@/services/bookClassApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getDayHeading, getSlotEnd, getSlotState } from "@/utils/bookClass";

const UNKNOWN_OUTCOME =
  "We could not confirm whether your class was booked. Please refresh the page and check your booked classes before trying again.";

const LEGACY_CHIP = "w-[116px] rounded-md border px-2 py-1 text-center text-xs font-bold";
const K5_CHIP = "w-[128px] rounded-full border-[3px] px-2 py-2 text-center text-[15px] font-black";
const K5_CHIP_STYLES = {
  available: "border-k5-grn bg-k5-gt text-k5-gx",
  booked: "border-k5-ri bg-k5-rt text-k5-ri",
  closed: "border-k5-line bg-k5-soft text-k5-mut opacity-70",
};
const LEGACY_CHIP_STYLES = {
  available: "border-green-600 bg-green-100 text-green-700",
  booked: "border-red-600 bg-red-100 text-red-600",
  closed: "border-slate-300 bg-slate-100 text-black/40",
};

function ModalShell({ title, onClose, children, footer, k5 }) {
  if (k5) {
    return (
      <div className="fixed inset-0 z-[85] flex items-center justify-center bg-[rgba(10,16,34,0.55)] p-4">
        <div role="dialog" aria-modal="true" aria-label={title} className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[28px] border-[3px] border-k5-ink bg-k5-card text-k5-ink shadow-[0_8px_0_var(--k5-ink)]">
          <div className="flex items-center gap-3 bg-k5-ac px-5 py-3.5 text-white">
            <h2 className="m-0 min-w-0 flex-1 font-k5-display text-[22px] font-semibold leading-tight">{title}</h2>
            <button type="button" onClick={onClose} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-white bg-k5-red">
              <X className="h-4 w-4 text-white" strokeWidth={3} />
            </button>
          </div>
          <div className="flex-1 overflow-auto p-5 text-base font-bold text-k5-ink">{children}</div>
          {footer && <div className="border-t-[3px] border-k5-line bg-k5-soft px-5 py-3">{footer}</div>}
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-2xl bg-white shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-700"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="rounded-t-2xl bg-primary px-5 py-3 pr-10 text-base font-extrabold text-white">{title}</h2>
        <div className="flex-1 overflow-auto p-5 text-sm text-black">{children}</div>
        {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/**
 * Weekly slot picker + confirmation for one course — legacy
 * bookingSlotModalNew -> weeklyBookClassModal -> weeklyBookClassConfirmationModal.
 * Shows only the current week (legacy has no week navigation).
 */
export function BookClassSlotModal({ course, onClose, onBooked }) {
  const { isK5 } = useDashboardContext();
  const CHIP = isK5 ? K5_CHIP : LEGACY_CHIP;
  const CHIP_STYLES = isK5 ? K5_CHIP_STYLES : LEGACY_CHIP_STYLES;
  const primaryBtn = isK5
    ? "min-h-12 cursor-pointer rounded-full border-none bg-k5-ac px-6 font-k5-display text-lg font-semibold text-white shadow-[0_4px_0_var(--k5-acd)] disabled:opacity-40"
    : "rounded-lg bg-primary px-5 py-2 font-bold text-white disabled:opacity-40";
  const backBtn = isK5
    ? "min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-6 font-k5-display text-lg font-semibold text-k5-ink disabled:opacity-50"
    : "rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50";
  const confirmBtn = isK5
    ? "min-h-12 cursor-pointer rounded-full border-none bg-k5-grn px-6 font-k5-display text-lg font-semibold text-white shadow-[0_4px_0_var(--k5-grnD)] disabled:opacity-50"
    : "rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50";
  const [startDate] = useState(() => new Date().toISOString());
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("slots");
  const [submitting, setSubmitting] = useState(false);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const inFlight = useRef(false);

  // Dummy (demo) student mode: legacy getDummyAssignedTeacherDetailsResponse / getDummyTeacherWeeklyCalendarResponse /
  // getDummyStudentBookClassSubmitResponse (nothing is really booked).
  const dummy = useDummyStudent();
  const teacherQuery = useQuery({
    queryKey: ["book-class-teacher", course.subjectId, course.studentStandardId, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.assignedTeacher(course.subjectId)
        : getAssignedTeacherForCourse({ subjectId: course.subjectId, studentStandardId: course.studentStandardId }),
    enabled: dummy.settled,
    staleTime: 0,
  });
  const teacher = teacherQuery.data;
  const teacherAssigned = teacher?.teacherAssigned === "YES";

  const slotsQuery = useQuery({
    queryKey: ["book-class-slots", teacher?.assignedTeacherUserId, course.subjectId, startDate, dummy.key],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.teacherWeeklyCalendar(teacher.assignedTeacherUserId, course.subjectId, new Date(startDate))
        : getTeacherWeeklySlots({
            teacherUserId: teacher.assignedTeacherUserId,
            studentStandardId: teacher.studentStandardId ?? course.studentStandardId,
            subjectId: course.subjectId,
            startDate,
          }),
    enabled: teacherAssigned,
    staleTime: 0,
  });
  const slots = slotsQuery.data;
  const week = slots?.teacherWeeklyTimeCurrLiveClass?.teacherAssignTimeWeekList?.[0];
  const days = week?.teacherAllDataInOneList ?? [];
  const skipDates = new Set(slots?.skipDateList ?? []);

  const loading = teacherQuery.isLoading || (teacherAssigned && slotsQuery.isLoading);
  const subjectName = slots?.subjectName || teacher?.subjectName || course.name;
  const teacherName = slots?.teacherName || teacher?.teacherName || "";
  const end = selected ? getSlotEnd(selected.slot.bookedStartDate, slots?.classDuration) : null;

  async function confirmBooking() {
    if (inFlight.current || outcomeUnknown) return;
    inFlight.current = true;
    setSubmitting(true);
    const result = dummy.enabled
      ? dummy.student.bookClassSubmit()
      : await submitBookClassSlot({
          meetingDate: selected.slot.bookedStartDate,
          meetingEndDate: end?.endDateTime,
          subjectId: course.subjectId,
          studentStandardId: teacher?.studentStandardId ?? course.studentStandardId,
          teacherUserId: slots.teacherUserId,
        });
    inFlight.current = false;
    setSubmitting(false);
    if (!result) {
      // The request may have reached the server: keep Confirm locked so a retry can't double-book.
      setOutcomeUnknown(true);
      toast.error(UNKNOWN_OUTCOME);
      return;
    }
    if (result.status === "1") {
      toast.success(result.message || "Your class has been booked.");
      onBooked();
      return;
    }
    toast.error(result.message || "Unable to book this class. Please try again.");
  }

  if (loading) {
    return (
      <ModalShell k5={isK5} title="Book a Class" onClose={onClose}>
        <p className="py-10 text-center text-black/60">Loading available slots…</p>
      </ModalShell>
    );
  }

  if (!teacher || !teacherAssigned) {
    return (
      <ModalShell k5={isK5} title="Book a Class" onClose={onClose}>
        <p className="py-10 text-center text-black/60">
          {teacher ? "You do not have a teacher assigned yet" : "Unable to load teacher details. Please try again."}
        </p>
      </ModalShell>
    );
  }

  if (!week) {
    return (
      <ModalShell k5={isK5} title={`Book a Class for ${subjectName}`} onClose={onClose}>
        <p className="py-10 text-center text-black/60">No class slots are available for this week.</p>
      </ModalShell>
    );
  }

  if (step === "confirm" && selected) {
    return (
      <ModalShell k5={isK5}
        title="Confirm your class"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep("slots")}
              disabled={submitting}
              className={backBtn}
            >
              Back
            </button>
            <button
              type="button"
              onClick={confirmBooking}
              disabled={submitting || outcomeUnknown}
              className={confirmBtn}
            >
              {submitting ? "Booking..." : "Confirm"}
            </button>
          </div>
        }
      >
        <dl className="mx-auto max-w-md space-y-2">
          {[
            ["Course", subjectName],
            ["Teacher", teacherName],
            ["Date", selected.day.displayStartDateWithoutDay],
            ["Time", `${selected.slot.displayStartTime} - ${end?.endTime ?? ""}`],
            ["Timezone", slots.timeZoneName],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-slate-100 py-1.5">
              <dt className="text-black/60">{label}</dt>
              <dd className="text-right font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        {outcomeUnknown && <p className="mt-4 text-center font-semibold text-red-600">{UNKNOWN_OUTCOME}</p>}
      </ModalShell>
    );
  }

  return (
    <ModalShell k5={isK5}
      title={`Book a Class for ${subjectName} with ${teacherName}`}
      onClose={onClose}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold">
            <span className="flex items-center gap-1"><span className={`h-5 w-10 rounded border ${CHIP_STYLES.available}`} />Available</span>
            <span className="flex items-center gap-1"><span className={`h-5 w-10 rounded border ${CHIP_STYLES.booked}`} />Booked</span>
            <span className="flex items-center gap-1"><span className={`h-5 w-10 rounded border ${CHIP_STYLES.closed}`} />Not Available</span>
          </div>
          <button
            type="button"
            disabled={!selected}
            onClick={() => setStep("confirm")}
            className={primaryBtn}
          >
            Next
          </button>
        </div>
      }
    >
      <p className="mb-3 font-bold">
        {teacherName}&apos;s weekly class slots from {week.weeklyStartDateStandardFormat} to {week.weeklyEndDateStandardFormat}**
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full border-separate border-spacing-1">
          <thead>
            <tr>
              {days.map((day) => {
                const { dateText, dayName } = getDayHeading(day);
                return (
                  <th key={day.displayStartDateWithoutDay} className="rounded bg-slate-100 px-1 py-2 text-center text-xs">
                    <div className="font-bold">{dateText}</div>
                    <div className="mt-1 uppercase">{dayName}</div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <tr>
              {days.map((day) => {
                const list = day.dayWiseAllData ?? [];
                const skipped = list.length > 0 && skipDates.has(list[0].bookedDate);
                return (
                  <td key={day.displayStartDateWithoutDay} className="align-top">
                    {list.length === 0 || skipped ? (
                      <div className="text-center text-black/40">----</div>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {list.map((slot, slotIdx) => {
                          const state = getSlotState(slot, day, slots);
                          const isSelected = selected?.slot === slot;
                          if (state !== "available") {
                            return (
                              <div key={`${slot.bookedStartDate}-${slotIdx}`} className={`${CHIP} ${CHIP_STYLES[state]}`}>
                                {slot.displayStartTime}
                              </div>
                            );
                          }
                          return (
                            <button
                              key={`${slot.bookedStartDate}-${slotIdx}`}
                              type="button"
                              onClick={() => setSelected({ slot, day })}
                              aria-pressed={isSelected}
                              className={`${CHIP} ${CHIP_STYLES.available} ${isSelected ? "ring-2 ring-green-700 ring-offset-1" : ""}`}
                            >
                              {slot.displayStartTime}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 font-bold">
        <span>**All slots are in the {slots.timeZoneName} timezone</span>
        <span>**Duration of each class is {slots.classDuration} minutes</span>
      </div>
    </ModalShell>
  );
}
