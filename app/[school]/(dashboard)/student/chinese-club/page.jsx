import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Language Club > Chinese
// (chinese-club), so this page overrides the student/[...module] catch-all.
export default function ChineseClubPage() {
  return <ClubPage pageLink="chinese-club" />;
}
