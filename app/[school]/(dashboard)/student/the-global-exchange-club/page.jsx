import { ClubPage } from "@/components/student/ClubPage";

// Route segment matches the live sidebar pageLink for Social Club > The Global Exchange Club
// (the-global-exchange-club), so this page overrides the student/[...module] catch-all.
export default function TheGlobalExchangeClubPage() {
  return <ClubPage pageLink="the-global-exchange-club" />;
}
