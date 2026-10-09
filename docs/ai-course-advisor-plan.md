# AI Course Advisor — Implementation Plan

Enrollment wizard **Step 3 (Course Selection)**. Backend: `is-rest-api` (Java/Spring Boot). Frontend: `is-sms` (Next.js).
Plan page (manager view + live preview): https://claude.ai/artifact/BPTAnSCEbrc79zJJ115WU6

_Last updated: 2026-10-09_

---

## 1. Ground rules

1. **Everything is controlled from Settings.** All flags, limits, the model and the key live in `is-rest-api` → `Settings` table (type `CONFIGURATION`). Values are read with `CommonUtil.getSettingValueByTypeAndKeyAsString`. Every value defaults to **off**.
2. **The AI Suggester only appears when Settings turn it on.**
   - The server decides visibility and sends one flag object in the course-details response.
   - The frontend has no settings logic of its own.
3. **The AI only works when the student clicks "AI Suggester".**
   - Without that click, Step 3 behaves exactly as it does today.
   - Page load makes zero AI calls, uploads nothing to S3, and writes no advisor rows.
4. **Logic stays on the server.** The questions, rules, validation, prompt, marksheet reading, recommendation storage, apply ordering and rate limits all live in `is-rest-api`. The frontend only renders and animates.
5. **The student stays in control.**
   - The AI never saves anything by itself.
   - The student can apply **all** suggestions or **only the ones they pick** (partial apply).
   - The existing fee, AP and no-live-class confirmations still appear.
6. **Language is English only.**
7. **Consent:** a `*` info note in the AI section and at marksheet upload reads: _"\* Student information and marksheets are used with the AI service to suggest courses."_
8. **Budget:** the monthly AI budget is already set. A per-student daily limit (a setting) keeps usage inside it.

---

## 2. Settings (`Settings`, type `CONFIGURATION`)

| Key | Default | Purpose |
|---|---|---|
| `COURSE_ADVISOR_AI_ENABLED` | `N` | Master switch. `N` hides the AI Suggester everywhere. |
| `COURSE_ADVISOR_AI_SCHOOL_IDS` | _(empty)_ | CSV of school IDs. Empty means no school. |
| `COURSE_ADVISOR_AI_LEARNING_PROGRAMS` | _(empty)_ | CSV, e.g. `ONE_TO_ONE,DUAL_DIPLOMA` |
| `COURSE_ADVISOR_ADDITIONAL_COURSE_ENABLED` | `N` | Suggest extra course(s). Only works when the master switch is `Y`. |
| `COURSE_ADVISOR_ADDITIONAL_COURSE_COUNT` | `1` | How many extra courses to suggest |
| `COURSE_ADVISOR_ADDITIONAL_COURSE_FOR_PARTNER` | `N` | Extra course for partner students (`showPaymentOption = N`). Still to be decided. |
| `COURSE_ADVISOR_MARKSHEET_ENABLED` | `N` | Marksheet upload and reading |
| `COURSE_ADVISOR_MARKSHEET_MAX_FILES` | `3` | |
| `COURSE_ADVISOR_MARKSHEET_MAX_MB` | `10` | |
| `COURSE_ADVISOR_MARKSHEET_RETENTION_DAYS` | `90` | A cron deletes the S3 object after this many days |
| `COURSE_ADVISOR_CHAT_ENABLED` | `N` | Phase 5 chat |
| `ANTHROPIC_API_KEY_COURSE_ADVISOR` | _(empty)_ | Falls back to the existing `ANTHROPIC_API_KEY` |
| `ANTHROPIC_MODEL_COURSE_ADVISOR` | `claude-opus-5-5` | |
| `COURSE_ADVISOR_MAX_CALLS_PER_USER_PER_DAY` | `10` | Cost guard |

**Gatekeeper.** `CourseAdvisorSettings.isEnabledFor(user, studentStandard)` returns false when any of these hold:
- The master switch is off.
- The school is not listed.
- The program is not listed.
- The grade has fixed courses: `requiredFixedCourses` is true (std 11–17), or it is Exact Path (std 8 / CP 39).

---

## 3. When the AI Suggester shows

| Grade / program | AI Suggester | Additional course |
|---|---|---|
| KG – Grade 5 (std 11–17) | Never (fixed courses) | — |
| Exact Path / English (std 8, CP 39) | Never (single fixed course) | — |
| Grades 6–8 (std 1–3) | If settings allow | If there is room (`totalCredit < upperBandLimit`) |
| Grades 9–12 One-to-One (std 4–7, 6/6/20) | If settings allow. **First rollout.** | Yes |
| Grades 9–12 Self Study / SSP / Group (6/6/6) | If settings allow | No room, so skipped silently |
| Flexy (std 9, 10, 19–21) | If settings allow | Yes (per-course fee) |
| Dual Diploma (CP 41, std 4–7) | If settings allow. Avoids home-school duplicates. | Yes |
| Partner students (`showPaymentOption = N`) | If settings allow. No prices shown. | Only if `…_FOR_PARTNER = Y` |

