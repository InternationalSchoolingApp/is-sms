"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentAcademicPerformance } from "@/services/parentPerformanceApi";
import { expireSession } from "@/utils/logout";

/**
 * The selected child's courses for the parent's Academic Performance page. Key = [feature, school, parent, child].
 * No k5Performance (legacy parent never sends it, even for a K5 child). Rows are only populated for Agilix Buzz
 * providers; other providers answer an empty list (an empty state, not an error). A null answer or a non-success
 * status is `failed`; status "3" (session out) sends the parent to the login page.
 */
export function useParentAcademicPerformance() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const childUserId = selectedChild ? String(selectedChild.userId) : null;
  const studentStandardId = selectedChild?.studentStandardId;
  const enabled = Boolean(schoolUUID && parentUserId && childUserId);

  const query = useQuery({
    queryKey: ["parent-academic-performance", schoolUUID, parentUserId, childUserId, studentStandardId ?? null],
    queryFn: () => getParentAcademicPerformance({ schoolUUID, studentUserId: childUserId, studentStandardId }),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const sessionOut = String(query.data?.status) === "3";
  useEffect(() => {
    if (sessionOut && schoolUUID) expireSession(schoolUUID);
  }, [sessionOut, schoolUUID]);

  const ok = String(query.data?.status) === "1";
  const details = ok ? query.data.details : null;
  return {
    isLoading: enabled && query.isPending,
    failed: enabled && !query.isPending && !sessionOut && !ok,
    sessionOut,
    courses: Array.isArray(details?.studentAcademicPerformances) ? details.studentAcademicPerformances : [],
    courseProviderId: details?.courseProviderId,
    childUserId,
    retry: () => query.refetch(),
  };
}
