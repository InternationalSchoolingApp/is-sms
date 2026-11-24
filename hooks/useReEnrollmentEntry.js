"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getReEnrollmentEligibility } from "@/services/reEnrollmentBackendApi";
import { isEnrollmentViaNextjs } from "@/services/studentSignupApi";
import { STATUS_SUCCESS } from "@/hooks/useReEnrollment";
import { reEnrollmentBasePath } from "@/utils/reEnrollmentSteps";

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
    queryKey: ["re-enrollment-entry", schoolUUID, userId],
    queryFn: async () => (await getReEnrollmentEligibility(schoolUUID, { userId })) ?? null,
    enabled,
    // The answer changes as the student pays / completes, read it fresh on every visit of the home.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });

  const eligibility = query.data;
  const target =
    enabled && eligibility?.status === STATUS_SUCCESS && eligibility.nextAction === "RE_ENROLLMENT"
      ? `${reEnrollmentBasePath(school)}${eligibility.reEnrollmentInProgress ? "?resume=1" : ""}`
      : null;

  useEffect(() => {
    if (target) router.replace(target);
  }, [target, router]);

  return { checking: Boolean(dashboardLoading || (enabled && query.isFetching) || target) };
}

/**
 * My Transcript (Phase 4): whether this student can open the re-enrollment pages (ENROLLMENT_VIA_NEXTJS not off and the
 * eligibility says RE_ENROLLMENT) — then a blocked transcript row links to them to fix it. Only asked when `enabled`
 * (a blocked row is on show); same queries / keys as the re-enrollment provider and the home entry.
 */
export function useReEnrollmentEligible({ schoolUUID, userId, enabled }) {
  const on = Boolean(enabled && schoolUUID && userId);
  const viaNextjs = useQuery({
    queryKey: ["enrollment-via-nextjs", schoolUUID],
    queryFn: () => isEnrollmentViaNextjs(schoolUUID),
    enabled: on,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const query = useQuery({
    queryKey: ["re-enrollment-entry", schoolUUID, userId],
    queryFn: async () => (await getReEnrollmentEligibility(schoolUUID, { userId })) ?? null,
    enabled: on && viaNextjs.isFetched && viaNextjs.data !== false,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  return on && viaNextjs.data !== false && query.data?.status === STATUS_SUCCESS && query.data.nextAction === "RE_ENROLLMENT";
}
