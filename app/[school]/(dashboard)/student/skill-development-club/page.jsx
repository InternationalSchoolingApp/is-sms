import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for E-Sports Club > Skill Development
// (skill-development-club), so this page overrides the student/[...module] catch-all.
export default function SkillDevelopmentClubPage() {
  return <ClubPage pageLink="skill-development-club" />;
}
