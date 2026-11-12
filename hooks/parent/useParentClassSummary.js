"use client";

import { useQuery } from "@tanstack/react-query";
import { useChildScope, readScheduleEnvelope } from "@/hooks/parent/useParentClassSchedule";
import { apiRange } from "@/components/parent/classSchedule/scheduleRows";
import { getParentClassScheduleSummary, getParentClassSummaryDetail } from "@/services/parentClassScheduleApi";

/**
 * The selected child's past classes for the shown days `range` — legacy parentStudentClassSummary.js,
 * POST /dashboard/parent/student-class-schedule-summary. Same shape and key layout as useParentClassSchedule.
 */
export function useParentClassScheduleSummary(range) {
  const { schoolUUID, parentUserId, studentUserId, enabledBase, timeZone } = useChildScope();
  const dates = apiRange(range);
  const enabled = enabledBase && Boolean(dates);

  const query = useQuery({
    queryKey: ["parent-class-schedule-summary", schoolUUID, parentUserId, studentUserId, range?.start ?? null, range?.end ?? null],
    queryFn: () => getParentClassScheduleSummary({ schoolUUID, studentUserId, ...dates }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const { sessionOut, failed, events } = readScheduleEnvelope(query.data, query.isPending || !enabled, timeZone);
  return { isLoading: enabled && query.isPending, sessionOut, failed: enabled && failed, events, timeZone, retry: () => query.refetch() };
}

/**
 * The generated summary of one class (legacy showClassSummaryMeetingSummary), POST /dashboard/parent/student-class-summary.
 * `sections` = [{title, content}]: the overview first, then each summaryDetails { label, summary }. `generating` is
 * the backend's "Summary is being generated" state (no summary yet); `message` is then its summaryMessage.
 * Key = [feature, school, parent, child, meetingId].
 */
export function useParentClassSummaryDetail(meetingId) {
  const { schoolUUID, parentUserId, studentUserId, enabledBase } = useChildScope();
  const id = String(meetingId ?? "").trim();
  const enabled = enabledBase && Boolean(id);

  const query = useQuery({
    queryKey: ["parent-class-summary-detail", schoolUUID, parentUserId, studentUserId, id],
    queryFn: () => getParentClassSummaryDetail({ schoolUUID, studentUserId, meetingId: id }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const data = query.data;
  const code = String(data?.statusCode ?? "");
  const sessionOut = code === "3" || String(data?.status) === "3";
  const details = data?.details && typeof data.details === "object" ? data.details : null;
  const failed = !query.isPending && enabled && !sessionOut && (!data || !details || (code !== "1" && code !== ""));

  const sections = [];
  const overview = String(details?.summary?.summaryOverview ?? "").trim();
  if (overview) sections.push({ title: "Overview", content: overview });
  for (const item of Array.isArray(details?.summaryDetails) ? details.summaryDetails : []) {
    const content = String(item?.summary ?? "").trim();
    if (content) sections.push({ title: String(item?.label ?? "").trim() || "Overview", content });
  }

  return {
    isLoading: enabled && query.isPending,
    sessionOut,
    failed,
    generating: !failed && !sessionOut && sections.length === 0 && String(details?.summaryStatus ?? "").toUpperCase() === "GENERATING",
    message: String(details?.summaryMessage ?? "").trim(),
    sections,
    retry: () => query.refetch(),
  };
}
