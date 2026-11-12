import { redirect } from "next/navigation";
import { getAccountSession } from "@/lib/auth/session";
import { teacherStepBasePath } from "@/utils/teacherRegistrationSteps";

// /{school}/teacher-registration: the public landing page. Where the account is created (built in a later phase);
// a teacher who is already signed in is sent straight on to their step.
export default async function TeacherRegistrationLandingPage({ params }) {
  const { school } = await params;
  const session = await getAccountSession();
  if (session) {
    redirect(teacherStepBasePath(school));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f2f5fa] px-4">
      <div className="max-w-md rounded-xl bg-white p-6 text-center shadow-sm">
        <h1 className="text-lg font-bold text-black">Teacher registration</h1>
        <p className="mt-2 text-sm text-slate-600">Account creation is being built. Please check back soon.</p>
      </div>
    </main>
  );
}
