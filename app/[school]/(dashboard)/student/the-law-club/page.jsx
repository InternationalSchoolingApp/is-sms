import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Law Club
// (the-law-club), so this page overrides the student/[...module] catch-all.
export default function TheLawClubPage() {
  return <ClubPage pageLink="the-law-club" />;
}
