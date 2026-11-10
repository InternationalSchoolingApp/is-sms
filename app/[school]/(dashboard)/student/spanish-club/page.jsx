import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Language Club > Spanish
// (spanish-club), so this page overrides the student/[...module] catch-all.
export default function SpanishClubPage() {
  return <ClubPage pageLink="spanish-club" />;
}
