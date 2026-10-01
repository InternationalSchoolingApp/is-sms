import { signOut } from "next-auth/react";
import { logoutSignupAction } from "@/actions/studentSignupActions";

// Legacy signupLogout(): kill the backend session first, then land on the school's login page
// (logoutSchool redirects to /{schoolId}/common/login). A failed backend call must never trap the
// user on the page, so it is swallowed.
export async function logoutEverywhere(session) {
  if (session?.schoolUUID && session?.uniqueId) {
    try {
      await logoutSignupAction(session.schoolUUID, session.uniqueId);
    } catch (err) {
      console.error("Backend logout failed:", err);
    }
  }
  // redirect:false + a manual navigation: the login page may live on another origin, which
  // signOut's own callbackUrl handling would refuse.
  await signOut({ redirect: false });
  // The real backend origin, not the "/backend" dev proxy: the login page must be served by the
  // Java app itself (http://localhost:8080/{school}/common/login), not through Next.js.
  const backend = process.env.NEXT_PUBLIC_BACKEND_BASE_URL;
  window.location.assign(session?.schoolUUID && backend ? `${backend}/${session.schoolUUID}/common/login` : "/");
}
