import { StudentHome } from "./StudentHome";

// Server shell for the student dashboard home/landing. Keeps the route a server
// component; StudentHome ("use client") owns the interactivity. The home screen
// (calendar: classes/activities/assignments + announcements/onboarding/holidays)
// is built in Phase B. Re-enrollment stays out (separate branch).
export default function StudentHomePage() {
  return <StudentHome />;
}
