"use client";

import { useEffect, useRef } from "react";
import { useParams, usePathname } from "next/navigation";
import { useSession } from "@/components/providers/AuthSessionProvider";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getStudentDetails } from "@/services/studentSignupBackendApi";
import { mapSignupStudentToFields, STUDENT_PREFILL_STALE_MS } from "@/hooks/useStudentDetailsSignup";
import { getLearningProgramLabel, getLearningProgramRouteCode } from "@/constant/LearningPrograms";

export function PageTitle() {
  const { program, parentId } = useParams();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);
  const isAddEnrollment = Boolean(parentId);

  // When the logged-in user changes (different student in the same browser tab),
  // drop the stale prefill cache so the title picks up the new student's name
  // instead of showing the previous student's.
  const prevUserIdRef = useRef(session?.userId);
  useEffect(() => {
    if (prevUserIdRef.current && session?.userId && prevUserIdRef.current !== session?.userId) {
      queryClient.removeQueries({ queryKey: ["student-details-prefill"] });
    }
    prevUserIdRef.current = session?.userId;
  }, [session?.userId, queryClient]);

  // Read-only view of the add-enrollment wizard's child (useAddEnrollmentContext fills this cache entry). It must
  // NEVER fetch by itself: enrollAnotherChild reserves a child, and calling it here — on every page load, before
  // the wizard's own refresh checks and without the roll number / allowCreate guard — created a new child on
  // each refresh (and sent the thank-you page to that new child instead of the paid one).
  const enrollChild = useQuery({
    queryKey: ["add-enrollment-child", session?.schoolUUID, parentId, session?.uniqueId],
    // never called (enabled: false); if anything ever refetches this key through us, keep what is cached
    queryFn: ({ queryKey }) => queryClient.getQueryData(queryKey) ?? null,
    enabled: false,
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
      // TEMP-DEBUG
      if (response?.status !== "1") return null;
      return mapSignupStudentToFields(response.signupStudent);
    },
    // Only inside the enrollment wizard steps (/enrollment/{program}/step/...): the creation
    // page (/{school}/enrollment/{program}, no /step/) is pre-login — a logged-in student's
    // cookies from another tab must not leak their name into this tab's title. And on /common
    // payment-response pages, the logged-in user may be a parent and get-student-details answers E002.
    enabled: Boolean(authenticated && studentUserId && (program || isAddEnrollment)
      && pathname && (pathname.includes("/step/") || isAddEnrollment)),
    staleTime: STUDENT_PREFILL_STALE_MS,
    refetchOnWindowFocus: false,
    retry: false, 
  });

  const studentName = [prefill.data?.firstName, prefill.data?.lastName].filter(Boolean).join(" ");
  const programSource = isAddEnrollment ? prefill.data?.learningProgram : program;
  const learningProgram = studentName ? null : getLearningProgramRouteCode(programSource) || programSource;
  const title =
    studentName || learningProgram
      ? `${studentName || getLearningProgramLabel(learningProgram)} | Enrollment`
      : isAddEnrollment
        ? "Student Enrollment"
        : "Enrollment";

  // Reset title when navigating to the enrollment creation page (pre-login: no session yet)
  // so a previous student's name doesn't linger while the new student signs up.
  useEffect(() => {
    if (pathname && pathname.includes("/enrollment/") && !pathname.includes("/step/")) {
      document.title = "Enrollment";
    }
  }, [pathname]);

  // bfcache: the browser may restore this page with stale React state after a back/forward
  // navigation. Invalidate the prefill query so the title refreshes from the API.
  useEffect(() => {
    const onPageShow = (e) => {
      if (e.persisted) {
        queryClient.invalidateQueries({ queryKey: ["student-details-prefill"] });
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, [queryClient]);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
