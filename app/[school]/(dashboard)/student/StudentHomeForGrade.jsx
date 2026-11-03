"use client";

import { useDashboardContext } from "@/hooks/useDashboardContext";
import { StudentHomeK5 } from "@/components/k5/home/StudentHomeK5";
import { StudentHome } from "./StudentHome";

// Same URL for every grade: a Grade K–5 student (isK5) gets the K–5 planner home.
export function StudentHomeForGrade() {
  const { isK5 } = useDashboardContext();
  return isK5 ? <StudentHomeK5 /> : <StudentHome />;
}
