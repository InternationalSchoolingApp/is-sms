import { Transcript } from "@/components/student/Transcript";

// Route segment matches the real MODULES.PAGE_LINK value for "My Transcript"
// (student-transcript) — see external-resource/MODULES.sql:82 — so this page
// overrides the student/[...module] catch-all for this sidebar item.
export default function TranscriptPage() {
  return <Transcript />;
}
