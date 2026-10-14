"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getStudentDetails } from "@/services/studentSignupBackendApi";
import { enrollAnotherChild } from "@/services/addEnrollmentBackendApi";
import { mapSignupStudentToFields, STUDENT_PREFILL_STALE_MS } from "@/hooks/useStudentDetailsSignup";
import { getLearningProgramLabel, getLearningProgramRouteCode } from "@/constant/LearningPrograms";

export function PageTitle() {
  const { program, parentId } = useParams();
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);
  const isAddEnrollment = Boolean(parentId);

  const enrollChild = useQuery({
    queryKey: ["add-enrollment-child", session?.schoolUUID, parentId, session?.uniqueId],
    queryFn: () => enrollAnotherChild(session.schoolUUID, parentId, session.uniqueId),
    enabled: Boolean(isAddEnrollment && authenticated && session?.uniqueId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const childUserId = enrollChild.data?.data?.userId;
  const studentUserId = isAddEnrollment ? childUserId : session?.userId;

  const prefill = useQuery({
    queryKey: isAddEnrollment
      ? ["add-enrollment-student-details-prefill", childUserId]
      : ["student-details-prefill", session?.userId],
    queryFn: async () => {
      const response = await getStudentDetails(session.schoolUUID, {
        studentUserId,
        userId: studentUserId,
        signupType: "Online",
      });
      if (response?.status !== "1") return null;
      return mapSignupStudentToFields(response.signupStudent);
    },
    enabled: Boolean(authenticated && studentUserId),
    staleTime: STUDENT_PREFILL_STALE_MS,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const studentName = [prefill.data?.firstName, prefill.data?.lastName].filter(Boolean).join(" ");
  // Prefer the student's actual confirmed program (same get-student-details call, already
  // fetched above) over the `program` URL segment: the SSO handoff/post-signup redirect can
  // land here with a placeholder segment (see app/api/sso/route.js), so trusting the URL alone
  // showed the wrong program (e.g. "One-to-One" for a Self Study Plus student). Only falls back
  // to the URL param while prefill hasn't resolved yet.
  const learningProgram = studentName
    ? null
    : getLearningProgramRouteCode(prefill.data?.learningProgram) || getLearningProgramRouteCode(program) || program;
  const title = `${studentName || getLearningProgramLabel(learningProgram)} | Enrollment`;

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
