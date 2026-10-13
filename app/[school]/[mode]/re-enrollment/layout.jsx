import { notFound } from "next/navigation";
import { RE_ENROLLMENT_MODES } from "@/utils/reEnrollmentSteps";
import { ReEnrollmentChrome } from "./ReEnrollmentChrome";

// Server Component layout for the re-enrollment pages: mounts the shared chrome (session, flag check,
// eligibility, shell) once around every screen. {mode} is "embed" (no header / footer) or "share" (with them);
// anything else is not a re-enrollment URL.
export default async function ReEnrollmentLayout({ children, params }) {
  const { mode } = await params;
  if (!RE_ENROLLMENT_MODES.includes(mode)) notFound();
  return <ReEnrollmentChrome>{children}</ReEnrollmentChrome>;
}
