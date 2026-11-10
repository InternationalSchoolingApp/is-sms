import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Gaming Club
// (the-gaming-club), so this page overrides the student/[...module] catch-all.
export default function TheGamingClubPage() {
  return <ClubPage pageLink="the-gaming-club" />;
}
