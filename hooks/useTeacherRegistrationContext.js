"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "@/components/providers/AuthSessionProvider";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
import { getTeacherRegistrationProcess, isTeacherRegistrationViaNextjs } from "@/services/teacherSignupApi";
import { legacyTeacherRegistrationUrl } from "@/utils/backendOrigin";
import { trackRequest } from "@/utils/loaderStore";
import { expireSession } from "@/utils/logout";
import { recordApiAttempt } from "@/utils/lastApiAttempt";

// The backend's status codes (SeriConstant): "1" = success, "3" = the session is out.
export const TEACHER_STATUS_SUCCESS = "1";
export const TEACHER_STATUS_SESSION_OUT = "3";

// TeacherRegistrationStageResponse#state
export const TEACHER_STATE_FORM = "FORM";
export const TEACHER_STATE_LOCKED = "LOCKED";
export const TEACHER_STATE_REDIRECT = "REDIRECT";

/**
 * Shared by every teacher registration step (the provider is mounted once by the step layout, so the side effects
 * below fire a single time and not once per step). Resolves, for the signed-in teacher:
 *   - the school context straight from the session (schoolUUID/schoolNumericId/schoolName), plus the logo;
 *   - CONFIGURATION/TEACHER_REGISTRATION_VIA_NEXTJS: only an explicit `false` hands the teacher back to the legacy
 *     JSP wizard (null = unknown, e.g. the setting is unreadable: keep the Next.js wizard, never bounce);
 *   - teacher/registration/process: where the teacher belongs (`wizardStep` 1-6) and whether the wizard is open
 *     (FORM), locked while the school reviews them (LOCKED), or finished for them (REDIRECT, to the login page).
 * Mirrors hooks/useEnrollmentContext.js for students.
 */
const TeacherRegistrationContext = createContext(null);

function useResolveTeacherRegistrationContext() {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const isTeacher = String(session?.role || "").toUpperCase() === "TEACHER";
  const authenticated = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);
  // Signed in, but as somebody else (e.g. a student's login in the same browser): never call a teacher endpoint.
  const wrongRole = authenticated && !isTeacher;

  const viaNextjs = useQuery({
    queryKey: ["teacher-registration-via-nextjs", session?.schoolUUID],
    queryFn: () => {
      recordApiAttempt(
        "isTeacherRegistrationViaNextjs",
        `${session.schoolUUID}/api/v1/get-setting?metaType=CONFIGURATION&metaKey=TEACHER_REGISTRATION_VIA_NEXTJS`
      );
      return isTeacherRegistrationViaNextjs(session.schoolUUID);
    },
    enabled: authenticated && isTeacher,
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const viaLegacyFlow = viaNextjs.data === false;

  const process = useQuery({
    queryKey: ["teacher-registration-process", session?.schoolUUID, session?.uniqueId],
    queryFn: () => {
      recordApiAttempt(
        "getTeacherRegistrationProcess",
        `${session.schoolUUID}/api/v1/teacher/registration/process/${session.uniqueId}`
      );
      return getTeacherRegistrationProcess(session.schoolUUID, session.uniqueId);
    },
    enabled: Boolean(authenticated && isTeacher && session?.uniqueId && !viaLegacyFlow),
    staleTime: Infinity,
    gcTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  // The setting is off: hand the teacher back to the legacy JSP wizard. replace() so Back does not bounce them
  // straight into this page again.
  useEffect(() => {
    if (!viaLegacyFlow) return;
    const legacyUrl = legacyTeacherRegistrationUrl(session?.schoolUUID, session?.uniqueId);
    if (legacyUrl) window.location.replace(legacyUrl);
  }, [viaLegacyFlow, session?.schoolUUID, session?.uniqueId]);

  const processData = process.data;  const sessionOut = processData?.status === TEACHER_STATUS_SESSION_OUT;
  // REDIRECT: declined, withdrawn or already registered, so there is nothing to do in the wizard. The backend names
  // the destination (the school's login page).
  const processRedirect = processData?.state === TEACHER_STATE_REDIRECT ? processData : null;
  useEffect(() => {
    if (sessionOut) {
      expireSession(session?.schoolUUID);
    } else if (processRedirect?.redirectUri) {
      window.location.replace(processRedirect.redirectUri);
    }
  }, [sessionOut, processRedirect, session?.schoolUUID]);

  useEffect(() => {
    if (!session?.schoolNumericId) return;
    let cancelled = false;
    recordApiAttempt("getSchoolSettingsLinks", `${session.schoolNumericId}/api/v1/links`);
    trackRequest(() => getSchoolSettingsLinks(session.schoolNumericId))
      .then((links) => {
        if (!cancelled && links?.logoUrl) setLogoUrl(links.logoUrl);
      })
      .catch((err) => console.error("School links fetch failed:", err));
    return () => {
      cancelled = true;
    };
  }, [session?.schoolNumericId]);

  const processReady = !session?.uniqueId || process.isFetched;
  // Never report ready while a redirect (legacy flow, finished teacher, session out) is in flight, so no step
  // flashes before the browser leaves the page.
  const ready = authenticated && isTeacher && processReady && !viaLegacyFlow && !processRedirect && !sessionOut;

  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        firstReset: processData?.firstReset ?? null,
        signupPage: processData?.signupPage ?? null,
        wizardStep: Number(processData?.wizardStep) || null,
        state: processData?.state || TEACHER_STATE_FORM,
        lockReason: processData?.lockReason || null,
      }
    : null;

  return { status, session, context, logoUrl, ready, wrongRole };
}

/** Mounts the teacher registration context once and shares it with the shell and every step page. */
export function TeacherRegistrationProvider({ children }) {
  const value = useResolveTeacherRegistrationContext();
  return <TeacherRegistrationContext.Provider value={value}>{children}</TeacherRegistrationContext.Provider>;
}

/** Reads the shared context. Must be rendered inside TeacherRegistrationProvider (the step layout provides it). */
export function useTeacherRegistrationContext() {
  const value = useContext(TeacherRegistrationContext);
  if (value === null) {
    throw new Error("useTeacherRegistrationContext must be used within a TeacherRegistrationProvider");
  }
  return value;
}
