import { Attendance } from "@/components/student/Attendance";

// Route segment matches the live sidebar pageLink for "My Attendance"
// (student-attendance-overview), so this page overrides the student/[...module] catch-all.
export default function AttendancePage() {
  return <Attendance />;
}
