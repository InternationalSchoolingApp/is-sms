import { Syllabus } from "@/components/student/Syllabus";

// Route segment matches the real MODULES.PAGE_LINK value for "Syllabus &
// Assigned Teacher" (syllabus-assigned-teacher, ONE_TO_ONE students) — see
// external-resource/MODULES.sql:80 — so this page overrides the
// student/[...module] catch-all for this sidebar item. BATCH students use a
// separate syllabus-assigned-batch-teacher pageLink, out of scope here.
export default function SyllabusPage() {
  return <Syllabus />;
}
