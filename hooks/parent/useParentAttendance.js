"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentChildAttendanceFull } from "@/services/parentAttendanceApi";
import { resolveTimeZone } from "@/utils/attendanceDates";

/**
 * The selected child's attendance overview (legacy attendaceByStudentId.js). This endpoint reports its outcome in
 * statusCode ("1" ok, "3" session out), not status. Key = [feature, school, parent, child].
 */
export function useParentAttendance() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId);

  const query = useQuery({
    queryKey: ["parent-attendance", schoolUUID, parentUserId, studentUserId],
    queryFn: () => getParentChildAttendanceFull({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const ok = String(query.data?.statusCode) === "1" && query.data?.details?.summary;
  return {
    isLoading: enabled && query.isPending,
    sessionOut: String(query.data?.statusCode) === "3",
    failed: !query.isPending && !ok,
    summary: ok ? query.data.details.summary : null,
    months: ok && Array.isArray(query.data.details.attendanceOverview) ? query.data.details.attendanceOverview : [],
    timeZone: resolveTimeZone(selectedChild?.studentTimezone),
    retry: () => query.refetch(),
  };
}
