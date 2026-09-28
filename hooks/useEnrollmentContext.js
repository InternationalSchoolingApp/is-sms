"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { getSchoolSettingsLinks } from "@/utils/schoolSettings";

/**
 * Shared by the flat wizard step routes (app/step/1, app/step/2, app/step/3):
 * resolves the enrollment `context` object straight from the Auth.js session
 * (schoolUUID/schoolNumericId/schoolName — see auth.js) instead of a
 * {schoolId} URL param, since these routes don't carry one. Only the
 * branding logo still needs its own fetch (getSchoolSettingsLinks isn't
 * carried in the session).
 *
 * enrollmentFor/learningProgram default the same way the old
 * /[schoolId]/student/enrollment page did — not carried by the session
 * either; revisit once Step 10 (stage-resume) threads the real values
 * through.
 */
export function useEnrollmentContext() {
  const { data: session, status } = useSession();
  const [logoUrl, setLogoUrl] = useState(null);

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
        learningProgram: "O",
      }
    : null;

  return { status, session, context, logoUrl, ready };
}