---

## 4. Student flow

1. **Step 3 loads as usual.** If the server flag is on, an **"✨ AI Suggester"** card appears. Nothing else changes.
2. **Student clicks "AI Suggester".** This is the **first moment** any AI or advisor API is called (`init`).
3. **Marksheet (optional).** The student uploads a file, the AI reads it, and the student confirms or edits the table.
4. **3–5 questions.** The server sends them, chosen by grade band. Every question can be skipped.
5. **Suggestions.** Each one has a checkbox (ticked by default), a reason and an "AI pick" badge. The extra course sits in its own "Try this" card.
6. **Apply.**
   - **Apply selected (n)** applies only the ticked items (partial apply).
   - **Apply all** applies everything.
   - **No thanks** on the extra course dismisses it and records the decline.
7. **The server applies the chosen items.** If a confirmation is needed (extra fee, AP notice, no live classes), the existing `ConfirmDialog` is shown and the call is retried with the confirmations.
8. **The selected list updates** from the server response, and the normal Next → Review flow continues.

If the student never clicks the AI Suggester, steps 2–8 never run.

---

## 5. Server API (`is-rest-api`)

All endpoints are `POST {schoolId}/student/enrollment/ai-course-advisor/...`, with the same encoded `payload` as other Step 3 calls.

Every endpoint does the following first:
- Decrypts the payload.
- **Checks that `userId` equals `sessionUtil.getUserId()`.** If it does not, it returns status `3`.
- Re-checks the gatekeeper.
- Checks the daily rate limit.

| Endpoint | When it is called | Returns |
|---|---|---|
| _(existing)_ `course-details-by-standard-id` | Page load (unchanged) | Adds `aiAdvisor: { visible, marksheetEnabled, chatEnabled, consentNote }`. **No AI call.** |
| `init` | The student clicks AI Suggester | Questions for the student's grade band, marksheet limits, consent note text, and `advisorSessionId` |
| `marksheet/upload` (multipart) | The student uploads a file | Extracted marks for the student to confirm |
| `marksheet/confirm` | The student confirms or edits the marks | ok |
| `recommend` | The student submits the answers | `recommendationId` and `items[]` (see below) |
| `apply` | The student clicks Apply selected or Apply all | Either the **same shape as course-details** (the frontend overwrites its cache with it), or `CONFIRMATION_REQUIRED` with a list |
| `dismiss` | The student clicks "No thanks" on the extra course | ok (the decline is recorded) |
| `chat` (Phase 5) | Follow-up questions | Streamed answer |

**Recommendation item.** The server generates these and stores them. The client never sends subject IDs on its own.

```json
{
  "itemId": "r3",
  "action": "ADD | UPGRADE | REPLACE | ADDITIONAL",
  "subjectId": 22014,
  "fromSubjectId": 21992,
  "title": "Algebra I → Honors",
  "reason": "Your marksheet shows Math at 92% and you want engineering.",
  "feeNote": "Extra fee $120",
  "needsConfirmation": ["EXTRA_FEE"],
  "dependsOn": []
}
```

**`apply` request:** `{ recommendationId, itemIds: ["r1","r3"], confirmations: ["EXTRA_FEE"] }`. **Partial apply means sending only some `itemIds`.**

What the server does on `apply`:
1. Loads the stored recommendation and accepts only `itemIds` that belong to it. Clients cannot inject subject IDs.
2. Builds the new selection CSV from the student's **current** saved selection:
   - Upgrades and replacements swap the course in place, so the list order is preserved.
   - Adds and additional courses are appended.
   - **Non-AP items go first.** AP items go last, because AP only unlocks once the minimum is reached.
3. Re-validates the result:
   - Every ID is still available.
   - The total stays within `upperBandLimit`.
   - Mandatory courses are kept.
   - The AP gate is respected.
   - Mandatory categories are still satisfied.

   Items that fail are skipped and returned with a reason. For example, an AP item applied on its own while the student is below the minimum returns "AP unlocks after the minimum courses".
4. Checks which confirmations the result needs and that were not sent:
   - Extra fee beyond `maxCourseLimit`, but only if `showPaymentOption = Y`
   - AP notice (school 1)
   - No live classes (`remarks = 0`, not for SCHOLARSHIP)

   If any are missing, it returns `CONFIRMATION_REQUIRED` with their texts and amounts, and saves nothing.
