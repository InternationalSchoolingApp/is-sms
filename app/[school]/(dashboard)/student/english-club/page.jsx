import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Language Club > English
// (english-club), so this page overrides the student/[...module] catch-all.
export default function EnglishClubPage() {
  return <ClubPage pageLink="english-club" />;
}
