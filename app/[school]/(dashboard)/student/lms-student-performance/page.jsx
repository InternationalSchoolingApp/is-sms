import { Performance } from "@/components/student/Performance";

// Route segment matches the real MODULES.PAGE_LINK value for "My Performance"
// (lms-student-performance) — see external-resource/MODULES.sql:37 — so this
// page overrides the student/[...module] catch-all for this sidebar item.
export default function PerformancePage() {
  return <Performance />;
}
