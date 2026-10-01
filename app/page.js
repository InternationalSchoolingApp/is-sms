import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { DEFAULT_PROGRAM } from "@/utils/wizardSteps";

export default async function Home() {
  const session = await auth()
  if (!session){
    redirect(process.env.NEXT_PUBLIC_BACKEND_BASE_URL);
  }
  // The wizard lives under /{school}/enrollment/{program}/step/{slug}. The
  // session carries the school but not the enrollment program (the backend
  // handoff doesn't provide one), so use the default program segment; the
  // wizard resolves the real program from the session on load, and
  // useWizardResume moves the student to their actual saved step.
  const { schoolUUID, step = "student-details" } = session;
  redirect(`/${schoolUUID}/enrollment/${DEFAULT_PROGRAM}/step/${step}`);
}
