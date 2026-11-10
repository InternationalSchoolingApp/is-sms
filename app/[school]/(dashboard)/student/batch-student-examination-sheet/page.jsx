import { ExamDetails } from "@/components/student/ExamDetails";

// Route segment matches the real MODULES.PAGE_LINK value for "Examination
// Schedule" (batch-student-examination-sheet) — see
// external-resource/43_0_0_BATCH_DATE_SHEET.sql — so this page overrides the
// student/[...module] catch-all for this sidebar item automatically.
export default function ExamDetailsPage() {
  return <ExamDetails />;
}
