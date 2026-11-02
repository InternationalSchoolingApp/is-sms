"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAcademicDetails } from "@/services/dashboardApi";

/**
 * The student's full name — the legacy USER_FULL_NAME page global (USER.USER_FULL_NAME), which
 * studentLoginHistory.js falls back to for pageData.studentName. Read from student-academic-details'
 * userName, the existing endpoint that returns that same column. Shared by the dashboard header and
 * Login History; one cached query per user.
 */
export function useStudentName({ schoolUUID, userId, enabled = true }) {
  const query = useQuery({
    queryKey: ["student-full-name", schoolUUID, userId],
    queryFn: async () => {
      const response = await getStudentAcademicDetails({ schoolUUID, userId });
      return String(response?.details?.userName ?? "").trim();
    },
    enabled: Boolean(enabled && schoolUUID && userId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return query.data || "";
}
