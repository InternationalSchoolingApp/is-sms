import { StudentDetailsStep } from "./StudentDetailsStep";

// Server Component shell. The wizard step is client-orchestrated (session,
// react-query, router, sessionStorage), so the interactive logic lives in
// StudentDetailsStep; this page keeps the route a Server Component.
export default function StudentEnrollmentStep1Page() {
  return <StudentDetailsStep />;
}
