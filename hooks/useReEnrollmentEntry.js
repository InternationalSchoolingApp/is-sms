"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getReEnrollmentEligibility } from "@/services/reEnrollmentBackendApi";
import { STATUS_SUCCESS } from "@/hooks/useReEnrollment";
import { reEnrollmentBasePath } from "@/utils/reEnrollmentSteps";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";

const entryQuery = (schoolUUID, userId) => ({
  queryKey: ["re-enrollment-entry", schoolUUID, userId],
  queryFn: async () => (await getReEnrollmentEligibility(schoolUUID, { userId })) ?? null,
  retry: false,
  refetchOnWindowFocus: false,
});

const mustReEnroll = (eligibility) => eligibility?.status === STATUS_SUCCESS && eligibility.nextAction === "RE_ENROLLMENT";

/**
 * Re-enrollment entry of the student dashboard home (legacy studentDashboardContent.js: a graduated student,
 * studentGraduate = "Y", gets the re-enrollment instead of the home). The eligibility API decides: RE_ENROLLMENT -> the
 * re-enrollment pages, at the step the student is on when one is already started (resume=1; an unpaid custom payment
 * plan resumes at its PAYMENT step); anything else (incl. ENROLLMENT_VIA_NEXTJS off) -> the home.
 *
 * `checking` is true while that is being decided or the redirect is under way, so the home does not flash.
 */
export function useReEnrollmentEntry({ school, schoolUUID, userId, studentGraduate, dashboardLoading, dummy }) {
  const router = useRouter();
  const enabled = Boolean(studentGraduate && !dummy && schoolUUID && userId);

  const query = useQuery({
    ...entryQuery(schoolUUID, userId),
    enabled,
    // The answer changes as the student pays / completes, read it fresh on every visit of the home.
    staleTime: 0,
    refetchOnMount: "always",
  });

  const eligibility = query.data;
  const target =
    enabled && mustReEnroll(eligibility)
      ? `${reEnrollmentBasePath(school)}${eligibility.reEnrollmentInProgress ? "?resume=1" : ""}`
      : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return { checking: Boolean(dashboardLoading || (enabled && query.isFetching) || target) };
}

/**
 * Whether this student still has a re-enrollment to finish (the same answer that sends the dashboard home to the
 * re-enrollment pages), for every page. null while that is not known yet.
 */
export function useMustReEnroll({ schoolUUID, userId }) {
  const dummy = useDummyStudent();
  const { studentGraduate, isLoading } = useStudentDashboardData({ schoolUUID, userId });
  const enabled = Boolean(studentGraduate && !dummy.enabled && schoolUUID && userId);
  const query = useQuery({ ...entryQuery(schoolUUID, userId), enabled });
  if (!schoolUUID || !userId || isLoading || (enabled && query.isPending)) return null;
  return enabled && mustReEnroll(query.data);
}
