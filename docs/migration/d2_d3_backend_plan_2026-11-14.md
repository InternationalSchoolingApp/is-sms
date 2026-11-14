# D2 and D3 — backend plan (2026-11-14)

Scope: the two "needs a backend field" items from `student_dashboard_handoff_2026-11-13.html`.
Rule kept: no behaviour change, no new endpoint; only an additive field on an existing one, and only where it is truly needed.

| Item | Handoff said | What the code says | Backend change |
|---|---|---|---|
| D2 Progress Reports, Canvas (provider 40) and Courseware (41) | the report bodies are missing | the JSON the page already calls carries everything | **None** (frontend only) |
| D3 Transcript: Diploma link, "(New)" label, module view-right | `student-transcript-status` has no diploma link | true for the link and the label; the view-right is a frontend check | **Two additive fields** on one existing endpoint |

---

## D2 — Canvas and Courseware report bodies

### Finding
`ClientDashboardAzlixbuzzController.getUserGradeBookSummary` (the endpoint behind `useProgressReport` in `components/student/ProgressReportView.jsx`) already answers JSON when `asJson`:

- `lmsProId` ("40" / "41"), `reportMessage`, `data`, `startdate`, `enddate`, `reportStartDate`, `reportEndDate`, `subReportType`, `downloadUrl`, student header fields, and
- **`courseWareReport`** = `response.getResponse().getCourseWareResponse()` (a list of `CourseWareReportDTO`).

`MainFileForReport.jsp` renders 40 and 41 from that same list (`CanvasReport.jsp` / `CoursewareReport.jsp`; the two differ only in print CSS). So the data is already on the wire.

`CourseWareReportDTO` (per course): `courseName`, `teacherName`, `gradeName`, `academicYearStartDate`, `academicYearEndDate`, `itemList`, `submitGradedActivityCount`, `notSubmittedActivityCount`, `waitingforGradeCount`, `lastSubmiteDate`, `lastSubmitActivityName`, `currentWeekPercentage`, `courseCompletionPercentage`, `courseGrade`, `currentOverallPercentage`.
Item fields the JSP uses: `type`, `activityName`, `dueDate`, `submittedDate`, `percentage`, `gradeLetter`, `colorScoreText`, `unitTitle`.

### What is still to do (no backend code)
1. **Verify the JSON on a real provider-40 and provider-41 student** (I have only dummy data; I have not seen this JSON). Check that `courseWareReport` is non-empty and the field names above arrive (Jackson serialises the Lombok getters; the inner `Item` class must also have getters).
2. Frontend: in `ProgressReportView.jsx` / `K5ProgressReportView.jsx`, replace the `unsupported` message (`lmsProId` 40 or 41) with a report body built from `courseWareReport`: same student header, one block per course, the items table (Type, Activity Name, Due, Submitted, Percentage, Grade), the five counters, course grade, overall % and (weekly only) the week %. Date search and Download already work on the same endpoint.
3. Items in the handoff list that this removes: the `unsupported` branch in both files.

### Risks
- If `courseWareReport` arrives empty for some students, the legacy page also shows an empty report (`upload.setBlankReport(0)`), so show the same "No activities in this period".
- Only if step 1 shows missing fields do we need a backend change; it would then be a getter on `CourseWareReportDTO.Item` (no behaviour change).

---

## D3 — Transcript: Diploma link and "(New)" label

### What the legacy does (and where)
The Diploma / "(New)" lines live in `dashboard/school/StudentAttendance.jsp` (the school/parent menu of a student), and the parent API already exposes the diploma link:

- `DashboardParentUtil` (~line 950): for each published transcript, when `standardId == 7` it builds
  `…/{schoolUUID}/dashboard/view-diploma/{uniqueId}?payload=` + `base64(encryptExternalParam(studentStandardId + "|false"))`; otherwise empty.
- `StudentAttendance.jsp`: `Diploma - {grade}` when `gradeId == 7`; " (New)" after the transcript name when the student has more than one standard and `enrolmentType` is `REGISTRATION_IMPORVE_GRADES` or `REGISTRATION_COMPLETE_GRADES`; everything inside `roleAndModule.viewed == 'Y'`.
- `ClientDashoboardMarksController.studentDiplomaDataPage` (`/view-diploma`) already renders the diploma from that payload.

`student-transcript-status` (`ClientDashoboardMarksController`, ~line 596) returns per transcript only `gradeName` and `viewPath`.

### Backend change (additive, one method)
In the transcript loop of `studentTranscriptStatus`, next to `viewPath`:

```java
// Final grade (standardId 7): the same diploma link the parent API builds (DashboardParentUtil).
if (standardId == 7) {
    String payloadDiploma = aesUtil.base64(aesUtil.encryptExternalParam(studentStandardId + "|false").getBytes());
    t.put("diplomaUrl", "/" + schoolUUID + "/dashboard/view-diploma/" + user.getUniquId()
        + "?payload=" + URLEncoder.encode(payloadDiploma, StandardCharsets.UTF_8));
}
// For the "(New)" label: the enrolment type of that standard row.
StudentStandard ss = studentStandardService.getById(studentStandardId);
t.put("enrolmentType", ss != null ? StringUtils.defaultString(ss.getEnrollmentType()) : "");
```

- Fields added: `diplomaUrl` (only when `standardId == 7`), `enrolmentType`. Nothing is removed or renamed; existing callers ignore them.
- The URL is relative like `viewPath`; the base64 payload is URL-encoded (it can contain `+ / =`), same as `download-diploma` does.
- Security: same model as `viewPath` (an AES-encrypted payload the student cannot forge; no new read of other users' data).
- Cost: one `getById` per published transcript row (a handful of rows per student). If it matters, read `enrollmentType` from the `getStudentDocuments` row instead (needs an extra column in that query, so avoid unless needed).

### Frontend (after the backend ships)
- `Transcript.jsx` / `K5Transcript.jsx`: show "Diploma – {grade}" next to the transcript action when `diplomaUrl` is set (opens in a new tab, like the transcript).
- Show " (New)" after the grade when the student has more than one transcript and `enrolmentType` is one of the two values above.
- Module view-right: gate the whole page on `useModuleRights("student-transcript").canView` (frontend only; the hook already exists and the other modules use it).

### Decision (2026-11-14, user)
The student's own Transcript page shows the Diploma link (same rule the parent API uses: `standardId == 7`).

### Done
- Backend (`ClientDashoboardMarksController.studentTranscriptStatus`): `diplomaUrl` (final grade only) and `enrolmentType` added to each transcript item.
- Frontend: `utils/transcriptLinks.js` builds the menu items; `Transcript.jsx` (standard) and `K5Transcript.jsx` (grade looks) list "Transcript - {grade}" (+ " (New)"), "Diploma - {grade}", and hide the links when the module's viewed right is not "Y".
- Still to check live: a Grade 12 student (diploma link opens) and a student with a second "improve grades" standard ("(New)"). The Java side needs a backend restart.

---

## Order and checks
1. D2: check the JSON on a provider-40 and a provider-41 student, then build the frontend body. No backend release.
2. D3: your answer to the open question; then the two fields (one small backend change, restart needed), then the frontend.
3. Tests: D3 with a Grade 12 student (diploma link present, opens), a student with an "improve grades" second standard ("(New)" shown), and a Grade 9 student (no diploma link). D2 with one provider-40 and one provider-41 student, both with and without activities.
