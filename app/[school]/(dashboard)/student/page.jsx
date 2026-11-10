import { StudentHomeForGrade } from "./StudentHomeForGrade";

// Server shell for the student dashboard home/landing. Keeps the route a server
// component; StudentHome ("use client") owns the interactivity. The home screen
// (calendar: classes/activities/assignments + announcements/onboarding/holidays)
// is built in Phase B. Re-enrollment stays out (separate branch). Grade K–5 students
// (isK5) get the K–5 planner home instead (StudentHomeForGrade).
export default function StudentHomePage() {
  return <StudentHomeForGrade />;
}
