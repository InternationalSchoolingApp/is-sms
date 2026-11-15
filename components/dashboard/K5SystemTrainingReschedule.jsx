"use client";

import { format } from "date-fns";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { K5DialogShell, K5RescheduleConfirm, K5RescheduleHeader, K5ReschedulePicker, K5RescheduleUsed } from "@/components/k5/panels/K5TrainingParts";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSystemTrainingReschedule } from "@/hooks/useSystemTrainingReschedule";
import { pickerDateToYmd, ymdToPickerDate } from "@/utils/attendanceDates";

/**
 * "Reschedule Your School System Training" as the dialog of the mockup (rsOn / rsAskOn / rsUsedOn), opened over the School
 * System Training popup of the grade looks. The rules are in hooks/useSystemTrainingReschedule.js: the date
 * starts tomorrow, picking a day loads its free times, Confirm saves (with the Yes / No warning before the last free
 * reschedule), and when every free reschedule is used only the "used" message shows. A saved reschedule closes the dialog and
 * the training popup under it shows the new time. `onClose` leaves the dialog (X, Escape, OK).
 */
export function K5SystemTrainingRescheduleDialog({ onClose }) {
  const { context } = useDashboardContext();
  // The student pressed Reschedule: a missed training goes straight to the date / time step too.
  const rs = useSystemTrainingReschedule({ startPicking: true, onSaved: onClose });

  if (rs.query.isFetching || !context?.userId) {
    return (
      <K5DialogShell labelledBy="k5-rs-title" width="max-w-[860px]" onClose={onClose} closeBar={onClose} training>
        <K5Loading label="Loading your School System Training" className="flex flex-col items-center gap-3 px-4 pb-10 pt-2 sm:px-7">
          <K5Sk className="h-8 w-80 max-w-full" />
          <K5Sk className="h-5 w-64 max-w-full" />
          <K5Sk className="h-11 w-72 max-w-full rounded-full" />
          <div className="mt-2 grid w-full max-w-[560px] grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }, (_, i) => (
              <K5Sk key={i} className="h-12 w-full rounded-2xl" />
            ))}
          </div>
        </K5Loading>
      </K5DialogShell>
    );
  }

  if (!rs.data) {
    return (
      <K5DialogShell labelledBy="k5-rs-title" width="max-w-[600px]" onClose={onClose} closeBar={onClose} training>
        <p id="k5-rs-title" className="m-0 px-5 pb-10 pt-2 text-center sm:px-7 text-lg font-extrabold text-k5-ink">
          Your School System Training could not be loaded right now. Please try again shortly.
        </p>
      </K5DialogShell>
    );
  }

  if (rs.limitReached) {
    return (
      <K5DialogShell labelledBy="k5-rsu-title" width="max-w-[600px]" layer="z-[94]" onClose={onClose} closeBar={onClose} training>
        <K5RescheduleUsed
          titleId="k5-rsu-title"
          userName={rs.userName}
          trainingLine={rs.data.orientationdateTimeInStudentTimeZone || `${rs.trainingDate} ${rs.trainingTime}`}
          onOk={onClose}
          chatHref={rs.chatHref}
        />
      </K5DialogShell>
    );
  }

  // A completed training cannot be rescheduled (the training popup is not shown for it either).
  if (!rs.showPicker) return null;

  const pickedSlot = rs.slots.find((s) => s.stTime === rs.slot);
  const newTime = rs.date && pickedSlot ? `${format(ymdToPickerDate(rs.date), "MMM d, yyyy")} ${pickedSlot.label}` : "";
  return (
    <>
      <K5DialogShell labelledBy="k5-rs-title" width="max-w-[860px]" onClose={rs.warnOpen || rs.saving ? undefined : onClose} closeBar={onClose} training header={<K5RescheduleHeader titleId="k5-rs-title" />}>
        <div>
          <K5ReschedulePicker
            hideHeader
            minDate={rs.minDate}
            endDate={new Date(rs.minDate ? rs.minDate.getFullYear() + 2 : new Date().getFullYear() + 2, 11, 31)}
            date={ymdToPickerDate(rs.date)}
            onPickDate={(picked) => {
              rs.setDate(pickerDateToYmd(picked));
              rs.setSlot("");
            }}
            slotsLoading={rs.slotsQuery.isLoading}
            slots={rs.slots}
            slotsMessage={rs.slotsQuery.data?.ok === false ? rs.slotsQuery.data.message : ""}
            slot={rs.slot}
            onPickSlot={rs.setSlot}
            onConfirm={rs.confirm}
            saving={rs.saving}
            firstFree={rs.used === 0}
          />
        </div>
      </K5DialogShell>
      {rs.warnOpen && <K5RescheduleConfirm newTime={newTime} saving={rs.saving} onYes={rs.save} onNo={() => rs.setWarnOpen(false)} />}
    </>
  );
}
