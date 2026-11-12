"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentChildAttendanceDetails } from "@/services/parentAttendanceApi";

/**
 * One page of the selected child's class-by-class attendance (student-attendance-details). The key holds every
 * filter, so a change of filter, dates, status or page is a new request and an older answer never overwrites a
 * newer one; the previous page stays while the next loads. Returns { isLoading, sessionOut, failed, message,
 * details { totalCount, page, pageSize, rows } }. Show row times in the child's timezone (utils/attendanceDates
 * toDisplayRow with resolveTimeZone(selectedChild.studentTimezone)).
 */
export function useParentAttendanceDetails({ dateFilter, fromDate, toDate, status = "ALL", page = 1, enabled = true }) {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const on = Boolean(schoolUUID && parentUserId && studentUserId && fromDate && toDate && enabled);

  const query = useQuery({
    queryKey: ["parent-attendance-details", schoolUUID, parentUserId, studentUserId, dateFilter, fromDate, toDate, status, page],
    queryFn: () => getParentChildAttendanceDetails({ schoolUUID, studentUserId, fromDate, toDate, dateFilter, status, page }),
    enabled: on,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const ok = String(query.data?.statusCode) === "1" && query.data?.details;
  return {
    isLoading: on && query.isPending,
    sessionOut: String(query.data?.statusCode) === "3",
    failed: !query.isPending && !ok,
    message: !ok && query.data?.message ? String(query.data.message) : null,
    details: ok ? query.data.details : null,
  };
}
