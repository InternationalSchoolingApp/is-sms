"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAttendanceFull } from "@/services/dashboardApi";

/**
 * My Attendance — legacy studentAttendance.js's getStudentOwnAttendanceData().
 * The endpoint reports its outcome in `statusCode` ("1" = ok), not `status`.
 */
export function useStudentAttendance({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["student-attendance-full", schoolUUID, userId],
    queryFn: () => getStudentAttendanceFull({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const ok = query.data?.statusCode === "1";
  return {
    isLoading: query.isLoading,
    sessionOut: query.data?.statusCode === "3",
    summary: ok ? query.data.details?.summary ?? null : null,
    months: ok ? query.data.details?.attendanceOverview ?? [] : [],
  };
}
