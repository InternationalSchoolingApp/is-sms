import { StudentHandbook } from "@/components/student/StudentHandbook";

// Route segment matches the live sidebar pageLink for "Student Handbook"
// (student-handbook), so this page overrides the student/[...module] catch-all.
export default function StudentHandbookPage() {
  return <StudentHandbook />;
}
