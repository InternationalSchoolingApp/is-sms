"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAssignedTeacher } from "@/services/dashboardApi";

/**
 * Syllabus & Assigned Teacher (ONE_TO_ONE) — legacy
 * studentSyllabusAssignedTeacherContent.js's list call.
 */
export function useStudentAssignedTeacher({ schoolUUID, userId }) {
  const query = useQuery({
    queryKey: ["student-assigned-teacher", schoolUUID, userId],
    queryFn: () => getStudentAssignedTeacher({ schoolUUID, userId }),
    enabled: Boolean(schoolUUID && userId),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: query.isLoading,
    courses: details?.assignedTeachers ?? [],
  };
}
