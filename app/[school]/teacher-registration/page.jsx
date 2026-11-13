import { redirect } from "next/navigation";
import { getAccountSession } from "@/lib/auth/session";
import { getRecaptchaSiteKey, isRecaptchaRequired } from "@/lib/recaptcha";
import { isTeacherRegistrationViaNextjs } from "@/services/teacherSignupApi";
import { legacyTeacherSignupUrl } from "@/utils/backendOrigin";
import { teacherStepBasePath } from "@/utils/teacherRegistrationSteps";
import { TeacherAccountCreation } from "./TeacherAccountCreation";

// /{school}/teacher-registration: the public landing page, where a teacher creates the account. It runs BEFORE
// any login, so the school slug comes from the {school} path segment and the numeric id / policy links are fetched
// client-side (TeacherAccountCreation). The signed-in wizard lives in ./step/*.
//
// Server Component: it decides, before anything renders, whether the visitor belongs here at all:
//   - CONFIGURATION/TEACHER_REGISTRATION_VIA_NEXTJS explicitly false -> the legacy JSP sign-up page (an unknown
//     answer keeps this page, so an unreadable setting never bounces anybody);
//   - already signed in as a teacher -> straight on to their step. A session of another role (a student's login in
//     the same browser) does not count: the form is shown and the tab's earlier account is dropped client-side.
export default async function TeacherRegistrationLandingPage({ params }) {
  const { school } = await params;

  let viaNextjs;
  try {
    viaNextjs = await isTeacherRegistrationViaNextjs(school);
  } catch {
    // Keep the page available if the setting cannot be read; the form's own calls surface their errors.
  }
  if (viaNextjs === false) {
    const legacyUrl = legacyTeacherSignupUrl(school);
    if (legacyUrl) redirect(legacyUrl);
  }

  const session = await getAccountSession();
  if (session && String(session.role || "").toUpperCase() === "TEACHER") {
    redirect(teacherStepBasePath(school));
  }

  return (
    <TeacherAccountCreation
      school={school}
      recaptchaRequired={isRecaptchaRequired()}
      // Read server-side and handed down as a plain prop; undefined whenever the check is off.
      recaptchaSiteKey={getRecaptchaSiteKey()}
    />
  );
}
