"use client";

import { useQuery } from "@tanstack/react-query";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { getParentChildLoginHistory } from "@/services/parentLoginHistoryApi";

/**
 * The selected child's login history (legacy studentParentLoginHistory.js). status "1" = ok, "3" = session out,
 * anything else (incl. "no history", E001) is shown as empty. Key = [feature, school, parent, child].
 */
export function useParentLoginHistory() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const schoolUUID = context?.schoolUUID;
  const parentUserId = context?.userId;
  const studentUserId = selectedChild ? String(selectedChild.userId) : null;
  const enabled = Boolean(schoolUUID && parentUserId && studentUserId);

  const query = useQuery({
    queryKey: ["parent-login-history", schoolUUID, parentUserId, studentUserId],
    queryFn: () => getParentChildLoginHistory({ schoolUUID, studentUserId }),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const ok = String(query.data?.status) === "1" && query.data?.details;
  const loginHistories = ok && Array.isArray(query.data.details.loginHistories) ? query.data.details.loginHistories : [];
  return {
    isLoading: enabled && query.isPending,
    sessionOut: String(query.data?.status) === "3",
    // null = the call itself failed (network / server); otherwise the backend answered (possibly "not found").
    failed: !query.isPending && !query.data,
    attendance: ok ? query.data.details : {},
    loginHistories,
    studentName: selectedChild?.studentName ?? "",
    retry: () => query.refetch(),
  };
}
