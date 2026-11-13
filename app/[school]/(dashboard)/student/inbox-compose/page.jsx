import { Inbox } from "@/components/student/inbox/Inbox";

// Route segment matches the live sidebar pageLink for Communication > Compose (inbox-compose): the same Inbox page,
// opened with "Write a message" open — as the existing page does (adminController.js: initInbox({ compose: true })).
export default function InboxComposePage() {
  return <Inbox openCompose />;
}
