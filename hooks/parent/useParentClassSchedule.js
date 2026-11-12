"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentClassSchedule } from "@/services/parentClassScheduleApi";
import { apiRange, toEvents } from "@/components/parent/classSchedule/scheduleRows";
import { resolveTimeZone } from "@/utils/attendanceDates";

/** The current time, refreshed every `intervalMs` (Live / Upcoming badges keep themselves current). */
export function useNow(intervalMs = 15_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** The selected child's scope shared by the Class Schedule and Class Summary hooks. */
export function useChildScope() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  return {
    schoolUUID,
    parentUserId,
    studentUserId,
    enabledBase: Boolean(schoolUUID && parentUserId && studentUserId),
    timeZone: resolveTimeZone(selectedChild?.studentTimezone),
  };
}

/**
 * Reads one schedule envelope. statusCode "3" (or status "3") = session out; null (call failed) or a server /
 * unauthorised code = failed; every other answer, including the FAILED envelope with details.schedule = [] (V001,
 * "not found"), is an empty range.
 */
export function readScheduleEnvelope(data, isPending, timeZone) {
  const code = String(data?.statusCode ?? "");
  const sessionOut = code === "3" || String(data?.status) === "3";
  const items = Array.isArray(data?.details?.schedule) ? data.details.schedule : [];
  const failed = !isPending && !sessionOut && (!data || /^EX/i.test(code) || code === "V003");
  return { sessionOut, failed, events: failed || sessionOut ? [] : toEvents(items, timeZone) };
}

/**
 * The selected child's classes and activities for the shown days `range` {start, end} ("yyyy-MM-dd", the child's
 * calendar) — legacy parentStudentClassSchedule.js, POST /dashboard/parent/student-schedule. `range` null = nothing
 * asked yet (custom range not applied). Key = [feature, school, parent, child, start, end].
 */
export function useParentClassSchedule(range) {
  const { schoolUUID, parentUserId, studentUserId, enabledBase, timeZone } = useChildScope();
  const dates = apiRange(range);
  const enabled = enabledBase && Boolean(dates);

  const query = useQuery({
    queryKey: ["parent-class-schedule", schoolUUID, parentUserId, studentUserId, range?.start ?? null, range?.end ?? null],
    queryFn: () => getParentClassSchedule({ schoolUUID, studentUserId, ...dates }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { sessionOut, failed, events } = readScheduleEnvelope(query.data, query.isPending || !enabled, timeZone);
  return { isLoading: enabled && query.isPending, sessionOut, failed: enabled && failed, events, timeZone, retry: () => query.refetch() };
}
