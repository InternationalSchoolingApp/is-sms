import { CourseSelectionStep } from "./CourseSelectionStep";

// Server Component shell. The interactive wizard logic lives in
// CourseSelectionStep (client); this page keeps the route a Server Component.
export default function StudentEnrollmentStep3Page() {
  return <CourseSelectionStep />;
}
