"use client";

import { useCallback, useMemo } from "react";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useStudentAssignedTeacher } from "@/hooks/useStudentAssignedTeacher";
import { teacherShortName } from "@/utils/salutation";

const key = (name) => String(name || "").trim().toLowerCase().replace(/\s+/g, " ");

/**
 * How a teacher is named on a student's screen: "Ms. Suzanne" (salutation + FIRST name only). The Book a Class data carries
 * the teacher's name but not the gender, so the gender comes from the student's assigned-teacher list (the same cached call as
 * My Assigned Teacher - no new request), matched by the teacher's name. A teacher not found there is shown as the first name alone.
 * Returns label(name) -> string ("" for no name).
 */
export function useTeacherLabel() {
  const { context } = useDashboardContext();
  const { courses } = useStudentAssignedTeacher({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const genders = useMemo(() => {
    const map = new Map();
    courses.forEach((course) => {
      if (course?.teacherName && course?.teacherGender) map.set(key(course.teacherName), course.teacherGender);
    });
    return map;
  }, [courses]);
  return useCallback((name) => (name ? teacherShortName(name, genders.get(key(name))) : ""), [genders]);
}
