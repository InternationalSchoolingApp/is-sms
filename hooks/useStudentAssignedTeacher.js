"use client";

import { useQuery } from "@tanstack/react-query";
import { getStudentAssignedTeacher } from "@/services/dashboardApi";
import { useDummyStudent } from "@/hooks/useDummyStudent";

/**
 * Syllabus & Assigned Teacher (ONE_TO_ONE) — legacy
 * studentSyllabusAssignedTeacherContent.js's list call
 * (or getDummyStudentAssignedTeacherResponse in dummy mode).
 */
export function useStudentAssignedTeacher({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const query = useQuery({
    queryKey: ["student-assigned-teacher", schoolUUID, userId, dummy.key],
    queryFn: () => (dummy.enabled ? dummy.student.assignedTeachers() : getStudentAssignedTeacher({ schoolUUID, userId })),
    enabled: Boolean(schoolUUID && userId && dummy.settled),
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
  });

  const details = query.data?.details;
  return {
    isLoading: !dummy.settled || query.isLoading,
    courses: details?.assignedTeachers ?? [],
  };
}
