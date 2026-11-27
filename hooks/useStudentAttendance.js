"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAttendanceFull } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * My Attendance — legacy studentAttendance.js's getStudentOwnAttendanceData()
 * (or getDummyStudentAttendanceFullResponse in dummy mode).
 * The endpoint reports its outcome in `statusCode` ("1" = ok), not `status`.
 */
export function useStudentAttendance({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-attendance-full", schoolUUID, userId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.attendanceFull() : getStudentAttendanceFull({ schoolUUID, userId })),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const ok = query.data?.statusCode === "1";
  return {
    isLoading: !dummy.settled || query.isLoading,
    sessionOut: query.data?.statusCode === "3",
    summary: ok ? query.data.details?.summary ?? null : null,
    months: ok ? query.data.details?.attendanceOverview ?? [] : [],
  };
}