5. Saves through the **existing** `CTECourseUtil.getCourseSelectionDetails` path with `controlType = "add"`, so fees, ordering and persistence stay identical to manual selection.
6. Marks the items as applied, and returns the course-details response plus `appliedItemIds` and `skippedItems[]`.

---

## 6. Server components (`is-rest-api`)

| Component | Responsibility |
|---|---|
| `CourseAdvisorController` (or methods in `ClientSignupStudentController`) | Endpoints above |
| `CourseAdvisorSettings` | Settings reads and the gatekeeper |
| `CourseAdvisorContextBuilder` | Builds the AI input. Reuses `getCourseSelectionDetails` / `prepareForCourseSelection`. Covers: catalog with descriptions (`SUBJECT_DESC`, `COURSES.DESCRIPTION`, `WEB_COURSES` overview and prerequisites), limits, mandatory courses and categories, AP gate, fee visibility, program rules, and the student profile (grade, age, country, hobbies, current school). **No names, DOB or parent data.** |
| `CourseAdvisorQuestionService` | Grade-band questions: middle = interests; high = career, college country, challenge level; Dual Diploma = home-school courses; Flexy = what to recover |
| `MarksheetService` | S3 upload via `SchoolSettingsAwsService` (**private ACL**, never `PublicRead`). Then Claude PDF/vision extraction with structured output, then a confirmation table. A retention cron deletes old files. |
| `CourseAdvisorAiClient` | Claude call. Model and key come from Settings. Uses structured output (JSON schema), prompt caching per grade + program, refusal fallback, retry on 429/529 (same pattern as `TranscriptAnalysisUtil`), and logs token usage. |
| `CourseAdvisorValidator` | Server mirror of `getCourseAddCheck`, `validateCourseCredits` and `getMandatoryCategoryErrorStatus`. Drops invalid suggestions before they reach the student and re-checks on apply. |
| `CourseAdvisorApplyService` | The `apply` steps in section 5 |

**New tables**
- `STUDENT_COURSE_ADVISOR_SESSION`: `ID`, `USER_ID`, `SCHOOL_ID`, `STANDARD_ID`, `LEARNING_PROGRAM`, `ANSWERS_JSON`, `CREATED_AT`
- `STUDENT_COURSE_ADVISOR_RECOMMENDATION`: `ID`, `SESSION_ID`, `ITEMS_JSON` (validated), `RAW_AI_JSON`, `APPLIED_ITEM_IDS`, `DISMISSED_ITEM_IDS`, `MODEL`, `INPUT_TOKENS`, `OUTPUT_TOKENS`, `STATUS`, `CREATED_AT`
- `STUDENT_COURSE_ADVISOR_MARKSHEET`: `ID`, `USER_ID`, `S3_KEY`, `EXTRACTED_JSON`, `CONFIRMED_JSON`, `STATUS`, `DELETE_AFTER`, `CREATED_AT`
- Daily rate limit: count rows per user per day, or add a small counter table.

**S3 path:** `course-advisor/marksheets/{schoolId}/{userId}/{uuid}.{ext}`. The file is private and viewed only through a short-expiry presigned URL.

---

## 7. Frontend (`is-sms`), render only

- Reads `aiAdvisor.visible` from the existing course-details response. Shows the **AI Suggester card** only when it is true.
- New component folder `components/student-enroll/ai-advisor/`, kept out of the 1,500-line `Stage3CourseSelection.jsx`. It contains:
  - `AiSuggesterCard`
  - `MarksheetUpload`
  - `AdvisorQuestions`
  - `SuggestionsPanel` (checkboxes, Apply selected / Apply all)
  - `ExtraCourseCard`
- New hooks in `hooks/useCourseAdvisor.js`: `useAdvisorInit` (runs **only on click**), `useMarksheetUpload`, `useRecommend`, `useApplySuggestions`. On apply success it calls `queryClient.setQueryData(courseDetailsKey, response)`.
- `CONFIRMATION_REQUIRED` reuses the existing `ConfirmDialog`, then retries `apply` with the confirmations.
- **AI transitions:**
  - A live checklist while working ("Reading your marksheet", "Checking Grade 9 rules", "Matching your interests")
  - Shimmer placeholders
  - Suggestions rise in one by one, with an "AI pick" badge
  - Reasons type out
  - A highlighted "Try this" card for the extra course
  - Applied courses slide into "Your selected courses" and the counter moves
  - Everything is disabled under `prefers-reduced-motion`
