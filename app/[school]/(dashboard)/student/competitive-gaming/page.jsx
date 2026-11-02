import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Competitive Gaming
// (competitive-gaming), so this page overrides the student/[...module] catch-all.
export default function CompetitiveGamingClubPage() {
  return <ClubPage pageLink="competitive-gaming" />;
}
