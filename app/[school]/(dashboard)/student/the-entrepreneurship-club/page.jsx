import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Entrepreneurship Club
// (the-entrepreneurship-club), so this page overrides the student/[...module] catch-all.
export default function TheEntrepreneurshipClubPage() {
  return <ClubPage pageLink="the-entrepreneurship-club" />;
}
