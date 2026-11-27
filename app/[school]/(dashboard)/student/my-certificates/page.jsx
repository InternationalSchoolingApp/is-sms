import { MyCertificates } from "@/components/student/MyCertificates";

// Route segment matches the live sidebar pageLink for "My Certificates"
// (my-certificates), so this page overrides the student/[...module] catch-all.
export default function MyCertificatesPage() {
  return <MyCertificates />;
}
