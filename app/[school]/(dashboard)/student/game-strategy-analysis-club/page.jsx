import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Game Strategy & Analysis
// (game-strategy-analysis-club), so this page overrides the student/[...module] catch-all.
export default function GameStrategyAnalysisClubPage() {
  return <ClubPage pageLink="game-strategy-analysis-club" />;
}
