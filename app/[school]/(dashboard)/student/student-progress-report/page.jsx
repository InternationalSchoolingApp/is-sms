import { Performance } from "@/components/student/Performance";

// Route segment matches the live sidebar pageLink for "My Performance"
// (student-progress-report, under Academic Reports), so this page overrides
// the student/[...module] catch-all for this sidebar item.
export default function PerformancePage() {
  return <Performance />;
}
