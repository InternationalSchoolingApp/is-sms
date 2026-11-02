"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentLoginHistory } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentName } from "@/hooks/useStudentName";

// Legacy studentLoginHistoryResolveStudentName: any name the attendance response carries, else the
// USER_FULL_NAME page global (here useStudentName).
function resolveStudentName(attendance, response, fullName) {
  const name =
    attendance.studentName ||
    attendance.studentFullName ||
    attendance.fullName ||
    attendance.userFullName ||
    attendance.name ||
    attendance.userName ||
    response?.studentName ||
    fullName;
  return String(name || "").trim();
}

/**
 * Login History ("My Log in History") — legacy studentLoginHistory.js: the attendance/login call
 * (or getDummyStudentParentLoginHistoryResponse in dummy mode) and pageData.studentName for the title.
 */
export function useStudentLoginHistory({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const historyQuery = useQuery({
    queryKey: ["student-login-history", schoolUUID, userId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.loginHistory() : getStudentLoginHistory({ schoolUUID, userId })),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
  const fullName = useStudentName({ schoolUUID, userId });

  const attendance = historyQuery.data?.details ?? {};
  return {
    isLoading: !dummy.settled || historyQuery.isLoading,
    attendance,
    studentName: resolveStudentName(attendance, historyQuery.data, fullName),
  };
}
