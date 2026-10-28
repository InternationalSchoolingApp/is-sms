"use client";

import { useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { getAssignedTeacherForCourse, getTeacherWeeklySlots, submitBookClassSlot } from "@/services/bookClassApi";
import { getDayHeading, getSlotEnd, getSlotState } from "@/utils/bookClass";

const UNKNOWN_OUTCOME =
  "We could not confirm whether your class was booked. Please refresh the page and check your booked classes before trying again.";

const CHIP = "w-[116px] rounded-md border px-2 py-1 text-center text-xs font-bold";
const CHIP_STYLES = {
  available: "border-green-600 bg-green-100 text-green-700",
  booked: "border-red-600 bg-red-100 text-red-600",
  closed: "border-slate-300 bg-slate-100 text-black/40",
};

function ModalShell({ title, onClose, children, footer }) {
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
  const [startDate] = useState(() => new Date().toISOString());
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState("slots");
  const [submitting, setSubmitting] = useState(false);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const inFlight = useRef(false);

  const teacherQuery = useQuery({
    queryKey: ["book-class-teacher", course.subjectId, course.studentStandardId],
    queryFn: () => getAssignedTeacherForCourse({ subjectId: course.subjectId, studentStandardId: course.studentStandardId }),
    staleTime: 0,
  });
  const teacher = teacherQuery.data;
  const teacherAssigned = teacher?.teacherAssigned === "YES";

  const slotsQuery = useQuery({
    queryKey: ["book-class-slots", teacher?.assignedTeacherUserId, course.subjectId, startDate],
    queryFn: () =>
      getTeacherWeeklySlots({
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
    const result = await submitBookClassSlot({
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
      <ModalShell title="Book a Class" onClose={onClose}>
        <p className="py-10 text-center text-black/60">Loading available slots…</p>
      </ModalShell>
    );
  }

  if (!teacher || !teacherAssigned) {
    return (
      <ModalShell title="Book a Class" onClose={onClose}>
        <p className="py-10 text-center text-black/60">
          {teacher ? "You do not have a teacher assigned yet" : "Unable to load teacher details. Please try again."}
        </p>
      </ModalShell>
    );
  }

  if (!week) {
    return (
      <ModalShell title={`Book a Class for ${subjectName}`} onClose={onClose}>
        <p className="py-10 text-center text-black/60">No class slots are available for this week.</p>
      </ModalShell>
    );
  }

  if (step === "confirm" && selected) {
    return (
      <ModalShell
        title="Confirm your class"
        onClose={onClose}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setStep("slots")}
              disabled={submitting}
              className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 disabled:opacity-50"
            >
              Back
            </button>
            <button
              type="button"
              onClick={confirmBooking}
              disabled={submitting || outcomeUnknown}
              className="rounded-lg bg-green-600 px-4 py-2 font-bold text-white hover:bg-green-700 disabled:opacity-50"
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
    <ModalShell
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
            className="rounded-lg bg-primary px-5 py-2 font-bold text-white disabled:opacity-40"
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
                        {list.map((slot) => {
                          const state = getSlotState(slot, day, slots);
                          const isSelected = selected?.slot === slot;
                          if (state !== "available") {
                            return (
                              <div key={slot.bookedStartDate} className={`${CHIP} ${CHIP_STYLES[state]}`}>
                                {slot.displayStartTime}
                              </div>
                            );
                          }
                          return (
                            <button
                              key={slot.bookedStartDate}
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
