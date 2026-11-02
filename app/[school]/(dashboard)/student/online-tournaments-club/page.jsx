import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Online Tournaments
// (online-tournaments-club), so this page overrides the student/[...module] catch-all.
export default function OnlineTournamentsClubPage() {
  return <ClubPage pageLink="online-tournaments-club" />;
}
