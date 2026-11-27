import { FeeDetails } from "@/components/student/FeeDetails";

// Route segment matches the live sidebar pageLink for "My Fee Details"
// (fee-details), so this page overrides the student/[...module] catch-all.
export default function FeeDetailsPage() {
  return <FeeDetails />;
}
