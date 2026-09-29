"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";
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
 */
export function useEnrollmentContext() {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);
  const prefill = useStudentDetailsPrefill({
    context: { schoolUUID: session?.schoolUUID },
    userId: session?.userId,
  });

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

  const ready = status === "authenticated" && Boolean(session?.userId && session?.schoolUUID);

  const context = ready
    ? {
        schoolUUID: session.schoolUUID,
        schoolNumericId: session.schoolNumericId,
        schoolName: session.schoolName,
        enrollmentFor: "enrollment",
        learningProgram: prefill.data?.learningProgram
          ? getLearningProgramShortCode(prefill.data.learningProgram)
          : "O",
      }
    : null;

  return { status, session, context, logoUrl, ready };
}
