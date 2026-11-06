"use client";

import { useSession } from "@/components/providers/AuthSessionProvider";

/**
 * The school name for places that have no school context of their own (error pages, the
 * create-password page). It comes from the sign-in session, which got it from the SSO handoff
 * (`schoolName` in app/api/sso/route.js). Outside the root layout's AuthSessionProvider (the global error page)
 * and before sign-in it is "".
 */
export function useSchoolName() {
  const session = useSession();
  return session?.data?.schoolName || "";
}
