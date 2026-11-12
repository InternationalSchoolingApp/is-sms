"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentGradebookReport } from "@/services/parentProgressApi";

/**
 * Progress "View" — one gradebook report of the selected child (legacy get-user-gradebook page, fetched as JSON).
 * params = the row's readable payload with the date search applied; rawPayload = the list's encrypted payload for
 * the first view; range = the list filter the row came from (the server re-checks the row against it).
 */
export function useParentGradebookReport({ params, rawPayload, range }) {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const startDate = range?.startDate || "";
  const endDate = range?.endDate || "";
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId && (params?.data || rawPayload));
  const query = useQuery({
    queryKey: ["parent-gradebook-report", schoolUUID, parentUserId, studentUserId, params, params?.data ? "" : rawPayload, startDate, endDate],
    queryFn: () => getParentGradebookReport({ schoolUUID, studentUserId, params, rawPayload, startDate, endDate }),
    enabled,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
  return { isLoading: query.isPending && enabled, report: query.data ?? null, failed: !query.isPending && !query.data };
}
