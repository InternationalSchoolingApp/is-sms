import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Debate Club
// (the-debate-club), so this page overrides the student/[...module] catch-all.
export default function TheDebateClubPage() {
  return <ClubPage pageLink="the-debate-club" />;
}
