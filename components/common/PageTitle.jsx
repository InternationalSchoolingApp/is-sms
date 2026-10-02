"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getStudentDetails } from "@/services/studentSignupBackendApi";
import { mapSignupStudentToFields } from "@/hooks/useStudentDetailsSignup";
import { getLearningProgramLabel, getLearningProgramRouteCode } from "@/constant/LearningPrograms";

export function PageTitle() {
  const { program } = useParams();
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);

  const prefill = useQuery({
    queryKey: ["student-details-prefill", session?.userId],
    queryFn: async () => {
      const response = await getStudentDetails(session.schoolUUID, {
        studentUserId: session.userId,
        userId: session.userId,
        signupType: "Online",
      });
      if (response?.status !== "1") return null;
      return mapSignupStudentToFields(response.signupStudent);
    },
    enabled: Boolean(authenticated && session?.userId),
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const studentName = [prefill.data?.firstName, prefill.data?.lastName].filter(Boolean).join(" ");
  const learningProgram = studentName ? null : getLearningProgramRouteCode(program) || program;
  const title = `${studentName || getLearningProgramLabel(learningProgram)} | Enrollment`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
