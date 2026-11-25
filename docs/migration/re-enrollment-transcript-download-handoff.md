# Re-enrollment — "Download your transcript" card: full handoff

Last updated: 2026-11-20. Status: **FINAL plan v3 + FINAL prototype — ready for Phase 1. No app code changed in is-sms or is-rest-api.**

Read this first in a new session. It has everything decided, found and pending so far.

---

## 0. v3 UPDATE (2026-11-20, later) — this section wins over sections 3, 5, 6, 9, 11

Source of truth is now **implementation plan v3** (`docs/migration/re-enrollment-transcript-download-implementation-plan.html`). It aligns the card with the admin Student Transcript screen (`POST {schoolId}/dashboard/admin-transcript-data` → `AdminTranscriptController` → `v1/admintranscript/AdminTranscriptService.list`). That API is admin-only and paginated, so the student card does **not** call it; the new student endpoint reuses its logic (`TranscriptHoldResolver`, `AcademicDocs`, `ReEnrollmentInfoDao`).

Decisions settled in the grilling session (user answers):
- **Published but hidden** ("Publish without Show", `SHOW_TRANSCRIPT_TO_STUDENT = 'N'`): card shows, Download **disabled**, copy: "Your transcript has been published, but it is on hold. **Reason:** `TRANSCRIPT_HIDE_REASON_TEXT` **Remark:** `TRANSCRIPT_HIDE_NOTE`". No fix button. Replaces old open Q5.
- **Documents** = admin's 3 academic docs (Age Proof, Parent Passport, Last academic proof) — the "mandatory documents". **Uploaded = done** for now (decided after D16 discussion): any missing → Upload option; all uploaded → no option, no blocker. School verification is **deferred** (saved in is-sms memory `project_reenrollment_transcript_pending.md`; plan v3 section 11 "Later"). `TRANSCRIPT_DOCUMENT_BLOCK` default **Y**.
- **Upload API** = existing profile upload reuse: `POST /api/profile/document` → BE `dashboard/save-docs`, docType `"Age Proof"` / `"Signature"` (Parent Passport) / `"Last Academic Proof"` → ATTACHMENTS (types 14/16/17), which is what admin's `getMissingAcademicDocsByUser` reads. No new backend endpoint, no SED rows, no backfill.
- `verify-documents` missing role check → separate fix now (D17), started in its own session.
- Fee blocker = own new query (no existing `paymentDue` calc anywhere; resolver gets `false`). Grade fee only. Mode default is now **ANY_UNPAID** (D20, changed from OVERDUE): the onboarding overdue-fee gate (`useOnboardingGate` → `/student/welcome`) stops overdue students before the re-enrollment page, so OVERDUE alone almost never showed the reason. Locks the transcript until every current-grade installment is paid, including future ones.
- Phone/email verified + App installed are **not** blockers.
- Only the just-completed grade's transcript; diploma Grade 12 PASS only and disabled whenever the transcript is blocked.
- All blockers shown together, hidden on top.
- **4 phases are dev milestones; ONE production release** (enforcement ships with flag N).
- Phases: **P1** endpoint + read-only card (hidden + docs status) · **P2** docs inline upload · **P3** fee Pay now · **P4** enforcement behind `TRANSCRIPT_BLOCK_ENFORCE_ALL`.

