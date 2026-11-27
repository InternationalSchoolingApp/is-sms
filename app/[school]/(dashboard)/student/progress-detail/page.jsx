import { ProgressReports } from "@/components/student/ProgressReports";

// Route segment matches the live sidebar pageLink for "My Progress Reports"
// (progress-detail, under Academic Reports), so this page overrides the
// student/[...module] catch-all for this sidebar item.
export default function ProgressReportsPage() {
  return <ProgressReports />;
}
