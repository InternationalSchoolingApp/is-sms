import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Book Club
// (the-book-club), so this page overrides the student/[...module] catch-all.
export default function TheBookClubPage() {
  return <ClubPage pageLink="the-book-club" />;
}
