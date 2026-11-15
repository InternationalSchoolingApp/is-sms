"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { getSystemTrainingDetails } from "@/services/systemTrainingApi";
import { getTrainingSlots, rescheduleSystemTraining } from "@/services/onboardingGateApi";
import { pickerDateToYmd, todayYmd, ymdToPickerDate } from "@/utils/attendanceDates";
import { expireSession } from "@/utils/logout";

/**
 * The rules of "Reschedule Your School System Training" - legacy /join-orientation?clickFrom=RESCHEDULE (Orientation.jsp,
 * saveType RESH). Used by the reschedule DIALOG (components/dashboard/K5SystemTrainingReschedule.jsx, opened from the training popup):
 *  - COMPLETED: no rescheduling. RESCHEDULE (the student missed it): the date / time step opens once the student asks for it.
 *  - every free reschedule used (rescheduleNumber == totalRescheduleNumber): no date / time step, only the "used" message.
 *  - the date starts tomorrow (in the student's time zone); picking a date loads its free times; Confirm saves; on the last
 *    free reschedule (rescheduleNumber == totalRescheduleNumber - 1) a Yes / No warning comes first.
 * `startPicking`: open straight on the date / time step (the dialog is opened by the student's own Reschedule click).
 * `onSaved`: called after a successful save (the dialog closes itself there).
 */

// "Nov 17, 2026 09:30 AM" -> { date: "Nov 17, 2026", time: "09:30 AM" }.
function splitDateTime(value) {
  const m = /^(.+\d{4})\s+(.+)$/.exec(String(value || "").trim());
  return m ? { date: m[1], time: m[2] } : { date: String(value || ""), time: "" };
}

// The next day of a "yyyy-MM-dd" date.
function nextDay(ymd) {
  const d = ymdToPickerDate(ymd);
  if (!d) return undefined;
  d.setDate(d.getDate() + 1);
  return d;
}

export function useSystemTrainingReschedule({ startPicking = false, onSaved } = {}) {
  const { context } = useDashboardContext();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["system-training-details", context?.schoolUUID, context?.userId],
    queryFn: () => getSystemTrainingDetails(),
    enabled: Boolean(context?.userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const data = query.data;

  const [picking, setPicking] = useState(startPicking);
  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState("");
  const [warnOpen, setWarnOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const slotsQuery = useQuery({
    queryKey: ["system-training-slots", context?.userId, date],
    queryFn: () => getTrainingSlots(date),
    enabled: Boolean(date),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const slots = slotsQuery.data?.ok ? slotsQuery.data.data.slots : [];

  const userName = data?.studentName || context?.userName || "";
  const status = data?.orientStatus;
  const used = Number(data?.orientationRescheduleNumber || 0);
  const total = Number(data?.orientationTotalRescheduleNumber || 1);
  const limitReached = used === total;
  const lastFree = used === total - 1;
  const { date: trainingDate, time: trainingTime } = splitDateTime(data?.orientationdateTimeInStudentTimeZone);
  const minDate = nextDay(todayYmd(data?.userTimezone));
  const chatHref = context?.chatUrl && context?.uniqueId ? `${context.chatUrl}/onboarding-support?uuid=${context.uniqueId}` : "";
  // PENDING (or anything not RESCHEDULE / COMPLETED): the date / time step straight away (legacy clickFrom RESCHEDULE).
  const showPicker = !limitReached && status !== "COMPLETED" && (status !== "RESCHEDULE" || picking);

  async function save() {
    if (!date) {
      toast.error("Please select your system training date.");
      return;
    }
    if (!slot) {
      toast.error("Please select your system training time.");
      return;
    }
    setSaving(true);
    const result = await rescheduleSystemTraining({ date, stTime: slot });
    setSaving(false);
    setWarnOpen(false);
    if (result?.sessionExpired) {
      expireSession(context.schoolUUID);
      return;
    }
    if (!result?.ok) {
      toast.error(result?.message || "Your training could not be rescheduled.");
      return;
    }
    toast.success(result.data?.message || "Your School System Training has been rescheduled.");
    // Legacy: location.reload() - the page shows the new state (one more reschedule used).
    setDate(null);
    setSlot("");
    setPicking(false);
    queryClient.invalidateQueries({ queryKey: ["system-training-details"] });
    queryClient.invalidateQueries({ queryKey: ["system-training-popup"] });
    onSaved?.();
  }

  function confirm() {
    if (!slot) {
      toast.error("Please choose a slot");
      return;
    }
    if (lastFree) setWarnOpen(true);
    else save();
  }

  return {
    query,
    data,
    picking,
    setPicking,
    date,
    setDate,
    slot,
    setSlot,
    warnOpen,
    setWarnOpen,
    saving,
    slotsQuery,
    slots,
    userName,
    status,
    used,
    total,
    limitReached,
    lastFree,
    trainingDate,
    trainingTime,
    minDate,
    chatHref,
    showPicker,
    save,
    confirm,
  };
}
