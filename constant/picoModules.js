import { INBOX_TIP } from "@/utils/inbox";
import { CLUBS } from "@/constant/Clubs";

/**
 * What Pico says about each dashboard module, in one place (the buddy explains the module the student is on, by itself
 * once the page has finished loading, and again whenever the student taps it).
 *
 * Key = the last part of the page address (the module's pageLink); the home page is HOME_MODULE. A module that has no
 * entry gets NO_MODULE_TEXT when the student taps the buddy.
 */

export const HOME_MODULE = {
  title: "Dashboard",
  text: "This is your dashboard. Here you can see today's classes, your calendar and everything planned for you. Tap a day to see its plan!",
};

export const NO_MODULE_TEXT = "I'm here to help you around your dashboard! Use the side menu to open a section and tap me there, and I'll tell you what it is.";

const CLUB_TEXT = "Pick a club from the menu and join the fun!";

export const PICO_MODULES = {
  "syllabus-assigned-teacher": { title: "My Assigned Teacher", text: "These are your courses! Tap See course calendar to see every lesson and when it is due." },
  "student-attendance-overview": { title: "Attendance", text: "This is your Attendance section. Here you can check your attendance and see which classes you attended or missed." },
  "student-transcript": { title: "Transcript", text: "Tap the dots button to see your transcript." },
  "student-handbook": { title: "Student Handbook", text: "This book tells you all about your school!" },
  "student-login-details": { title: "Login History", text: "Here you can see every time you logged in!" },
  "academic-year-extention": { title: "Course Extension", text: "Tap a course to see how you can extend it." },
  "student-video-library": { title: "Video Library", text: "Watch your lessons in order, one by one!" },
  "my-certificates": { title: "Certificates", text: "Need a certificate? Tap Request a certificate and the school will make it for you." },
  "student-progress-report": { title: "My Performance", text: "This is your My Performance section. Here’s how you’re doing in every course!" },
  "progress-detail": { title: "My Progress Reports", text: "Tap View to open a full report for that week!" },
  "my-profile": { title: "My Profile", text: "This page is all about you! Keep your details up to date." },
  "fee-details": { title: "Fee Details", text: "This is your Fee Details section. Here you can see your payments and what is still due." },
  "batch-student-examination-sheet": { title: "Exam Sheet", text: "This is your Exam Sheet. Here you can see your exam marks." },
  inbox: { title: "Communication", text: INBOX_TIP },
  "inbox-compose": { title: "Communication", text: INBOX_TIP },
  "student-addon": { title: "Buy & Book a Class", text: "Want more classes? Pick a plan, then ask a grown-up to buy it!" },
  cart: { title: "Cart", text: "Want more classes? Pick a plan, then ask a grown-up to buy it!" },
  // Every club page (Language, Social and E-Sports clubs).
  ...Object.fromEntries(Object.keys(CLUBS).map((pageLink) => [pageLink, { title: "Club", text: CLUB_TEXT }])),
};

/** The module for the last part of the page address; null when Pico has nothing about it. */
export function picoModuleFor(segment) {
  return PICO_MODULES[segment] || null;
}

/**
 * The first welcome. On the home page it opens the tour (so it ends by inviting the student to tap Next); anywhere else
 * it is a plain welcome. Never mentions anything that is not on every student's dashboard.
 */
export function picoWelcomeText({ firstName, schoolName, buddyName, tour }) {
  const hello = `Hello${firstName ? ` ${firstName}` : ""}!`;
  const school = schoolName ? `Welcome to the ${schoolName} Family!` : "Welcome!";
  return tour
    ? `${hello} ${school} I'm ${buddyName}, your calendar buddy. Tap Next and I'll show you around!`
    : `${hello} ${school} I'm ${buddyName}, your learning assistant. I'm here to help you explore your dashboard. Let's get started!`;
}