- The `*` consent note sits in the AI section and under the marksheet upload.
- Mobile and desktop are both supported.

---

## 8. Phases

### Progress

| Phase | Status |
|---|---|
| 0 | **Done.** Settings SQL, gatekeeper (8 tests), `aiAdvisor` flag, `get(-1)` fix, data audit (section 10). The session `userId` check goes into the new advisor endpoints in Phase 3. |
| 1 | **Done.** `CourseAdvisorValidator` (11 tests) and `CourseAdvisorContextBuilder` (8 tests) are built. Content follows Plan B: course title, category, type and credit, plus the school's default set. No descriptions. Known v1 limit: AP can't be suggested until the student reaches the AP unlock point, because Step 3 doesn't list AP before that. |
| 2 | **Code done, 19 new tests (46 in total).** Built: upload and confirm endpoints, private S3 storage, a single Claude call per upload (structured JSON, `fallbacks: "default"`), file checks (type detected from the file content, size, count, daily limit), and the retention job (daily 03:00 IST). Still to do: run `63_6_0_COURSE_ADVISOR_MARKSHEET.sql` on staging and test with real marksheets on UAT. |
| 3 | **Code done, 60 advisor tests pass.** `init`, `recommend`, `apply` (all or partial, with server-side confirmations) and `dismiss` are built. `CTECourseUtil.getCourseSelectionDetails` now also has a request-object overload, and the Payload entry point behaves as before. One shared daily limit covers marksheet reads and suggestion requests. The separate session table from the plan was not needed: the recommendation row stores the answers. Still to do: run `63_6_0_COURSE_ADVISOR_RECOMMENDATION.sql` and test end to end on UAT. |
| 4 | **Code done. Lint is clean on every new file and `next build` passes.** Built: the AI Suggester card (shown only when `aiAdvisor.visible`), and a dialog that runs marksheet, then confirm table, then questions, then thinking, then suggestions with tick boxes (Apply selected / Apply all / No thanks), then the confirm step. AI transitions: live checklist, shimmer, cards rising in, typed reasons, and an "AI pick" slide-in in the selected list. Identity: Server Actions (`services/courseAdvisorApi.js`) add `userId` + `loginHash` from the next-auth session, and the backend checks the hash. Uploads go through a Route Handler (`/[school]/enrollment/[program]/marksheet-upload`) to avoid the 1 MB Server Action limit, sit outside `proxy.js`, and photos are scaled down in the browser to stay under Vercel's ~4.5 MB limit. Still to do: an end-to-end check on UAT; nothing has been checked in a browser yet. |
| 5 | **Done, 78 backend tests and lint clean.** Chat endpoint (`ai-course-advisor/chat`) and UI: quick questions, typing indicator, and answers that type out once. Courses the AI proposes in chat are validated, stored as `SOURCE=CHAT` and applied with the same `apply` / confirm flow. It has its own daily limit (`COURSE_ADVISOR_MAX_CHAT_PER_USER_PER_DAY`, 20) and its own switch. Answers come back whole, not streamed (they are short; the typing animation gives the live feel). |
| UI test | **Done against a mock backend in the browser:** SSO login, card, marksheet upload with in-browser downscale (160 KB to 26 KB), confirm table, questions, thinking, suggestions, partial apply with fee confirm, apply all, No thanks, chat, apply from chat, AI-down, session-out, and phone width. |
| Live AI | **Blocked:** the shared key (`sk-ant-usr-…`) needs `anthropic-workspace-id`. A setting was added (`ANTHROPIC_WORKSPACE_ID_COURSE_ADVISOR`); waiting for the workspace id. |
| 6 | Runbook ready: `docs/ai-course-advisor-rollout.md` (deploy order, live check, stages, smoke test, metrics SQL, kill switch). |

### Phase 0: Groundwork
- SQL for all Settings keys, all off, in `external-resource/63_x_COURSE_ADVISOR_SETTINGS.sql`.
- `CourseAdvisorSettings` gatekeeper, plus the `aiAdvisor` flag added to the course-details response. The flag stays false while the setting is off, so production behaviour does not change.
- Fix existing issues:
  - The `CTECourseUtil.java:837` `get(-1)` crash
  - The missing session `userId` check (for the new endpoints, and recommended for the existing Step 3 ones)
- Data audit: how complete `SUBJECT_DESC`, `WEB_COURSES` and `RECOMMENDED_COURSE` are, plus sample responses per grade and program.
- Finalise the `*` note wording.
- **Done when:** settings exist, the flag returns false everywhere, and the fixes are live.

