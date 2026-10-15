import { AddCourseSelectionStep } from "./AddCourseSelectionStep";

// Server Component shell. The interactive wizard logic lives in
// AddCourseSelectionStep (client); this page keeps the route a Server Component.
// Mirrors app/[school]/enrollment/[program]/step/course-selection/page.jsx.
export default function AddEnrollmentCourseSelectionPage() {
  return <AddCourseSelectionStep />;
}
