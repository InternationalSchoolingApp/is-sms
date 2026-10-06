"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { getEnrollmentProcess, getPublicSchoolInfo, isEnrollmentViaNextjs } from "@/services/studentSignupApi";
import { legacyEnrollmentProcessUrl } from "@/utils/backendOrigin";
import { expireSession } from "@/utils/logout";
import { callLocationForPaymentPromise, loadLocationGlobals } from "@/utils/locationFinder";
import { useStudentDetailsPrefill } from "@/hooks/useStudentDetailsSignup";
import { getLearningProgramShortCode } from "@/utils/learningProgramTheme";

/**
 * Shared by the flat wizard step routes (app/step/1, app/step/2, app/step/3):
 * resolves the enrollment `context` object straight from the Auth.js session
 * (schoolUUID/schoolNumericId/schoolName — see auth.js) instead of a
 * {schoolId} URL param, since these routes don't carry one. Only the
 * branding logo still needs its own fetch (getSchoolSettingsLinks isn't
 * carried in the session).
 *
 * learningProgram comes from get-student-details' signupStudent.learningProgram
 * (the backend's full LearningProgramConstant value, e.g. "DUAL_DIPLOMA"),
 * mapped back to our short URL code — reuses useStudentDetailsPrefill (same
 * queryKey Stage 1/3 already fetch under) so this doesn't add a second
 * network call, just shares the cached one. "O" while it's still loading or
 * for a student with nothing saved yet, matching the previous static default.
 *
 * enrollmentFor still defaults the same way the old
 * /[schoolId]/student/enrollment page did — not carried by the session
 * either; revisit once Step 10 (stage-resume) threads the real value through.
 *
 * Resolved ONCE per wizard mount by EnrollmentProvider (see the step-group
 * layout) and shared with the shell chrome and all step pages via context —
 * so the logo/public-info/location side effects below fire a single time,
 * not once per step. Step pages read it with useEnrollmentContext() exactly
 * as before; only the call now returns the shared value.
 */
const EnrollmentContext = createContext(null);

function useResolveEnrollmentContext() {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const [whatsAppNumber, setWhatsAppNumber] = useState(undefined);
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);
  const prefill = useStudentDetailsPrefill({
    context: { schoolUUID: session?.schoolUUID },
    userId: session?.userId,
  });

  // CONFIGURATION/ENROLLMENT_VIA_NEXTJS decides whether this wizard runs at all,
  // the same switch the backend branches on (CommonUtil#getFinalEnrollmentUrl).
  // `undefined` while it is still in flight — and on failure, since the query
  // doesn't retry — so everything below keeps the existing Next.js behaviour
  // unless the setting explicitly comes back false.
  const enrollmentViaNextjs = useQuery({
    queryKey: ["enrollment-via-nextjs", session?.schoolUUID],
    queryFn: () => isEnrollmentViaNextjs(session.schoolUUID),
    enabled: authenticated,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const viaLegacyFlow = enrollmentViaNextjs.data === false;

  const enrollmentProcess = useQuery({
    queryKey: ["enrollment-process", session?.schoolUUID, session?.uniqueId],
    queryFn: () => getEnrollmentProcess(session.schoolUUID, session.uniqueId),
    enabled: Boolean(authenticated && session?.uniqueId && !viaLegacyFlow),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // Setting is off: hand the student back to the legacy JSP continuation page
  // instead of resolving a context for a wizard that must not run. replace() so
  // Back doesn't bounce them straight into this page again.
  useEffect(() => {
    if (!viaLegacyFlow) return;
    const legacyUrl = legacyEnrollmentProcessUrl(session?.schoolUUID, session?.uniqueId);
    if (legacyUrl) window.location.replace(legacyUrl);
  }, [viaLegacyFlow, session?.schoolUUID, session?.uniqueId]);

  // enrollment/process answers {status:"REDIRECT"} once the student is past the wizard — e.g.
  // paid from the invoice link in another tab and then refreshed this page. "dashboard" carries
  // a ready-made view-as-user URL that logs them into the Java dashboard; "login" (withdrawn)
  // drops the session. replace() so Back doesn't bounce them into the wizard again.
  const processRedirect = enrollmentProcess.data?.status === "REDIRECT" ? enrollmentProcess.data : null;
  useEffect(() => {
    if (!processRedirect) return;
    if (processRedirect.redirectTo === "dashboard" && processRedirect.url) {
      window.location.replace(processRedirect.url);
    } else if (processRedirect.redirectTo === "login") {
      expireSession(session?.schoolUUID);
    }
  }, [processRedirect, session?.schoolUUID]);

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

  // Support number for the mobile action bar's WhatsApp button (same public-info call the landing page uses).
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

  const processReady = !session?.uniqueId || enrollmentProcess.isFetched;
  // Never report ready while the legacy redirect above is in flight — the wizard
  // would otherwise flash a step before the browser leaves the page.
  // Same for the post-enrollment redirect, so the step never fires its own calls
  // (get-student-review-details would answer "Request not valid" for a paid student).
  const ready = authenticated && processReady && !viaLegacyFlow && !processRedirect;

  // Legacy fills the hidden `#location` input when the wizard page loads (the student form's
  // callLocationAndSelectCountryNew() -> LOCATION_SERVICE_BYPASS ? DEFAULT_LOCATION : the IP
  // lookup), so getPayerCountryCodePromise() finds it already there at payment time and only
  // falls back to its own IP call when it is empty. Same here: capture it once per page load.
  useEffect(() => {
    if (!ready) return;
    loadLocationGlobals({ schoolUUID: session.schoolUUID, userId: session.userId })
      .then(() => callLocationForPaymentPromise())
      .catch((err) => console.error("Payer location capture failed:", err));
  }, [ready, session?.schoolUUID, session?.userId]);
  
  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        whatsAppNumber,
        enrollmentFor: "enrollment",
        customPaymentEnabled: enrollmentProcess.data?.customPaymentEnabled === true,
        signupPage: enrollmentProcess.data?.signupPage,
        learningProgram: prefill.data?.learningProgram
          ? getLearningProgramShortCode(prefill.data.learningProgram)
          : "O",
      }
    : null;
  return { status, session, context, logoUrl, ready };
}

/**
 * Mounts the enrollment context once and shares it with everything inside the
 * wizard (the shell chrome + every step page). Placed in the step-group
 * layout so navigating between steps does not re-run the resolver's effects.
 */
export function EnrollmentProvider({ children }) {
  const value = useResolveEnrollmentContext();
  return <EnrollmentContext.Provider value={value}>{children}</EnrollmentContext.Provider>;
}

/**
 * Reads the shared enrollment context. Must be rendered inside
 * EnrollmentProvider (the wizard layout provides it for all step routes).
 */
export function useEnrollmentContext() {
  const value = useContext(EnrollmentContext);
  if (value === null) {
    throw new Error("useEnrollmentContext must be used within an EnrollmentProvider");
  }
  return value;
}
