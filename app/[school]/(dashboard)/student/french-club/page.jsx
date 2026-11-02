import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Language Club > French
// (french-club), so this page overrides the student/[...module] catch-all.
export default function FrenchClubPage() {
  return <ClubPage pageLink="french-club" />;
}
