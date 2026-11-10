# Dummy (demo) student mode — legacy analysis and Next.js plan

Source: `is-rest-api/src/main/resources/static/theme2/js/custom/dummyStudentDashboardData.js` (2690 lines, one IIFE).

## 1. How the file is built

- ~200 private helpers inside the IIFE (grade/subject tables, seeded random, date math, response builders).
- ~60 public `window.*` exports. Other legacy files only ever call these exports, always behind
  `if (isDummyStudentMode() && typeof getDummyX === "function") return getDummyX(...)` **instead of** the real AJAX call.
- 4 self-running patches when dummy mode is on: `patchDummySchoolCalendar()` (overrides `window.callSchoolCalendar`),
  `patchDummyStudentAnnouncementTimeAgo()` (overrides `window.timeAgo`), `dummyStudentDashboardManagementPatchAjax()`
  (admin management page), `watchDummyStudentTranscriptContent()` (MutationObserver that rewrites the transcript DOM).
- Also forces `USER_TIMEZONE = "America/New_York"` and overwrites the header name / `USER_FULL_NAME` with the demo student name.

## 2. How dummy mode turns on (legacy)

`window.isDummyStudentMode()` = **true** when
1. JSP global `isDemoUser` is true (`BaseController.updateModel`: `user.getDemoUser() == "Y"`), **or**
2. URL has `?dummyStudent=Y`;

and **false** whenever URL has `?parentDemoPreview=Y`.

Real flow: counselor/admin opens the "view as user" spoof URL with `type=DS` → `ClientCommonController.viewAsUser` logs in as
demo user **18059** (`demoUser='Y'`) and stores `DEMO_DASHBOARD_USER = "DS|entityId|counselorUserId"` in the **Java session**
(`sessionUtil.setDemoUserDetails`), exposed to JSP as the `DEMO_DASHBOARD_USER` global.

Server side, the demo user lands on the normal student dashboard controller
`ClientDashboardStudentController.dashboardStudent` (`/{schoolId}/dashboard/student/{UNIQUEUUID}`, line 184): same session
checks, same `updateModel` (which sets `isDemoUser` and `DEMO_DASHBOARD_USER` for the JSP). The only demo-specific branch is
line 425: `isDemoUser = "Y".equals(user.getDemoUser())` → for a demo user the real LMS login URL (`lmsProviderURL`) and the
LMS lock message (`isPayLmsPaymentPending`: unpaid installments / LMS account disabled) are **not computed**. The header LMS
switch (`dashboardCommon.js redirectLms`) then shows `getDummyStudentLmsPendingMessage()` = "Dummy LMS user is not mapped."
unless the demo row/URL carries a `dummyLmsUserId`, in which case `dummyLmsProviderUrl()` is used.

Data source: `hydrateDbRows()` posts `{userId, entityId, demoFeedUserId}` to **`/dashboard/student/demo-data`**
(`ParentDashboardDemoDataController.studentDemoData`, session-gated, demo students only) → `StudentDashboardDemoData` row
(student name, grade, learning program, courses, teachers, class/activity counts). Everything else (subjects, teachers,
dates, fees, scores) is generated from that row + URL params (`dummyGrade`, `dummyStandardId`, `demoCourseId`,
`demoStudentName`, …), falling back to built-in grade tables. Base date = "now"; no extra backend calls.

## 3. Every public export → legacy caller → Next.js target

### Modules already migrated to Next (need dummy support)

