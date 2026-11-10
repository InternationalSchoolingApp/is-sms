import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Strategy Games
// (strategy-games-club), so this page overrides the student/[...module] catch-all.
export default function StrategyGamesClubPage() {
  return <ClubPage pageLink="strategy-games-club" />;
}
