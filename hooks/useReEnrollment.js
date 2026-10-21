"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSchoolSettingsLinks, getSchoolSettingsTechnical } from "@/utils/schoolSettings";
import { extractRootCss } from "@/utils/schoolColorTheme";
import { getPublicSchoolInfo, isEnrollmentViaNextjs } from "@/services/studentSignupApi";
import {
  chooseReEnrollmentPaymentPlan,
  completeReEnrollment,
  getReEnrollmentEligibility,
  getReEnrollmentPaymentDetails,
  getReEnrollmentReview,
  selectReEnrollmentOption,
} from "@/services/reEnrollmentBackendApi";
import { legacyDashboardUrl } from "@/utils/backendOrigin";
import { navigateTop } from "@/utils/embed";
import { callLocationForPaymentPromise, loadLocationGlobals } from "@/utils/locationFinder";
import { getLearningProgramShortCode } from "@/utils/learningProgramTheme";

// SeriConstant: "1" success, "0" failed, "2" exception.
export const STATUS_SUCCESS = "1";

const ReEnrollmentContext = createContext(null);

export const eligibilityKey = (userId) => ["re-enrollment-eligibility", userId];

/**
 * Resolves everything the re-enrollment pages share, once, in the route layout:
 *  - the Auth.js session (schoolUUID/userId, same SSO handoff as the enrollment wizard),
 *  - CONFIGURATION/ENROLLMENT_VIA_NEXTJS: false -> the student goes back to the Java dashboard,
 *  - the eligibility answer: DASHBOARD (not a re-enrollment student / not eligible) -> Java dashboard too.
 * `context` has the same shape the enrollment components (Stage3CourseSelection, the gateway modal) read.
 */
