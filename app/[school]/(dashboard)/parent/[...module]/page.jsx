import { ParentModulePlaceholder } from "@/components/parent/ParentModulePlaceholder";

// Catch-all for parent dashboard modules not yet migrated. A real folder for a segment (e.g.
// parent/parent-attendance/page.jsx) takes precedence over this automatically, module by module.
export default function ParentModulePage() {
  return <ParentModulePlaceholder />;
}
