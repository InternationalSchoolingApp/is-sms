"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { enrollAnotherChild } from "@/services/addEnrollmentBackendApi";
import { getEnrollmentProcess, getPublicSchoolInfo } from "@/services/studentSignupApi";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { callLocationForPaymentPromise, loadLocationGlobals } from "@/utils/locationFinder";
import { getLearningProgramShortCode } from "@/utils/learningProgramTheme";
import { useAddStudentDetailsPrefill } from "@/hooks/add-enrollment/useAddStage1";

/**
 * Context for the "Add Another Student" wizard
 * (/{school}/add-enrollment/{parentId}/{sessionUserId}/step/...).
 *
 * Mirrors hooks/useEnrollmentContext.js (logo, WhatsApp number, enrollment
 * process -> customPaymentEnabled/signupType, payer-location capture, learning
 * program from the saved student) with ONE difference: the student being
 * enrolled is NOT the logged-in session user.
 *   - session.userId/uniqueId -> the CALLER (the parent themselves, or a
 *                         sibling student adding a brother/sister) — only used
 *                         to call enrollAnotherChild.
 *   - childUserId/childUniqueId -> the child actually being enrolled, read
 *                         from enrollAnotherChild()'s response (and replaced by
 *                         the save response after Stage 1), never from the
 *                         session. Everything the main context keys off
 *                         session.userId/uniqueId is keyed off these instead.
 *
 * `parentId` is the URL param (always the real parent, in both caller
 * scenarios). enrollAnotherChild() resumes the parent's existing
 * partially-enrolled child or creates a new one — safe to call on every
 * mount/refresh.
 */
const AddEnrollmentContext = createContext(null);

function useResolveAddEnrollmentContext() {
  const { parentId, sessionUserId } = useParams();
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const [whatsAppNumber, setWhatsAppNumber] = useState(undefined);
  const authenticated =
    status === "authenticated" && Boolean(session?.userId && session?.schoolUUID && session?.uniqueId);

  const enrollChild = useQuery({
    queryKey: ["add-enrollment-child", session?.schoolUUID, parentId, session?.uniqueId],
    queryFn: () => enrollAnotherChild(session.schoolUUID, parentId, session.uniqueId),
    enabled: Boolean(authenticated && parentId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const childData = enrollChild.data?.data;
  const childUserId = childData?.userId;
  const childUniqueId = childData?.uniqueId;

  // learningProgram comes from the CHILD's saved details (get-student-details), mapped back to
  // our short code — same shared cache entry Stage 1/2 use, so no extra network call.
  const prefill = useAddStudentDetailsPrefill({
    context: { schoolUUID: session?.schoolUUID },
    userId: childUserId,
  });

  // customPaymentEnabled / signupType / REDIRECT for the child, like the main context does for
  // the logged-in student (student/enrollment/process keyed by the student's own uniqueId).
  const enrollmentProcess = useQuery({
    queryKey: ["add-enrollment-process", session?.schoolUUID, childUniqueId],
    queryFn: () => getEnrollmentProcess(session.schoolUUID, childUniqueId),
    enabled: Boolean(authenticated && childUniqueId),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // enrollment/process answers {status:"REDIRECT"} once the child is past the wizard (e.g. paid
  // from the invoice link in another tab). "dashboard" carries a ready-made view-as-user URL.
  // A "login" redirect (child withdrawn) is surfaced as an error instead of dropping the session:
  // here the session belongs to the parent/sibling, not the child.
  const processRedirect = enrollmentProcess.data?.status === "REDIRECT" ? enrollmentProcess.data : null;
  useEffect(() => {
    if (processRedirect?.redirectTo === "dashboard" && processRedirect.url) {
      window.location.replace(processRedirect.url);
    }
  }, [processRedirect]);

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

  // Support number for the mobile action bar's WhatsApp button.
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

  const processReady = !childUniqueId || enrollmentProcess.isFetched;
  const ready = authenticated && enrollChild.isFetched && Boolean(childData) && processReady && !processRedirect;

  // Same payer-location capture as the main context, so the payment step finds it already there.
  useEffect(() => {
    if (!ready) return;
    loadLocationGlobals({ schoolUUID: session.schoolUUID, userId: childUserId })
      .then(() => callLocationForPaymentPromise())
      .catch((err) => console.error("Payer location capture failed:", err));
  }, [ready, session?.schoolUUID, childUserId]);

  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        whatsAppNumber,
        parentId,
        sessionUserId,
        enrollmentFor: "enrollment",
        customPaymentEnabled: enrollmentProcess.data?.customPaymentEnabled === true,
        // Resume step comes from enrollAnotherChild (1-3), not enrollment/process (1-4).
        signupPage: childData.signupPage,
        signupType: enrollmentProcess.data?.signupType,
        learningProgram: prefill.data?.learningProgram
          ? getLearningProgramShortCode(prefill.data.learningProgram)
          : "O",
      }
    : null;

  return {
    status,
    session,
    context,
    logoUrl,
    ready,
    // Child identity — stage pages use these instead of session.userId/uniqueId.
    childUserId,
    childUniqueId,
    isError: enrollChild.isError || processRedirect?.redirectTo === "login",
  };
}

export function AddEnrollmentProvider({ children }) {
  const value = useResolveAddEnrollmentContext();
  return <AddEnrollmentContext.Provider value={value}>{children}</AddEnrollmentContext.Provider>;
}

export function useAddEnrollmentContext() {
  const value = useContext(AddEnrollmentContext);
  if (value === null) {
    throw new Error("useAddEnrollmentContext must be used within an AddEnrollmentProvider");
  }
  return value;
}
