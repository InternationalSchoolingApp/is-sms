import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Newsletter
// (the-newsletter-club), so this page overrides the student/[...module] catch-all.
export default function TheNewsletterClubPage() {
  return <ClubPage pageLink="the-newsletter-club" />;
}