### Phase 1: Context builder and validator (server, read-only)
- `CourseAdvisorContextBuilder` and `CourseAdvisorValidator`.
- Unit tests for every row of the grade/program table in section 3.
- **Done when:** the validator passes all case tests.

### Phase 2: Marksheet
- `marksheet/upload` and `marksheet/confirm`, private S3, Claude extraction, retention cron.
- Handles: a file that is not a marksheet, unreadable scans, multiple pages, and different boards (CBSE %, IGCSE A\*–G, US GPA, IB 1–7). Every subject is normalised to strong, average or weak.
- **Done when:** sample marksheets from each board extract correctly.

### Phase 3: Recommend and apply (server)
- `init`, `recommend`, `apply` (including **partial apply**) and `dismiss`, plus the new tables.
- Additional-course logic: it runs only when the setting is on and there is room, ties the course to the student's interest or marksheet, and states the fee.
- Rate limit and token logging.
- **Done when:** the apply ordering and validation are tested, including partial subsets and AP-after-minimum.

### Phase 4: Frontend and AI transitions
- AI Suggester card (only when the flag is true, with no calls before the click), marksheet upload, questions, and the suggestions panel with checkboxes, **Apply selected** and **Apply all**.
- The `CONFIRMATION_REQUIRED` flow through the existing `ConfirmDialog`.
- The AI transitions in section 7, and the `*` note.
- **Done when:** the full flow works on phone and desktop, the transitions are signed off, and Step 3 is unchanged when the AI is off or not clicked.

### Phase 5: Chat (`COURSE_ADVISOR_CHAT_ENABLED`)
- Streamed follow-up Q&A, limited to our catalog.
- Tools: `explain_course`, `compare_courses` and `propose_selection`. A proposal goes through the same validator and then the same `apply`.
- **Done when:** it answers a review set of common questions correctly.

### Phase 6: Rollout
- UAT first.
- Then school 1 with ONE_TO_ONE Grades 9–12.
- Then Dual Diploma, Grades 6–8 and Flexy.
- Then other schools. All of this is done by editing the Settings CSVs.
- Metrics to track:
  - Suggester clicks per Step 3 visit
  - Items suggested vs. applied (all or partial)
  - Extra-course acceptance and decline
  - Marksheet extraction failures
  - Cost per student
- Kill switch: `COURSE_ADVISOR_AI_ENABLED = N`.

---

## 9. Decisions

| Topic | Decision |
|---|---|
| Student data and marksheets | A `*` info note in the AI section and at marksheet upload |
| Monthly budget | Already set. Enforced with the per-student daily limit. |
| Language | English only |
| When the AI runs | Only after the student clicks "AI Suggester". Otherwise the flow is unchanged. |
| Visibility | Only when the Settings gatekeeper allows it |
| Apply | All, or a partial selection of items |
| Where the logic lives | Server (`is-rest-api`). The frontend renders only. |
| Partner students and the extra course | **Open.** It has its own setting (`…_FOR_PARTNER`). |

---

## 10. Data audit results (staging, 2026-10-09)

| Source | Result | Use |
|---|---|---|
| `SUBJECT.SUBJECT_DESC` | **0%** filled in every grade and provider | Not used |
| `SUBJECT_DETAILS.DESCRIPTION_URL` | **0** links | Not used |
| `COURSES.DESCRIPTION` (category) | Empty, except BATCH std 4–7 (1 each) | Not used |
| `WEB_COURSES` | 453 rows per locale (en, es, fr, pt, zh). **100%** have `OVERVIEW` and `PRE_REQUISITES` | **Main content source.** Use `LOCALE = 'en'` only. |
| `WEB_COURSES` ↔ `SUBJECT.NAME` | School 1 match is very low: 3 of ~50 per middle-school grade, 9 of ~210 per high-school grade. `NAME` holds LMS names ("Algebra I v23 (GS) (Honors) (Master)", "… Answer Keys"). | Don't match on `NAME`. Step 3 shows `SUBJECT.TITLE`, so match on that (queries 11–13). |
| `WEB_COURSES` row | Uppercase titles, one-letter `CATEGORY`, overview of about 300–460 characters, prerequisites often "None" | Small enough to send the whole grade's catalog in one prompt |
| `RECOMMENDED_COURSE` | School 1, CP 37, ONE_TO_ONE and SCHOLARSHIP, std 1–7 (5–6 courses each) | Give it to the AI as the school's default "balanced" set |

**Decision (Plan B, 2026-10-09).** No course descriptions are used. The AI gets each course's title (as the student sees it), category, type (Regular / Honors / AP), credit and fee note, plus the school's `RECOMMENDED_COURSE` set as a balanced default. `WEB_COURSES` stays an optional future add-on.
