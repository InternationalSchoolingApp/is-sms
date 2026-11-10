import { getAccountSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { DEFAULT_PROGRAM } from "@/utils/wizardSteps";
import { resolveBackendNavigationOrigin } from "@/utils/backendOrigin";

export default async function Home() {
  const session = await getAccountSession();
  if (!session){
    const schoolUUID = process.env.NEXT_PUBLIC_SCHOOL_ID;
    redirect(schoolUUID ? `/${schoolUUID}/enrollment/${DEFAULT_PROGRAM}` : resolveBackendNavigationOrigin());
  }
  // The wizard lives under /{school}/enrollment/{program}/step/{slug}. The
  // session carries the school but not the enrollment program (the backend
  // handoff doesn't provide one), so use the default program segment; the
  // wizard resolves the real program from the session on load, and
  // useWizardResume moves the student to their actual saved step.
  const { schoolUUID, step = "student-details" } = session;
  redirect(`/${schoolUUID}/enrollment/${DEFAULT_PROGRAM}/step/${step}`);
}
