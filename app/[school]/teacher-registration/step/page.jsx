import { redirect } from "next/navigation";
import { getAccountSession } from "@/lib/auth/session";
import { getTeacherRegistrationProcess } from "@/services/teacherSignupApi";
import { loginPageUrl } from "@/utils/backendOrigin";
import { isTeacherStep, teacherRegistrationPath, teacherStepPath } from "@/utils/teacherRegistrationSteps";

// Bare /{school}/teacher-registration/step: sends the teacher to the step the backend says they belong on (the same
// resume the step pages run on a refresh), or to the landing page / login page when there is nobody to resume.
export default async function TeacherRegistrationStepIndexPage({ params }) {
  const { school } = await params;
  const session = await getAccountSession();
  if (!session) {
    redirect(teacherRegistrationPath(school));
  }

  let response = null;
  try {
    response = await getTeacherRegistrationProcess(session.schoolUUID, session.uniqueId);
  } catch (err) {
    console.error("Teacher registration process check failed:", err);
  }
  // status "3" = the backend says the session is out.
  if (response?.status === "3") {
    redirect(loginPageUrl(school));
  }
  if (response?.state === "REDIRECT" && response.redirectUri) {
    redirect(response.redirectUri);
  }
  redirect(teacherStepPath(school, isTeacherStep(response?.wizardStep) ? response.wizardStep : 1));
}
