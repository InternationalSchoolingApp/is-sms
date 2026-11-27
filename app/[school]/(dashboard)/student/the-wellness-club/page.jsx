import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Wellness Club
// (the-wellness-club), so this page overrides the student/[...module] catch-all.
export default function TheWellnessClubPage() {
  return <ClubPage pageLink="the-wellness-club" />;
}