| Next module (route) | Legacy caller | Dummy exports used |
|---|---|---|
| My Performance (`student-progress-report`) — `Performance.jsx`, `PerformanceProgressModal.jsx`, `PerformanceGradeHistoryModal.jsx` | studentAcademicPerformance.js | `getDummyStudentAcademicPerformanceResponse`, `getDummyStudentAcademicProgressDetailResponse`, `getDummyStudentAcademicGradeHistoryResponse` |
| My Progress Reports (`progress-detail`) — `ProgressReports.jsx`, `ProgressReportView.jsx` | studentProgressDetail.js | `getDummyStudentProgressReportsResponse`, `getDummyStudentProgressReportHtml` (**legacy returns HTML; Next renders JSON → needs a JSON builder from the same data**) |
| My Fee Details (`fee-details`) — `FeeDetails.jsx` | studentFeeDetails.js(+Content) | `getDummyStudentFeeDetailsResponse` (+ dummy receipt via localStorage `saveReceiptData` — verify receipt link handling) |
| My Log in History (`student-login-details`) — `LoginHistory.jsx` | studentLoginHistory.js | `getDummyStudentParentLoginHistoryResponse` (details already carry `studentName`, the port's resolver picks it up) |
| My Attendance (`student-attendance-overview`) — `Attendance.jsx` | attendaceByStudentId.js | `getDummyStudentAttendanceFullResponse` |
| My Assigned Teacher (`syllabus-assigned-teacher`) — `Syllabus.jsx` | studentSyllabusAssignedTeacher.js | `getDummyStudentAssignedTeacherResponse` |
| Book Classes (`book-a-session`) — `components/student/bookClass/*` | studentBookClass.js, studentBookClassContent.js, manageTeacherAvailability.js, dashboardRecurring.js | `getDummyBookAClassResponse`, `getDummyStudentBookClassDetailsResponse`, `getDummyAssignedTeacherDetailsResponse`, `getDummyTeacherWeeklyCalendarResponse`, `getDummyStudentBookedClassesDetailsResponse`, `getDummyStudentBookClassSubmitResponse` |
| Buy Extra Classes + Cart (`student-addon`, `cart`) — `components/student/cart/*`, `useCartCheckout` | jquery.commonFunction.js, commonPaymentGateway.js | `getDummyBuyExtraClassResponse`, `getDummyAddToCartResponse`, `getDummyCartCountResponse`, `getDummyCartDetailsResponse`, `getDummyUpdateCartDetailsResponse`, `getDummyApplyDiscountOnCartResponse`, `getDummyCartPaymentResponse` (cart kept in localStorage), `showDummyBookSessionPaymentOptions`, `showDummyStripeCheckoutPage` (Next has a TODO stub), `showDummyPaymentSuccessPage` / `dummyGoToDashboard` / `payDummyActivePaymentOption` (used from generated HTML) |
| Transcript (`student-transcript`) — `Transcript.jsx` | DOM patch `applyDummyStudentTranscriptContent` (self-running) | needs dummy transcript rows/JSON instead of DOM rewriting |
| Student home (`/student`) — `StudentHome.jsx`, `components/dashboard/calendar/*` | studentDashboardContent.js, dashboardCalendar.js, dashboardCalendarNew.js, studentMigration.js, dashboardCommon.js | `getDummyStudentBaseDate`, `getDummyStudentCurrentTimeText`, `callSchoolCalendar` patch (classes, assignments, holidays, activities), `getDummyGradeKSchoolCalendarResponse`, `getDummyGradeKClassDetailsResponse`, `getDummyGradeKDashboardDetails`, `getDummyGradeKDashboardOrMigrationSection`, `getDummyStudentLmsPendingMessage` |
| Right rail — `AnnouncementsPanel/Widget`, `NewsPanel`, `DiaryPanel`, activities | announcement.js, news.js, activity.js, parentSchoolDiary.js, masterContent.js | `getDummyAnnouncementDetails`, `getDummyAnnouncementById`, `timeAgo` patch, `getDummyNewsList`, `getDummyNewsById`, `getDummyActivityDetailsResponse`, `getDummyViewActivityResponse`, `getDummyStudentDiaryThreadList`, `getDummyStudentDiaryMessages`, `getDummyStudentDiaryMentions`, `getDummyStudentDiaryUnreadCount` |
| Header / name | (self-running) `syncDummyStudentProfileName` | demo student name replaces the header name |

### Not needed for the student dashboard

- Parent-only pages: `getDummyStudentScheduleResponse` (parentDashboard.js, parentStudentClassSchedule.js), `getDummyStudentClassSummaryResponse` (parentStudentClassSummary.js), `openDummyStudentTranscriptFromUrl` (parentAcademicDocsContent.js).
- Admin management page: `dummyStudentDashboardManagement*`, `getStudentDashboardManagementSpoofUrlParams`.
- No caller found: `setDummyStudentSourceData`.
- Clubs, Student Handbook, Exam Schedule: legacy has no dummy logic.
- `getDummySubjectOptionsByGrade` (jquery.commonFunction.js, masterContent.js): subject dropdowns — check if any migrated page uses them.

## 4. Implementation plan (Next.js)

### Phase 0 — foundation (blocks everything else)
1. **Activation.** Next's `isDummyStudentMode()` (utils/paymentGatewayChecks.js) only reads `?dummyStudent=Y`; `isDemoUser` has no Next source. **Decision needed:** expose `demoUser` through an existing endpoint (e.g. the get-demo-dashboard-user-details call the sidebar already makes) or carry it in the next-auth session at SSO time.
2. **Demo data row.** `/dashboard/student/demo-data` needs `entityId` from `DEMO_DASHBOARD_USER`, which lives only in the Java session. **Decision needed:** let that existing endpoint fall back to the session's demo details when no `entityId` is sent, or expose `DEMO_DASHBOARD_USER` through an existing endpoint.
3. **Port the generator** as plain JS (no jQuery/DOM): `utils/dummyStudent/` — config tables, seeded helpers, `gradeKey()`, `subjects()`, base date, and one builder per feature returning **the same response shape as the real API**.
4. **One hook point:** a `useDummyStudent()` hook (`{ enabled, source }`) loaded once in the dashboard context; each module hook's `queryFn` returns the dummy builder instead of calling the server action when enabled. Server actions stay untouched (they have no window/URL).
5. Timezone override (America/New_York) and demo name in header + Login History.
6. The demo flag is needed server-side too (line 425 skips the LMS URL/lock for demo users), so wherever the Next app
   builds the LMS switch it must skip the real LMS lookup for a demo user. Note: the Next header's LMS switch has no LMS
   wiring yet (no `lmsProviderURL` / `isPayLmsPaymentPending` / `redirect-user-to-LMS` anywhere in is-sms), so the
   demo branch belongs to that migration: demo user → no real LMS URL, show "Dummy LMS user is not mapped." (or the
   `dummyLmsUserId` provider URL).

### Phase 1 — modules built in this session (small, self-contained)
Login History → Fee Details → My Performance (list + 2 modals) → Progress Reports (needs the new JSON report builder).

### Phase 2 — other migrated modules
Attendance, Assigned Teacher, Transcript.

### Phase 3 — home + right rail
Base date / clock, calendar (classes, assignments, holidays, activities, Grade K), migration section, announcements (+ time-ago), news, activities, diary, LMS pending message.

### Phase 4 — transactional flows
Book Classes, Buy Extra Classes, Cart (localStorage), dummy payment options → dummy Stripe checkout → success page (replaces the `showDummyStripeCheckoutPage` TODO in Next).

## 5. Progress

- **Phase 0 — done.** Demo flag: `SsoExchangeResponse.demoUser` → next-auth `session.demoUser` → `context.demoUser` →
  `isDummyStudentMode(demoUser)`. Demo row: `/dashboard/student/demo-data` falls back to the session's
  `DEMO_DASHBOARD_USER` when no `entityId` is sent. Generator: `utils/dummyStudent.js` (`createDummyStudent`).
  Hook: `hooks/useDummyStudent.js` (`settled`, `enabled`, `student`, `key`).
  Not yet: timezone override (America/New_York), demo name in the header.
- **Phase 1 — done.** Login History, Fee Details (+ dummy receipt via the proxied
  `/static/theme2/dummy-parent-fee-receipt.html` and localStorage), My Performance (+ progress and grade-history
  modals), Progress Reports (list + report built as the format=json response). Checked with `?dummyStudent=Y`;
  a real demo account (spoof `type=DS`) not yet tested.
- **Phase 2 — done.** Attendance (`useStudentAttendance`; dummy data also carries the real API's field names the
  Next.js page reads), Assigned Teacher (`useStudentAssignedTeacher`), Transcript (`useStudentTranscriptStatus`;
  like legacy, only rewritten for a demo account with a demo row: demo name/grade + `dummy-parent-transcript.html`
  links, email and Student ID stay real). `Attendance.jsx` itself untouched. Course-content modal on Assigned
  Teacher has no legacy dummy data (still calls the real API).
- **Phase 3 — done.** Right rail: announcements (rail + home widget; `timeLabel` shown for club items, local-only
  acknowledge, `seenStatus` added for the Next.js "New" badge), news (list, detail, "View All"), diary (threads,
  messages, unread badge; no mark-read call). Home: calendar (`useStudentCalendar`: K-5 max 3 classes/week, 6-12 one
  rotating class per weekday, assignments with Pending/Submitted/Upcoming, holidays, `activityCount` activities) and
  the dashboard-details / migration calls (`useStudentDashboardData`: every popup off, no onboarding video).
  Differences: dummy events use the viewer's timezone (legacy forced America/New_York for the whole page), activity
  names are seeded instead of Math.random, the older Grade K calendar (`getDummyGradeKSchoolCalendarResponse` /
  class details) is not used by the Next.js calendar, dummy classes have no join URL. Chat unseen count has no dummy.
- **Phase 4 — done.** Book Classes (gate, course list, all-courses picker, weekly slot picker, confirm — nothing is
  booked, booked-classes history), Buy Extra Classes (plans per subject / K-5 grade), Cart (`hooks/useStudentCart.js`:
  queries + add / remove / discount / cart-payment answered by `utils/dummyStudent.js`; items kept in localStorage
  `DUMMY_EXTRA_CLASS_CART_{uid}`, plan dates formatted like the real cart). Pay: `useCartCheckout` opens the picker
  with only Stripe + Airwallex (no check-payment / gateway-options calls), and a gateway opens
  `components/student/cart/DummyCheckout.jsx` (legacy renderDummyStripeCheckoutPage: INR 98.2304 / USD, card form,
  "Powered by stripe|airwallex") → Pay → success page (5s countdown) → clears the dummy cart and returns to the
  dashboard home, keeping the query string. Differences: rendered as an overlay instead of `document.write`; with
  `?dummyStudent=Y` the app's own links (e.g. Buy → cart) drop the flag, so the next page is real — a demo account
  (session flag) is not affected. The enrollment wizards' `showDummyStripeCheckoutPage` stub is unchanged.
