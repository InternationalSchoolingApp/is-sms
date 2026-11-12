"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentAssignedTeachers } from "@/services/parentTeachersApi";

/**
 * The selected child's assigned teachers (legacy parentSyllabusAssignedTeacher.js list call).
 * failed = the call came back null or the session is out; an empty list is "no assigned teacher", not a failure.
 */
export function useParentAssignedTeacher() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId);
  const query = useQuery({
    queryKey: ["parent-assigned-teacher", schoolUUID, parentUserId, studentUserId],
    queryFn: () => getParentAssignedTeachers({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });
  const data = query.data;
  const sessionOut = String(data?.status) === "3";
  const rows = Array.isArray(data?.details?.assignedTeachers) ? data.details.assignedTeachers : [];
  return {
    isLoading: query.isPending && enabled,
    failed: !query.isPending && (!data || sessionOut),
    sessionOut,
    rows,
    retry: () => query.refetch(),
  };
}
