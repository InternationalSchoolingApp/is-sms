"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentChildFeeDetails, getParentChildOverview, getParentChildSchedule } from "@/services/parentDashboardApi";
import { resolveTimeZone, todayYmd } from "@/utils/attendanceDates";

// Every key carries the parent AND the selected child, so switching child refetches and two parents never share rows.
function useHomeScope() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  return { schoolUUID, parentUserId, studentUserId, enabled: Boolean(schoolUUID && parentUserId && studentUserId), child: selectedChild };
}

/** The selected child's overview (student, KPIs, attendance and grade series). */
export function useParentChildOverview() {
  const { schoolUUID, parentUserId, studentUserId, enabled } = useHomeScope();
  const query = useQuery({
    queryKey: ["parent-overview", schoolUUID, parentUserId, studentUserId],
    queryFn: () => getParentChildOverview({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
  const ok = String(query.data?.statusCode) === "1" && query.data?.details;
  return { isLoading: query.isPending && enabled, failed: !query.isPending && !ok, details: ok ? query.data.details : null, retry: () => query.refetch() };
}

/** The selected child's classes and activities for today (in the child's timezone). */
export function useParentChildSchedule() {
  const { schoolUUID, parentUserId, studentUserId, enabled, child } = useHomeScope();
  const timeZone = resolveTimeZone(child?.studentTimezone);
  const today = todayYmd(timeZone);
  const query = useQuery({
    queryKey: ["parent-schedule", schoolUUID, parentUserId, studentUserId, today],
    queryFn: () => getParentChildSchedule({ schoolUUID, studentUserId, startDate: today, endDate: today }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  // With no rows the backend answers FAILED but still sends details.schedule = [] — that is an empty day, not an error.
  const schedule = Array.isArray(query.data?.details?.schedule) ? query.data.details.schedule : [];
  return { isLoading: query.isPending && enabled, failed: !query.isPending && !query.data, schedule, timeZone };
}

/** The selected child's fee rows (null details = no payments). */
export function useParentChildFees() {
  const { schoolUUID, parentUserId, studentUserId, enabled } = useHomeScope();
  const query = useQuery({
    queryKey: ["parent-fees", schoolUUID, parentUserId, studentUserId],
    queryFn: () => getParentChildFeeDetails({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
  const rows = Array.isArray(query.data?.details?.userPaymentDetailsList) ? query.data.details.userPaymentDetailsList : [];
  return { isLoading: query.isPending && enabled, failed: !query.isPending && !query.data, rows };
}
