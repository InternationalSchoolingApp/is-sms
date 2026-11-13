import { Inbox } from "@/components/student/inbox/Inbox";

// Route segment matches the live sidebar pageLink for Communication > Inbox (inbox), so this page overrides the
// student/[...module] catch-all.
export default function InboxPage() {
  return <Inbox />;
}