- **D18** hidden = `SHOW_TRANSCRIPT_TO_STUDENT` not 'Y' ('N' or NULL — admin's Show/Hide toggle writes NULL). **D19** fee blocker excludes `*_ADV` titles (next-grade advance / seat). Both proposed by the backend session, accepted by user.
- **D21 (latest, supersedes D4, D9, D19, D20):** payment / fee is **removed from the card** — no FEE_PENDING blocker, no Pay now, no checkout, no `TRANSCRIPT_FEE_BLOCK_MODE`. Reason: the app's onboarding overdue-fee gate (`useOnboardingGate` → `/student/welcome`, installment overdue > 7 days) already handles pending payment, and `dashboard/additinal-layer-details` only returns fee rows for exactly those gated students, so it cannot feed the card for anyone else. The card keeps the school hold + the 3 academic documents only. Phase 3 no longer exists; phases are 1 (endpoint + card), 2 (docs upload + instant update + View/Download), 4 (My Transcript / parent enforcement, flag N).
- **D22 (latest): upload -> notice + support mail; Download stays DISABLED until the (next-step) verification.** When the LAST missing mandatory document is uploaded on the card, the card shows "Your documents have been uploaded successfully. Your transcript will be generated within 24 hours." and Download stays disabled, also after a reload. Backend: new `POST …/re-enrollment/documents-uploaded` (idempotent) records a per-grade marker in `REENROLLMENT_ACTIVITY_LOG` (type `DOCS_VERIFY_REQUEST`, message `SS#<studentStandardId>|…`) and mails `support@internationalschooling.org` once (setting `TRANSCRIPT_DOCS_SUPPORT_EMAIL`, template `RE_ENROLLMENT_DOCS_UPLOADED_MAIL`, SQL `external-resource/63_0_1_REENROLLMENT_DOCS_VERIFICATION.sql`; preview `docs/migration/re-enrollment-docs-uploaded-mail-template.html`). While the marker exists `blockersFor` adds `DOCUMENTS_UNDER_VERIFICATION` (also on My Transcript / parent with the Phase 4 flag). Students whose documents were already complete (no marker) are unaffected. **Unlock = D23 (below).** Known: `EmailTypeCatalogTest.everyEmailTypeIsSeeded` already failed before (9 types not in `EMAIL_TYPE_CATEGORY`, 64_1_0_COMMUNICATION.sql); the new type makes it 10.
- **D15** settings defaults decided: `TRANSCRIPT_DOCUMENT_BLOCK=Y`, `TRANSCRIPT_BLOCK_ENFORCE_ALL=N`. Plan marked FINAL by user.

Later (deferred verification design, NOT in this release): shared util that creates a pending `STUDENT_ENROLLMENT_DOCUMENTS` row for both profile and card uploads (user agreed "same shared util"); backfill for old uploads; "Under verification" state + filter on the admin transcript docs rail; STANDARD_ID scoping so the signup docs gate is not affected.

Key facts found (subagent trace, file refs in plan v3 section 8):
- Profile upload `dashboard/save-docs` writes ATTACHMENTS only (deactivates old row) → not verifiable. Wizard `save-documents` writes ATTACHMENTS + SED; only types 78/79/80 are used today; type 16 never had an SED row (untested).
- No explicit "rejected" state: not verified + remark = REUPLOAD, no remark = UNDER_VERIFICATION.
- `verify-documents` has **no role check** (security, out of scope — separate fix).
- Several type-80 files in one save-documents request collapse onto one ATTACHMENTS row (existing bug) → panel sends one doc per request.

Next step: start **Phase 1** (backend endpoint first) when the user says go. is-rest-api branch is now `feature/63_0_0_STUDENT_REENROLLMENT_NEXTJS_PHASE3_A`.

---

- **D23 (latest): the unlock — admin verifies each document.** In the admin student profile (Academic Information -> Documents) each of the 3 mandatory documents (Age Proof, Parent Passport, Last Academic Proof; not Address Proof) has a **Verified / Not verified** toggle. *Not verified* opens a popup where the admin must write a reason (max 500 chars). Verdicts are stored on the uploaded FILE itself: two new columns `ATTACHMENTS.VERIFY_STATUS` (Y / N / NULL) and `ATTACHMENTS.VERIFY_REASON` (SQL `external-resource/63_0_2_ACADEMIC_DOC_VERIFICATION.sql`, `ADD COLUMN IF NOT EXISTS`), so a re-upload (new `ATTACHMENTS` row) starts a fresh pending document by itself. No separate table; who / when verified is not stored. Admin endpoints (admin roles only, same school check as the transcript screen): `POST {school}/dashboard/admin-academic-docs-state` and `…/admin-academic-docs-verify` (`AdminTranscriptController`), logic in `AcademicDocVerificationService` / `AcademicDocVerificationDao`. The existing "Student document verification" card (enrollment-time documents) is untouched.
  - **Blocker rules** (`ReEnrollmentDocumentsService.documentsBlocker`, first match): a document missing -> `DOCUMENTS_PENDING`; any document rejected -> new `DOCUMENTS_REJECTED`; grade marker present and not all three verified -> `DOCUMENTS_UNDER_VERIFICATION`; otherwise none (all verified, or the student never went through verification and nothing is rejected). All three blockers now carry `items` (`label`, `docType`, `status` MISSING/UPLOADED/VERIFIED/REJECTED, `reason` only when REJECTED).
  - **Student card**: a rejected document shows "Please re-upload your document. It is marked not verified due to this reason: <admin's reason>" with a Re-upload button (same inline upload panel). Re-uploading the last rejected / missing document calls `documents-uploaded` again: support is mailed again, the card goes back to "under verification". All three verified -> `available`, Download enabled (the card refetches on focus / reload). My Transcript / parent (Phase 4 flag) show the same reasons.
  - **Marker**: rejecting a document also records a marker (`SS#<id>|REJECTED|…`) on the student's current grade if there is none, so a student who never used the card is still held after re-uploading. `documents-uploaded` is now idempotent per set of files: the marker message is `SS#<id>|ATT#<pending file ids>|…`; a changed file set (re-upload) is a new request and a new support mail. Old-format markers (no `ATT#`) mail once more on the student's next upload.
  - Not built: a mail / notification to the student when a document is rejected (the card is where they see it); a "verified" audit screen. Dev mock scenarios `rejected`, `rejectedmany` added.

## 1. Files made so far

| File | What |
|---|---|
| `docs/migration/re-enrollment-transcript-download-handoff.md` | This file |
| `docs/migration/re-enrollment-transcript-download-implementation-plan.html` | Full implementation plan **v3** (phase-wise, admin-aligned; FE + BE, flows, logic, impact, tests) with Mermaid diagrams |
| `docs/migration/re-enrollment-transcript-download-prototype.html` | Clickable prototype (6 scenarios, "Behind the scenes" log panel) |
| `~/Downloads/re-enrollment-transcript-download-prototype.html` | Copy of the prototype |
| `~/Downloads/re-enrollment-transcript-download-handoff.md` | Copy of this file |

All files are **untracked** (not committed). Earlier plan files (`...-plan.html`, `...-plan.md`, first implementation plan) were lost when the branch changed — the v2 plan replaces them.

Branches when this was written:
- is-sms: `feature/version_1_2_0_STUDENT_REENROLLMENT_PHASE3_A` (work started on `feature/version_1_2_0_phase3`)
- is-rest-api (`~/workspace/is-rest-api`): `feature/63_0_0_STUDENT_ENROLLEMNT_NEXTJS_PHASE3`

User rules (memory): never `git commit` / `git push` — the user commits manually. Talk to the user in Hinglish.

---

## 2. The feature (what the user asked)

On the **re-enrollment dashboard** (student option screen), add a **"Download your transcript"** card (design reference: the Grade 12 "Congratulations on completing Grade 12" screen with Flexy row + "Download your transcript" row).

If the transcript cannot be downloaded, show a **clear reason**: which step is incomplete or which payment is pending — and let the student fix it **on the same page**.

---

## 3. Decisions (in order they were made)

| # | Decision | Status |
|---|---|---|
| D1 | Card for **every re-enrollment-eligible student** (`nextAction = RE_ENROLLMENT`) — all grades, pass AND fail. Not only Grade 12. | Decided by user |
| D2 | **No "transcript not released" blocker.** A student whose transcript is not published (`MARKS_PUBLISHED != 'Y'`) never reaches re-enrollment (eligibility returns `DASHBOARD`). | Decided by user |
| D3 | **Document upload on the same page** (inline panel in the card), **no redirect to profile**. Use the profile/signup document APIs. | Decided by user |
| D4 | **Fee payment from the same page**: Pay now → existing payment-method modal → gateway → payment success page → redirect to dashboard → back to re-enrollment. No redirect to fee-details page. | Decided by user |
| D5 | Data comes from a **new endpoint** `re-enrollment/documents`, not the eligibility API (reason in section 5). | Proposed |
| D6 | Fee rule controlled by setting `TRANSCRIPT_FEE_BLOCK_MODE` = `OFF / OVERDUE / ANY_UNPAID`, default **OVERDUE**; only **current grade's grade-fee installments**. | Default assumed, confirm |
| D7 | Documents blocker = required but **not verified**. Upload alone does not unlock; school must verify. | Default assumed, confirm |
| D8 | Diploma link only for **Grade 12 (STANDARD_ID 7) + PASS**. | Default assumed, confirm |
| D9 | Same block on My Transcript / parent / mobile = separate Phase 3 behind flag. | Proposed |

### Still open (defaults in brackets)
1. Fee: any unpaid installment or only overdue? [OVERDUE]
2. Add-on / book-session fees also block? [No, grade fee only]
3. Documents blocker ON or OFF? [Flag OFF at launch]
4. Diploma on Grade 12 fail? [No]
5. Student with `SHOW_TRANSCRIPT_TO_STUDENT = 'N'` — card still gives download? [Yes, because of D2 — needs business confirm]
6. Phase 3 enforcement needed? [Yes, shipped with flag OFF]

---

## 4. Code findings (where things are)

### Frontend (is-sms)
| What | Where |
|---|---|
| Re-enrollment route | `app/[school]/(dashboard)/student/re-enrollment/page.jsx` → `ReEnrollmentOptions` |
| Shared state, eligibility query, polling | `hooks/useReEnrollment.js` (`useResolveReEnrollment`, `ELIGIBILITY_POLL_MS = 3000` on payment/review segments) |
| Dashboard home → re-enrollment redirect | `hooks/useReEnrollmentEntry.js` (graduated student + `RE_ENROLLMENT` → `/student/re-enrollment`) |
| Option screen, classic look | `components/re-enrollment/ReEnrollmentOptions.jsx` |
| Option screen, K5 / middle / high look (the screenshot) | `components/re-enrollment/K5PassedOptions.jsx` (+ `K5PassedOptions.module.css`), `completedGrade12` branch |
| Custom-plan fee watcher | `app/[school]/(dashboard)/student/re-enrollment/ReEnrollmentChrome.jsx` (`window.__reEnrollmentGatewayStarted`) |
| My Transcript page | `components/student/Transcript.jsx`, `components/k5/pages/K5Transcript.jsx`, `hooks/useStudentTranscriptStatus.js`, `utils/transcriptLinks.js` |
| Fee Details Pay Now (to reuse) | `components/student/FeeDetails.jsx` → `hooks/useCartCheckout.js` → `checkout.start(userPaymentDetailsId)` |
| Payment modal + extra dialogs | `components/student-enroll/PaymentGatewayPickerModal`, `components/common/CheckoutExtraDialogs.jsx` (already paid / in progress / old fee) |
| Re-enrollment gateway hook (similar) | `hooks/useReEnrollmentGateway.jsx` |
| Payment success page (5s countdown → returnUrl) | `components/common/PaymentResponseView.jsx`, `app/[school]/common/other-payment-response-success/page.jsx` |
| Document APIs (to reuse) | `services/studentSignupBackendApi.js`: `saveStudentEnrollmentDocuments` (`student/enrollment/save-documents`), `getStudentEnrollmentDocuments`, `getStudentEnrollmentDocumentsStatus`, `verifyStudentEnrollmentDocuments` — **no `{schoolId}` in path** (see "CONFIRMED QUIRK" comment) |
| Profile document status (read-only) | `components/k5/pages/K5ProfileDocVerification.jsx` |
| Module rights | `useModuleRights("student-transcript")` |
| Menu flag | `utils/dashboardNav.js:119` `showTranscriptMenu` |
| Overdue fee gate | `services/onboardingGateApi.js` (`paymentOverDue`) |

### Backend (is-rest-api, `~/workspace/is-rest-api/src/main/java/com/c2e/is`)
| What | Where |
|---|---|
| Re-enrollment controller | `client/controller/ClientReEnrollmentController.java` (`BASE = "{schoolId}/api/v1/student/re-enrollment/"`) |
| Eligibility logic | `v1/reenrollment/ReEnrollmentEligibilityService.java` `checkEligibility` (transcript check ~line 216; `isGradeFeePaid` is for the NEXT grade, not the current one) |
| Eligibility reasons / DTO | `ReEnrollmentReason.java`, `ReEnrollmentEligibilityResponse.java` |
| Transcript list for student | `client/controller/ClientDashoboardMarksController.java:597` `studentTranscriptStatus` (link building ~651-660; lists only `SHOW_TRANSCRIPT_TO_STUDENT = 'Y'`; diploma when `STANDARD_ID = 7`) |
| Transcript view | same controller `:472` `student-transcript-view-after-publish` (payload `studentId|userId|standardId|studentStandardId|forDownload`) |
| Diploma view | same controller `:1001` `view-diploma` |
| Public routes (do NOT block) | `v1/auth/PublicRoutes.java` (~195-212): transcript-oddy, view-diploma, transcript-verification-page — used by headless PDF generator + QR |
| Parent transcript links | `v1/util/DashboardParentUtil.java` ~925-975 |
| Student documents query | `v1/dao/StudentStandardDao.java` `getStudentDocuments` (~160) |
| Due fee rows | `v1/util/DashboardStudentUtil.java:581` `getDueFeesDetails`; statuses in `v1/constant/PaymentStage.java` (`SCHEDULED, INITIATED, PENDING, SUCCESS, FAILURE, PAID, UNPAID, REJECTED, CANCELLED`); transfer types 1/2/4 treated as settled |
| Enrollment documents | `v1/entity/StudentEnrollmentDocuments.java` (`IS_DOCUMENT_VERIFIED`, `IS_VERIFICATION_REQUIRED`, `VERIFICATION_REMARK`); unverified rule in `StudentStandardDao` ~233 |
| Payment backUrl | `v1/util/CommonPaymentUtil.java` ~3532 |

---

## 5. Why a new endpoint (not eligibility)

- Eligibility is called on **every dashboard home load** and **polled every 3 s** on re-enrollment payment/review screens.
- Fee + documents queries there would run on every poll; a failure there could block re-enrollment itself.
- New endpoint is called **once**, only on the option screen; if it fails, only the card hides.

---

## 6. Design summary

### Backend
- `POST {schoolUUID}/api/v1/student/re-enrollment/documents`, encrypted payload `{"userId": ...}`.
- Gate: session user valid; current standard (`getStudentStandardByUserIdProgression`), `MARKS_PUBLISHED = 'Y'`, supported program — else `E004` (FE hides card).
- Blockers:
  - `FEE_PENDING`: `USER_PAYMENT_DETAILS` for `STUDENT_STANDARD_ID = current.id`, grade-fee titles, active, not deleted, status in `SCHEDULED, INITIATED, PENDING, UNPAID, FAILURE`, transfer type not 1/2/4; OVERDUE mode adds `SCHEDULED_PAY_DATE <= today`. Items: **`userPaymentDetailsId`** (needed for Pay now), `paymentName, amount, currencyLabel, dueDate, processing` (INITIATED).
  - `DOCUMENTS_PENDING`: `STUDENT_ENROLLMENT_DOCUMENTS` where `IFNULL(IS_VERIFICATION_REQUIRED,'Y')='Y' AND IFNULL(IS_DOCUMENT_VERIFIED,'N')<>'Y'`. Items: `documentId, documentName, status (pending/rejected/uploaded/verified), remark`.
  - `NOT_AVAILABLE`: fee query exception (fail-closed).
- `ACCESS_DISABLED` is decided on the frontend (`useModuleRights`).
- **Links sent only when `available = true`** (encrypted payload; student cannot build one).
- Timezone: student `COUNTRY_TIMEZONE`, fallback **Asia/Singapore** (project rule).
- Settings: `CONFIGURATION / TRANSCRIPT_FEE_BLOCK_MODE = OVERDUE`, `TRANSCRIPT_DOCUMENT_BLOCK = N`, `TRANSCRIPT_BLOCK_ENFORCE_ALL = N`.
- New files: `ReEnrollmentDocumentsService`, `ReEnrollmentDocumentsResponse` (Lombok builder), `TranscriptLinkUtil` (extracted from `studentTranscriptStatus`, output unchanged), DAO queries, `ReEnrollmentDocumentsServiceTest`.

Response example:
```json
{ "status": "1", "available": false, "gradeName": "Grade 7", "transcript": null, "diploma": null,
  "blockers": [
    { "code": "FEE_PENDING", "items": [{ "userPaymentDetailsId": 55012, "paymentName": "Installment 2",
      "amount": 180.0, "currencyLabel": "USD", "dueDate": "15 Sep 2026", "processing": false }] },
    { "code": "DOCUMENTS_PENDING", "items": [{ "documentId": 301, "documentName": "ID proof",
      "status": "rejected", "remark": "Image is blurred, please re-upload" }] } ] }
```
Available: `transcript: { viewPath, downloadPath }`, `diploma` only Grade 12 PASS, `blockers: []`.
Errors: `"3"` session out, `"0"/E003` invalid, `"0"/E004` not eligible, `"2"/EX01` exception.

### Frontend
- `services/reEnrollmentBackendApi.js`: `getReEnrollmentDocuments`.
- `hooks/useReEnrollment.js`: `useReEnrollmentDocuments` (key `["re-enrollment-documents", userId]`, `staleTime 0`, `refetchOnMount "always"`, `refetchOnWindowFocus true`, `retry false`).
- NEW `utils/reEnrollmentDocuments.js` (mapper + all reason copy), NEW `components/re-enrollment/TranscriptDownloadCard.jsx`, NEW `components/re-enrollment/DocumentUploadPanel.jsx`.
- Mount after option rows in `K5PassedOptions.jsx` and `ReEnrollmentOptions.jsx` (every hero branch). New CSS classes only.
- Download = `<a target="_blank" rel="noopener noreferrer">` to backend URL (like My Transcript). Verify `forDownload=true`; fallback `viewPath`.
- **Pay now** = reuse `useCartCheckout({ context, onPaid })` → `checkout.start(item.userPaymentDetailsId)`; mount `PaymentGatewayPickerModal` + `CheckoutExtraDialogs` like FeeDetails. `onPaid` → refetch documents.
- **Upload** = inline panel, `saveStudentEnrollmentDocuments`; after upload status "Under verification", still blocked until school verifies.
- Hide card on error / E004 / old backend / `showTranscriptMenu === false`. Session out → `expireSession`. Dummy mode → demo card, no API.
- Icons: lucide only, no images (CLAUDE.md image rules not affected).

### Payment flow seen in the real app
Logged in on local app (localhost:8080 login → localhost:3000) with the test student the user gave (credentials are with the user, not stored here). That account is a **new-enrollment** student (wizard: Course Selection → Review & Pay), so the re-enrollment dashboard was not visible. Viewed Review & Pay (Pay in full / Installments). **Did not click Confirm & Pay** (would save a plan / create a payment attempt).

Existing flow: Pay now → `check-payment` (already paid / in progress / old fee dialogs) → `payment-gateway/options` → "Choose Your Payment Method" modal (card / Airwallex / cash-wire proof) → `invoke-payment-gateway` → gateway → payment success page (5 s countdown) → returnUrl (dashboard) → `useReEnrollmentEntry` sends the graduated student back to re-enrollment.

---

## 7. Prototype (what it shows)

FINAL, matches plan v3 incl. D21 (no fee / payment on the card). Scenarios: 1 Promoted · available, 2 Documents only, 3 Two documents missing, 4 Grade 12 completed (+ diploma), 5 Fail (comeback), **6 On hold by school** (reason + remark), **7 Grade 12 · hold + docs** (hold on top, diploma disabled, blank remark → no Remark line).
- Blocker order: `TRANSCRIPT_ON_HOLD` → `DOCUMENTS_PENDING`. On-hold has only "Talk to us" (no fix); "Simulate: admin shows the transcript" releases it.
- Docs = 3 academic docs (Age Proof / Parent Passport / Last academic proof), status `MISSING / UPLOADED` (uploaded = done). The upload panel lists all 3: an uploaded doc flips to a green **Uploaded** chip in place.
- **Instant update after upload:** no wait for the API. The document turns **Uploaded** in the list at once. The LAST one turns the card into "documents under verification" at once (notice, Download disabled; the card also calls `documents-uploaded`, then refetches). The prototype scenario 7 shows the reload state.
- **View of an uploaded document (real, tested on the ildbreport backend):** an Uploaded row in the panel has a **View** button that opens a preview dialog (picture, or PDF with Download PDF), like My Profile → Documents. The file URL comes from the profile data (`useStudentProfile` → `academic.documents`), re-read after every upload ("Loading…" meanwhile); a big file shows "Loading the file…" until it arrives. After the last upload the card turns ready and a **Your mandatory documents** list (with View) stays under the ready row.
- **One Download button (decided): it opens the document page in a new tab.** The earlier second button (a real PDF via `downloadTranscriptDocument` → `/api/transcript/download` → backend `download-student-semester-transcript` + Playwright script) was removed: it needs `PROJECT_PATH` to end in `/` and Playwright's Chromium on the backend machine, and returned 502 here. View/Download were merged: the old View is now **Download**. The diploma is its own button on Grade 12 (**Download Diploma**). The per-document **View** (preview dialog) in the documents list stays.
- Ready state: one **Download** button (opens the document in a new tab). **Grade 12 PASS gets two buttons instead:** **Download Transcript** and **Download Diploma** (same for the blocked state: both disabled; right after the last upload: both disabled with a spinner).
- Right panel "Behind the scenes" logs each API / state step.

---

## 8. Impact on other modules (short)

- None: eligibility API + polling, re-enrollment steps, fee details page, gateway, success page, admin transcript screens, public PDF/QR routes, onboarding gate.
- Check: `useReEnrollmentEntry` return after payment; `ReEnrollmentChrome` fee watcher must not mis-fire for a payment made from the card; Pico guide layout / content-ready; K5 CSS (new classes only).
- Refactor: `studentTranscriptStatus` link building → util (same output).
- Phase 3 only: My Transcript, parent academic details, legacy JSP, mobile app (inform mobile team before flag ON).
- `SHOW_TRANSCRIPT_TO_STUDENT` is ignored by the card (open question 5).
- DB: 2 small queries per option-screen visit; check indexes on `USER_PAYMENT_DETAILS.STUDENT_STANDARD_ID`, `STUDENT_ENROLLMENT_DOCUMENTS.USER_ID`.

---

## 9. Phases

1. **Backend**: endpoint, service, DTO, link util refactor, queries, settings SQL (`external-resource/`), unit tests.
2. **Frontend**: service, hook, mapper, card, upload panel, reuse `useCartCheckout`, mount in both looks, UAT.
3. **Enforcement**: My Transcript / parent / mobile behind `TRANSCRIPT_BLOCK_ENFORCE_ALL`.
4. **Turn on** fee mode / document flag per business.

Kill switch: `TRANSCRIPT_FEE_BLOCK_MODE=OFF` + `TRANSCRIPT_DOCUMENT_BLOCK=N`. Old backend → card hidden, so backend can deploy first. After code changes run `graphify update .`; then `npm run lint` + `npm run build` (is-sms), `mvn test` (is-rest-api).

---

## 10. Verify before / while coding

- `save-documents` exact payload (attachment upload sequence) — check the signup wizard upload code.
- `forDownload=true` behaviour of the transcript JSP.
- Success page returnUrl really leads back to re-enrollment for a fee paid from the card; else set backUrl/returnUrl.
- Exact column names / grade-fee titles in `USER_PAYMENT_DETAILS` (reuse eligibility `GRADE_FEE_TITLES`).
- Session/userId check helper used by eligibility (reuse it).

## 11. Next step

User was asked whether to start **Phase 1 (backend endpoint)** with the defaults above. Not started yet.
