import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Focus & Reaction Training
// (focus-reaction-training-club), so this page overrides the student/[...module] catch-all.
export default function FocusReactionTrainingClubPage() {
  return <ClubPage pageLink="focus-reaction-training-club" />;
}
