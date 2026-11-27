import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Global Competitions
// (global-competitions-club), so this page overrides the student/[...module] catch-all.
export default function GlobalCompetitionsClubPage() {
  return <ClubPage pageLink="global-competitions-club" />;
}
