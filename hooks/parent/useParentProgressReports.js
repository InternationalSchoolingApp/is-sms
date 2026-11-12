"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentProgressReports } from "@/services/parentProgressApi";

/**
 * The selected child's progress reports (legacy parentProgress.js list call). `range` = { startDate, endDate }
 * (yyyy-MM-dd) of the Monthly / Weekly / Custom filter, or null for the unfiltered list.
 * failed = null answer or session out; an empty list is "No progress report found".
 */
export function useParentProgressReports(range) {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const startDate = range?.startDate || "";
  const endDate = range?.endDate || "";
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId);
  const query = useQuery({
    queryKey: ["parent-progress-reports", schoolUUID, parentUserId, studentUserId, startDate, endDate],
    queryFn: () => getParentProgressReports({ schoolUUID, studentUserId, startDate, endDate }),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  const sessionOut = String(data?.status) === "3";
  return {
    isLoading: query.isPending && enabled,
    failed: !query.isPending && (!data || sessionOut),
    sessionOut,
    reports: Array.isArray(data?.details?.studentWeeklyProgressReports) ? data.details.studentWeeklyProgressReports : [],
    retry: () => query.refetch(),
  };
}
