import { ParentDetailsStep } from "./ParentDetailsStep";

// Server Component shell. The interactive wizard logic lives in
// ParentDetailsStep (client); this page keeps the route a Server Component.
export default function StudentEnrollmentStep2Page() {
  return <ParentDetailsStep />;
}
