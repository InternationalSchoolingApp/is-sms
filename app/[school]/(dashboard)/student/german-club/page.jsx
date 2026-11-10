import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Language Club > German
// (german-club), so this page overrides the student/[...module] catch-all.
export default function GermanClubPage() {
  return <ClubPage pageLink="german-club" />;
}
