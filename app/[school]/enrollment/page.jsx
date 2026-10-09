import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getSignupStageStatus } from '@/services/studentSignupBackendApi';
import { DEFAULT_PROGRAM, stepPath } from '@/utils/wizardSteps';
import { loginPageUrl } from '@/utils/backendOrigin';

export default async function  page({params}) {
  const session = await auth();
  // `program` is only present when this page is re-exported at /{school}/enrollment/{program}/step.
  const {school, program = DEFAULT_PROGRAM} = await params;
  if (!session){
    redirect(`/${school}/enrollment/${program}`);
  }

  let response = null;
  try {
    response = await getSignupStageStatus(session.schoolUUID, session.uniqueId);
  } catch (err) {
    console.error("Enrollment stage status check failed:", err);
  }
  // status "3" = the backend says the session is out.
  if (response?.status === "3") {
    redirect(loginPageUrl(school));
  }
  if (response?.status === "1" && response.redirectUri && !response.redirectUri.includes("/step/")) {
    redirect(response.redirectUri);
  }
  const step = response?.wizardStep >= 1 && response?.wizardStep <= 4 ? response.wizardStep : 1;
  redirect(stepPath(school, program, step));
}
