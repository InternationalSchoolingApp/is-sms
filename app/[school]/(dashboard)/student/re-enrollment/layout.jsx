import { ReEnrollmentChrome } from "./ReEnrollmentChrome";

// Server Component layout for the re-enrollment pages, inside the student dashboard layout (sidebar / header):
// mounts the shared re-enrollment context (flag check, eligibility) once around every screen.
export default function ReEnrollmentLayout({ children }) {
  return <ReEnrollmentChrome>{children}</ReEnrollmentChrome>;
}
