import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Art Club
// (the-art-club), so this page overrides the student/[...module] catch-all.
export default function TheArtClubPage() {
  return <ClubPage pageLink="the-art-club" />;
}
