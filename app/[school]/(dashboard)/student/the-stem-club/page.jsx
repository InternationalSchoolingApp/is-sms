import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The STEM Club
// (the-stem-club), so this page overrides the student/[...module] catch-all.
export default function TheStemClubPage() {
  return <ClubPage pageLink="the-stem-club" />;
}
