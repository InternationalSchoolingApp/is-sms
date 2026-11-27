import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Team Communication
// (team-communication-club), so this page overrides the student/[...module] catch-all.
export default function TeamCommunicationClubPage() {
  return <ClubPage pageLink="team-communication-club" />;
}