function useResolveReEnrollment() {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const [rootcss, setRootcss] = useState("");
  const [whatsAppNumber, setWhatsAppNumber] = useState(undefined);
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);

  const enrollmentViaNextjs = useQuery({
    queryKey: ["enrollment-via-nextjs", session?.schoolUUID],
    queryFn: () => isEnrollmentViaNextjs(session.schoolUUID),
    enabled: authenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  // Same rule as the enrollment wizard: only an explicit `false` switches the new pages off.
  const viaLegacyFlow = enrollmentViaNextjs.data === false;

  const eligibilityQuery = useQuery({
    queryKey: eligibilityKey(session?.userId),
    queryFn: async () => {
      const response = await getReEnrollmentEligibility(session.schoolUUID, { userId: session.userId });
      if (!response) throw new Error("re-enrollment eligibility returned no response");
      return response;
    },
    enabled: authenticated && enrollmentViaNextjs.isFetched && !viaLegacyFlow,
    // The answer changes as the student pays / selects, always read it fresh when a page mounts.
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
  const eligibility = eligibilityQuery.data?.status === STATUS_SUCCESS ? eligibilityQuery.data : null;

  const leaveForDashboard = viaLegacyFlow || eligibility?.nextAction === "DASHBOARD";
  useEffect(() => {
    if (!leaveForDashboard) return;
    const url = legacyDashboardUrl(session?.schoolUUID, session?.uniqueId);
    if (url) navigateTop(url);
  }, [leaveForDashboard, session?.schoolUUID, session?.uniqueId]);

  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    getSchoolSettingsLinks(session.schoolNumericId)
      .then((links) => {
        if (!cancelled && links?.logoUrl) setLogoUrl(links.logoUrl);
      })
      .catch((err) => console.error("School links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  // Per-school color theme (rootcss custom-properties block) — see useEnrollmentContext.js.
  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    getSchoolSettingsTechnical(session.schoolNumericId)
      .then((technical) => {
        if (!cancelled) setRootcss(extractRootCss(technical?.parentColor));
      })
      .catch((err) => console.error("School color theme fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  useEffect(() => {
    if (!session?.schoolUUID) return;
    let cancelled = false;
    getPublicSchoolInfo(session.schoolUUID)
      .then((info) => {
        if (!cancelled && info?.whatsAppNumber) setWhatsAppNumber(info.whatsAppNumber);
      })
      .catch((err) => console.error("School public info fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolUUID]);

  const ready = authenticated && !leaveForDashboard && eligibility?.nextAction === "RE_ENROLLMENT";

  // The payment gateway call needs the payer's location (same capture the enrollment wizard does on load).
  useEffect(() => {
    if (!ready) return;
    loadLocationGlobals({ schoolUUID: session.schoolUUID, userId: session.userId })
      .then(() => callLocationForPaymentPromise())
      .catch((err) => console.error("Payer location capture failed:", err));
  }, [ready, session?.schoolUUID, session?.userId]);

  // The option the student already selected (resume), if any.
  // Its grade is the one on the started record (a Flexy student may have switched grade on the course screen).
  const selectedOption = eligibility?.reEnrollmentInProgress
    ? eligibility.options?.find((o) => o.enrollmentType === eligibility.selectedEnrollmentType) ?? null
    : null;
  const option = selectedOption
    ? { ...selectedOption, grade: eligibility.selectedGrade?.id ? eligibility.selectedGrade : selectedOption.grade }
    : null;

  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        whatsAppNumber,
        enrollmentFor: "enrollment",
        customPaymentEnabled: false,
        learningProgram: getLearningProgramShortCode(option?.learningProgram || eligibility.currentLearningProgram) || "O",
      }
    : null;

  return {
    status,
    session,
    context,
    logoUrl,
    rootcss,
    ready,
    loadFailed: eligibilityQuery.isError || (eligibilityQuery.data && !eligibility),
    eligibility,
    option,
    inProgress: Boolean(option),
    steps: option?.steps ?? [],
    refetchEligibility: eligibilityQuery.refetch,
    retryLoading: eligibilityQuery.refetch,
    leavingForDashboard: leaveForDashboard,
  };
}

export function ReEnrollmentProvider({ children }) {
  const value = useResolveReEnrollment();
  return <ReEnrollmentContext.Provider value={value}>{children}</ReEnrollmentContext.Provider>;
}

export function useReEnrollmentContext() {
  const value = useContext(ReEnrollmentContext);
  if (value === null) {
    throw new Error("useReEnrollmentContext must be used within a ReEnrollmentProvider");
  }
  return value;
}

/** select-option: the student picked Next Grade / Repeat / Take Individual Course. */
export function useSelectReEnrollmentOption({ context, userId }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentType) => selectReEnrollmentOption(context.schoolUUID, { userId, enrollmentType }),
    onSuccess: (response) => {
      // Steps / resume info change once the next record exists.
      if (response?.status === STATUS_SUCCESS) queryClient.invalidateQueries({ queryKey: eligibilityKey(userId) });
    },
  });
}

/** PAYMENT screen: plans and amounts from the rule engine. */
export function useReEnrollmentPaymentDetails({ context, userId }) {
  return useQuery({
    queryKey: ["re-enrollment-payment-details", userId],
    queryFn: async () => {
      const response = await getReEnrollmentPaymentDetails(context.schoolUUID, { userId });
      if (!response) throw new Error("re-enrollment payment-details returned no response");
      return response;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
}

export function useChooseReEnrollmentPlan({ context, userId }) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (paymentMode) => chooseReEnrollmentPaymentPlan(context.schoolUUID, { userId, paymentMode }),
    onSuccess: (response) => {
      if (response?.status === STATUS_SUCCESS) queryClient.invalidateQueries({ queryKey: ["re-enrollment-review", userId] });
    },
  });
}

/** REVIEW screen; also called right after a plan is chosen to get the payment the gateway has to be started for. */
export function useReEnrollmentReview({ context, userId }) {
  return useQuery({
    queryKey: ["re-enrollment-review", userId],
    queryFn: async () => {
      const response = await getReEnrollmentReview(context.schoolUUID, { userId });
      if (!response) throw new Error("re-enrollment review returned no response");
      return response;
    },
    enabled: Boolean(context?.schoolUUID && userId),
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    retry: false,
  });
}

/** Imperative review call (after choose-payment-plan, before opening the gateway). */
export function useFetchReEnrollmentReview({ context, userId }) {
  return useMutation({
    mutationFn: () => getReEnrollmentReview(context.schoolUUID, { userId }),
  });
}

export function useCompleteReEnrollment({ context, userId }) {
  return useMutation({
    mutationFn: () => completeReEnrollment(context.schoolUUID, { userId }),
  });
}
