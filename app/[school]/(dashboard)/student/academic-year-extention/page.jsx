import { AcademicYearExtension } from "@/components/student/AcademicYearExtension";

// Route segment matches the live sidebar pageLink for "Course Extension"
// (academic-year-extention), so this page overrides the student/[...module] catch-all.
export default function AcademicYearExtensionPage() {
  return <AcademicYearExtension />;
}
