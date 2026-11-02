import { LoginHistory } from "@/components/student/LoginHistory";

// Route segment matches the live sidebar pageLink for "My Log in History"
// (student-login-details), so this page overrides the student/[...module] catch-all.
export default function LoginHistoryPage() {
  return <LoginHistory />;
}
