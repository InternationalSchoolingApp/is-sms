"use client";

import { useParams } from "next/navigation";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useReEnrollmentEntry } from "@/hooks/useReEnrollmentEntry";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { FullScreenLoader } from "@/components/common/Loader";
import { StudentHomeK5 } from "@/components/k5/home/StudentHomeK5";
import { StudentHome } from "./StudentHome";

// Same URL for every grade: a Grade K–5 student (isK5) gets the K–5 planner home.
// A graduated student who has to re-enroll is sent to the re-enrollment pages instead (useReEnrollmentEntry).
export function StudentHomeForGrade() {
  const { school } = useParams();
  const { isK5, context } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const { checking } = useReEnrollmentEntry({
    school,
    schoolUUID: context?.schoolUUID,
    userId: context?.userId,
    studentGraduate: dashboardData.studentGraduate,
    dashboardLoading: dashboardData.isLoading,
    dummy: dummy.enabled,
  });

  if (checking) return <FullScreenLoader />;
  return isK5 ? <StudentHomeK5 /> : <StudentHome />;
}
