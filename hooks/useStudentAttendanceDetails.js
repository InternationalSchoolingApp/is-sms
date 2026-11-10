"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { getStudentAttendanceDetails } from "@/services/attendanceApi";
import { callServer } from "@/utils/serverCall";

/**
 * One page of My Attendance > Attendance Details. The query key holds every filter, so a change of date filter,
 * dates, status or page is a new request and an older answer can never overwrite a newer one; the previous page
 * stays on screen while the next loads. Data = { totalCount, page, pageSize, rows } (the API's `details`).
 * Errors keep the backend's message; a session-out opens the global dialog (utils/serverCall.js).
 */
export function useStudentAttendanceDetails({ userId, dateFilter, fromDate, toDate, status, page, enabled = true }) {
  const dummy = useDummyStudent();
  return useQuery({
    queryKey: ["student-attendance-details", userId, dummy.key, dateFilter, fromDate, toDate, status, page],
    queryFn: () =>
      dummy.enabled
        ? dummy.student.attendanceDetails({ fromDate, toDate, status, page })
        : callServer(() => getStudentAttendanceDetails({ fromDate, toDate, dateFilter, status, page })),
    enabled: Boolean(userId) && Boolean(fromDate) && Boolean(toDate) && enabled && dummy.settled,
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}
