"use client";

import { useContext } from "react";
import { SessionContext } from "next-auth/react";

/**
 * The school name for places that have no school context of their own (error pages, the
 * create-password page). It comes from the sign-in session, which got it from the SSO handoff
 * (`schoolName` in app/api/sso/route.js). Reads the session context directly so it also works
 * where no SessionProvider exists (the global error page): then, and before sign-in, it is "".
 */
export function useSchoolName() {
  const session = useContext(SessionContext);
  return session?.data?.schoolName || "";
}
