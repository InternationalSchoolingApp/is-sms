# Student Dashboard — handoff memory for a new Claude Code session (2026-11-14)

> How to use: open Claude Code in `D:\Workspace\is-sms`, and tell it: "Read `docs/migration/student_dashboard_claude_handoff_2026-11-14.md` and save the rules and status in your memory." Or paste the sections you need into its memory.
> Detailed sources in the repo: `docs/migration/student_dashboard_handoff_2026-11-13.html` (gap list A–E, legacy references), `docs/migration/student_dashboard_qa_handover_2026-11-14.html` (QA test cases, conditions matrix), `docs/migration/d2_d3_backend_plan_2026-11-14.md`.

---

## 1. Project in one paragraph

The legacy Java/JSP student dashboard (is-rest-api, Spring Boot, port 8080) is being migrated module by module to Next.js (is-sms, port 3000). The user is a developer at International Schooling, writes in Hinglish/Hindi, and prefers short Hinglish replies. One URL `/{school}/student` serves every student; the **look** depends on grade band (Elementary K–5 "Playful", Middle 6–8 "Balanced", High 9–12 "Mature"; otherwise the older "standard shell"), the **content** depends on learning program, school, settings and the student's data. The legacy page is the reference for behaviour; the mockups are the reference for looks.

- is-sms: `D:\Workspace\is-sms`, branch `feature/version_1_3_0_phase4` (Next.js 16 / Turbopack, React, TanStack Query, Tailwind v4, shadcn/base-ui).
- is-rest-api: `D:\Workspace\is-rest-api`, branch `feature/63_0_0_STUDENT_DASHBOARD_NEXTJS_PHASE4`.
- Re-enrollment (other team): is-sms `feature/version_1_2_0_phase3`, is-rest-api `feature/63_0_0_STUDENT_ENROLLEMNT_NEXTJS_PHASE3`. The owner merges phase4 into phase3.
- Mockups (each has the same 18 page blocks `<sc-if value="{{pgX}}">`): `D:\Workspace\K-5 dashboard\Playful.dc.html`, `D:\Workspace\Grade 6–8 Dashboard\Middle.dc.html` (en dash in the folder name), `D:\Workspace\Grade 9-12 Dashboard\High.dc.html`.
- Legacy JS: `D:\Workspace\is-rest-api\src\main\resources\static\theme2\js\custom\` (e.g. `studentDashboardContent.js`, `dashboardCalendarNew.js`, `activity.js`, `commonPaymentGateway.js`, `contactCheck*.js`, `appInstallNotification.js`); JSPs under `src\main\webapp\WEB-INF\views\theme2\`.

## 2. Rules the user set (follow them always)

1. **Never commit.** No `git commit`, cherry-pick or merge on the user's branches. Leave changes uncommitted, list the files; the user commits.
2. **Work in the main checkout** `D:\Workspace\is-sms` on phase4. Worktrees only for memory housekeeping.
3. **No new backend endpoints.** Reuse existing ones; only add a field to an existing endpoint when truly needed, and ask first. Never change existing backend behaviour.
4. **No inline `style={{}}` for layout.** Tailwind only (mobile-responsive). Use rem arbitrary values (e.g. `text-[0.875rem]`, `rounded-[0.875rem]`) where the High skin's type/radius map must not touch a value.
5. **Date pickers**: always `components/ui/date-picker.jsx` (shadcn) with an icon; never native `<input type="date">`.
6. **Skeleton while loading** (shadcn `Skeleton`, `K5Loading`), never a plain "Loading…" in new work.
7. **School name is dynamic** (from the SSO session), never hardcode "International Schooling".
8. **Timezone fallback is `Asia/Singapore`** in both repos (see AGENTS.md); never overwrite a valid configured zone.
9. **Images**: prefer `next/image` (`OptimizedImage`), follow the image rules in `CLAUDE.md`.
10. **Grade looks only from a mockup**: do not pick the next Phase-6 module yourself; work on the module the user names.
11. **Migration (graduate student flow), class feedback (B1/A1) and re-enrollment E2/E3 belong to other teams** — don't touch. New popups run only for `studentGraduate == false`.
12. K5 buddy (Pico) rules: bubble opens after the LIVE NOW popup is answered; no bubble on Book a Class; page tips wait for menu + page content (`usePicoContentReady`); no left-nav highlight on clubs; tour ends with "All done" (no loop). Colour clues highlight only, never switch Today/Week/Month.
13. Selected/active/OK states use the student's chosen accent (`--k5-ac`, `--k5-acd`, `--k5-act`, `text-k5-acx`), not course colours.
14. Before each answer that changes code: lint the changed files (`npx eslint <files>`) and `npm run build`; verify in the browser pane when the change is visible.
15. Replies: short Hinglish summary; say plainly what was verified and what was not.

## 3. How things are wired (quick map)

- Context: `hooks/useDashboardContext.js` → `context` (userId, schoolUUID, schoolNumericId, uniqueId, role, userName, schoolName, chatUrl), `isK5`, `isMiddle` (true for High too), `isHigh`, `isPreK`, `isSelfStudy`, `menu`. Grade band logic: `utils/gradeBand.js` (+ env `NEXT_PUBLIC_MIDDLE_DASHBOARD`, `NEXT_PUBLIC_HIGH_DASHBOARD`, backend `k5DashboardEnabled`).
- Menu rules: `utils/dashboardNav.js` (`applyStudentNavRules`: batch exam sheet, fee details for online signup, menu flags, Extension hidden for provider 39 / standard 8, "Buy & Book a Class" label).
- Skins: `app/k5-middle.css` (Middle tokens/overrides) and `app/k5-mature.css` (High: generated type/weight/min-height/radius maps on exact Tailwind class spellings + `k5h-*` hook classes). Page title tile hook classes `k5h-*-tile` get 14px in k5-middle.css and 10px in k5-mature.css.
- Server calls: `utils/backendRequest.js` (`{ok,data}`), `services/*.js` ("use server"), `utils/serverCall.js` `callServer`. Backend answers `{status:"1"|"0"|"2"|"3", message, data}`.
- Dummy mode: `?dummyStudent=Y&dummyGrade=K|1..12` (URL needs the `/{school}/` slug; login still required). Extras: `dummyLms=40|41` (Canvas/Courseware progress report), `dummyDate`, `demoStudentName`, `demoLearningProgram`. Data: `utils/dummyStudent.js`; `hooks/useDummyStudent.js`.
- Popups mounted in `app/[school]/(dashboard)/student/StudentHomeForGrade.jsx`: contact check, reserve seat, system training, forced password, app-install prompt, Outlook reminder; K5 home adds complete-profile, onboarding video, graduation popup, live-class alert.

## 4. Status — what is DONE (all committed by the user, up to is-sms "Student New Dashboard Part 31")

- **Phase 0** stabilise; **Phase 1** money + safety: D1 payment-in-progress / already-paid / "School Payment Update" dialogs (`components/common/CheckoutExtraDialogs.jsx`, `hooks/useCartCheckout.js`), D7 "Payment Under Process" (school 5 wire transfer), D6b dummy-mode profile read-only (`utils/dummyProfile.js`), D6a "My contact details" card, C3 cart icon in header.
- **Phase 2**: C1 "Need help?" WhatsApp (`get-chat-eligibility`), C2 Quote of the Moment (`QUOTE_SERVICE`, `services/quoteApi.js`), C4 app-install popup (school 1, 10 s lock, 7-day dismiss), D4 exam sheet grade look.
- **Phase 3**: B3 activity details popup, B4 Missed/Late refresh when a class ends, B5 Outlook reminder (5-min snooze), B6: completed-class popup, onboarding video gating, grade-look calendar filters ("What to show"), complete-profile popup in the old shell, Attempt button on assignments, join refusal message.
- **Phase 4**: A2 batch-schedule — **dropped for good** by the user.
- **Phase 5**: D5 (Remaining Days, late-by days, "all activities" bar + backend `allDone/allTotal/allProgress` in `StudentPerformanceUtil`), D8 Syllabus search/paging + old-shell table, D9 old-shell Certificates (search, status chips, progress track) and Booked classes (search, sort, paging, Book a Class on All Courses), **D3** Transcript Diploma link + "(New)" label + view-right (backend `diplomaUrl`, `enrolmentType` in `ClientDashoboardMarksController.studentTranscriptStatus`; frontend `utils/transcriptLinks.js`), **D2** Canvas/Courseware report bodies (frontend only, `utils/courseWareReport.js`).
- **Phase 6 (looks)**: High — all 18 mockup pages compared and fixed. Middle — all pages compared except Home, which the user decided stays **skin-only**.
- QA handover HTML written (116 cases).

## 5. NOT verified because the Java backend (8080) was down — do these first once it runs

1. Restart is-rest-api (D3 Java change compiled with `mvn -o compile`, exit 0, but never ran).
2. **D3**: Grade 12 student → Transcript ⋮ menu shows "Diploma - Grade 12" and it opens `/view-diploma`; a student with an improve/complete-grades second standard shows " (New)"; Grade 9 shows no diploma.
3. **D2**: one real Canvas (provider 40) and one Courseware (41) student — check the JSON `courseWareReport` is non-empty with the expected field names; then the UI. Dummy: `/{school}/student/progress-detail?dummyStudent=Y&dummyGrade=6&dummyLms=40` (and 41, and `dummyGrade=10`), press View.
4. **D5**: My Performance → a real course → second bar "all activities completed (x of y)" appears (needs Buzz counts).
5. Never seen with real data (need special students): Reserve Seat eligible flow, training Join in the live window, forced password (setting on), D1 dialogs (real gateway states), D7 (school 5 wire transfer), Outlook reminder popup, app-install popup, Quote card, Need-help button, Certificates/Extension real cards, Video Library player, activity Join Event, Handbook body (module right), attachment buttons in Inbox.

## 6. What is LEFT (not code-blocked)

- **Parked pages A3–A6** (six older club pages, `clubs` landing, `evaluation-test-form-details`, `my-school-calendar`): ask the user once, at the very end; re-check the live menu first.
- Middle/High games (different games in the mockups) — not built.
- Re-enrollment E2 (CWS/ALL old flow) and E3 (grade looks + dummy mode) — other team (phase3).
- Optional: Middle Home port — user said NO (skin-only).

## 7. Testing how-to

- Login: open `http://localhost:3000/{school}/student/common/login` → redirects to the 8080 login; if a saved account shows, use "Switch account" → "Use another account". The user gives test credentials in chat (do not store passwords). Test students used: an Elementary, a Middle, a High and a BATCH account (the user knows them).
- Dev server: start with the preview tool name `student-signup-ui` (port 3000). If fonts break after a build ("next/font/google queries have exactly one entry"), stop the server, delete `.next/dev`, restart. You may not be able to kill external node processes (ask the user to `taskkill`).
- Mockup comparison method that worked: extract the page block from the mockup, diff Middle vs High blocks, then measure computed styles in dummy mode (`getComputedStyle`) and fix only real differences with `k5h-*` hook classes. A temporary comparer (spec JSON + `cmp.js` served from `public/__spec`) was used and deleted afterwards — never leave files in `public/`.
- Bash heredocs with several `EOF` blocks or `node -e '...'` containing quotes failed in this shell; write scripts with the Write tool into the scratchpad and run them with `node`.

## 8. Open decisions / things to ask the user

- Whether to start A3–A6 (parked pages).
- Whether QA results show anything to fix.
- Nothing else is waiting on the user.
