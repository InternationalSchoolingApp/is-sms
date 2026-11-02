import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > Student Council
// (student-council-club), so this page overrides the student/[...module] catch-all.
export default function StudentCouncilClubPage() {
  return <ClubPage pageLink="student-council-club" />;
}
