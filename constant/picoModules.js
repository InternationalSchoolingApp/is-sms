import { INBOX_TIP } from "@/utils/inbox";
import { CLUBS } from "@/constant/Clubs";

/**
 * What Pico says about each dashboard module, in one place (the buddy explains the module the student is on when the
 * student taps it - never by itself).
 *
 * Key = the last part of the page address (the module's pageLink); the home page is HOME_MODULE. A module that has no
 * entry gets NO_MODULE_TEXT when the student taps the buddy.
 */

export const HOME_MODULE = {
  title: "Dashboard",
  text: "This is your dashboard. See your courses, your goal for the today and what's due next. Your calendar is in My classes.",
};

export const NO_MODULE_TEXT = "I'm here to help you around your dashboard! Use the side menu to open a section and tap me there, and I'll tell you what it is.";

const CLUB_TEXT = "Pick a club from the menu and join the fun!";

// What Pico says on each club page (key = the club's pageLink in constant/Clubs.js). Every line ends by pointing at the
// page's Register Now button.
const CLUB_TIPS = {
  // Language Club
  "spanish-club": "¡Hola! In the Spanish Club you learn Spanish words, songs and stories with friends. Tap Register Now to join!",
  "french-club": "Bonjour! The French Club is where you speak French, play word games and learn about France. Tap Register Now to join!",
  "german-club": "Hallo! In the German Club you learn German words and fun facts about Germany. Tap Register Now to join!",
  "english-club": "The English Club is for reading, speaking and writing in English with friends. Tap Register Now to join!",
  "chinese-club": "Ni hao! In the Chinese Club you learn Chinese words, characters and festivals. Tap Register Now to join!",
  // Social Club
  "team-building-club": "In the Team Building Club you play games and solve challenges together as a team. Tap Register Now to join!",
  "cultural-exchange-club": "The Cultural Exchange Club lets you meet friends from other countries and share your culture. Tap Register Now to join!",
  "leadership-skills-club": "The Leadership Skills Club helps you lead, plan and help your team. Tap Register Now to join!",
  "debate-club": "In the Debate Club you share your ideas, listen to others and learn to argue kindly. Tap Register Now to join!",
  "drama-expression-club": "The Drama and Expression Club is for acting, role play and showing your feelings on stage. Tap Register Now to join!",
  "public-speaking-club": "The Public Speaking Club helps you speak in front of others with confidence. Tap Register Now to join!",
  "student-council-club": "The Student Council is where students share ideas and help make school better. Tap Register Now to join!",
  "the-debate-club": "The Debate Club, IDOS, is where you practise speeches and debates like a diplomat. Tap Register Now to join!",
  "the-book-club": "The Book Club, ILS, is for reading books together and talking about them. Tap Register Now to join!",
  "the-art-club": "The Art Club, Viva De Lunaria, is for drawing, painting and making art with friends. Tap Register Now to join!",
  "the-stem-club": "The STEM Club, Aurelian, is for science, tech, engineering and maths projects. Tap Register Now to join!",
  "the-gaming-club": "The Gaming Club, Link Club, is where you play and talk about games with friends. Tap Register Now to join!",
  "the-law-club": "The Law Club, Lex Orbis, lets you explore rules, rights and mock trials. Tap Register Now to join!",
  "the-global-exchange-club": "The Global Exchange Club, Nexus, connects you with students around the world. Tap Register Now to join!",
  "the-wellness-club": "The Wellness Club, Radiant Mind, is about staying calm, healthy and happy. Tap Register Now to join!",
  "the-newsletter-club": "The Newsletter, The Horizons, is where you write and share school news and stories. Tap Register Now to join!",
  "the-entrepreneurship-club": "The Entrepreneurship Club helps you turn your ideas into a small business plan. Tap Register Now to join!",
  // E-Sports Club
  "focus-reaction-training-club": "The Focus and Reaction Training Club trains your eyes, hands and quick thinking. Tap Register Now to join!",
  "skill-development-club": "The Skill Development Club helps you get better at your favourite games step by step. Tap Register Now to join!",
  "team-communication-club": "In the Team Communication Club you learn to talk and plan with your team while you play. Tap Register Now to join!",
  "online-tournaments-club": "The Online Tournaments Club lets you play in online matches and tournaments. Tap Register Now to join!",
  "strategy-games-club": "The Strategy Games Club is for thinking ahead and planning smart moves in games. Tap Register Now to join!",
  "competitive-gaming": "The Competitive Gaming Club is for playing as a team and getting ready for matches. Tap Register Now to join!",
  "global-competitions-club": "The Global Competitions Club lets you take part in gaming contests with students worldwide. Tap Register Now to join!",
  "game-strategy-analysis-club": "In the Game Strategy and Analysis Club you study games and learn why moves win. Tap Register Now to join!",
};

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
  "re-enrollment": { title: "Re-enrollment", text: "This is the re-enrollment dashboard, click on the available options to continue your learning journey" },
  "batch-student-examination-sheet": { title: "Exam Sheet", text: "This is your Exam Sheet. Here you can see your exam marks." },
  inbox: { title: "Communication", text: INBOX_TIP },
  "inbox-compose": { title: "Communication", text: INBOX_TIP },
  "student-addon": { title: "Buy & Book a Class", text: "Want more classes? Pick a plan, then ask a grown-up to buy it!" },
  cart: { title: "Cart", text: "Want more classes? Pick a plan, then ask a grown-up to buy it!" },
  // Every club page (Language, Social and E-Sports clubs): each club says what it is about (CLUB_TIPS); a club without its
  // own line uses CLUB_TEXT.
  ...Object.fromEntries(Object.keys(CLUBS).map((pageLink) => [pageLink, { title: CLUBS[pageLink].title, text: CLUB_TIPS[pageLink] || CLUB_TEXT }])),
};

// Language Club pages whose line already opens with a hello in that language (¡Hola!, Bonjour!...): the welcome adds no
// "Hello {name}!" there. The English Club line has no hello of its own, so it keeps "Hello {name}!".
const LANGUAGE_CLUBS = new Set(["spanish-club", "french-club", "german-club", "chinese-club"]);

/** Is this page address one of the Language Club pages? */
export function isLanguageClub(segment) {
  return LANGUAGE_CLUBS.has(segment);
}

/** Is this page address (its last part) one of the club pages? */
export function isClubModule(segment) {
  return Boolean(segment && Object.prototype.hasOwnProperty.call(CLUBS, segment));
}

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
