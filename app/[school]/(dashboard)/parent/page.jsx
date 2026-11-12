import { ParentHome } from "@/components/parent/ParentHome";

// Server shell for the parent dashboard home/landing. The parent's own page, like student/page.jsx is the
// student's: ParentHome ("use client") owns the interactivity. Child picker is Phase B, home widgets Phase C.
export default function ParentHomePage() {
  return <ParentHome />;
}
