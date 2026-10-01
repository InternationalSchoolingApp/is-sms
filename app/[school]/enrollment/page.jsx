import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getSignupStageStatus } from '@/services/studentSignupApi';
import { DEFAULT_PROGRAM, stepPath } from '@/utils/wizardSteps';

export default async function  page({params}) {
  const session = await auth();
  if (!session){
    redirect(process.env.NEXT_PUBLIC_BACKEND_BASE_URL);
  }
  const {school} = await params;

  let response = null;
  try {
    response = await getSignupStageStatus(session.schoolUUID, session.uniqueId);
  } catch (err) {
    console.error("Enrollment stage status check failed:", err);
  }
  if (response?.status === "1" && response.redirectUri && !response.redirectUri.includes("/step/")) {
    redirect(response.redirectUri);
  }
  const step = response?.wizardStep >= 1 && response?.wizardStep <= 4 ? response.wizardStep : 1;
  redirect(stepPath(school, DEFAULT_PROGRAM, step));
}
