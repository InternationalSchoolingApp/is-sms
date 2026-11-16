-- Test-user finder queries (READ ONLY, SELECT only, no passwords).
-- Column names were taken from the is-rest-api entities / DAO queries:
--   STUDENT_STANDARD (USER_ID, STANDARD_ID, STANDARD_STATUS, ENROLMENT_TYPE, SHOW_TRANSCRIPT_TO_STUDENT, REGISTRATION_TYPE)
--   LMS_USER (STUDENT_STANDARD_ID, LMS_PROVIDER_ID, ENTITY_ROLE, ACTIVE)
--   `USER` (ID, EMAIL, USER_FULL_NAME, SCHOOL)
-- Run each query on its own and send me the result rows (email + grade + school is enough).

-- ============================================================
-- Q1  D2: real CANVAS students (LMS provider 40)
--     Same query for Courseware: change 40 to 41.
-- ============================================================
SELECT U.EMAIL,
       U.USER_FULL_NAME,
       U.SCHOOL            AS SCHOOL_ID,
       ST.NAME             AS GRADE,
       SS.STANDARD_STATUS,
       LU.LMS_PROVIDER_ID
FROM LMS_USER LU
INNER JOIN STUDENT_STANDARD SS ON SS.ID = LU.STUDENT_STANDARD_ID
INNER JOIN `USER` U            ON U.ID = SS.USER_ID
LEFT  JOIN STANDARD ST         ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE LU.ENTITY_ROLE = 'STUDENT'
  AND LU.ACTIVE = 'Y'
  AND LU.LMS_PROVIDER_ID = 40
ORDER BY SS.STANDARD_STATUS, SS.ID DESC
LIMIT 20;

-- ============================================================
-- Q2  D3: students who should show " (New)" in the Transcript menu
--     Rule (utils/transcriptLinks.js): the student has MORE THAN ONE published
--     transcript (SHOW_TRANSCRIPT_TO_STUDENT = 'Y') and at least one of them is an
--     improve-grades / complete-grades enrolment.
-- ============================================================
SELECT U.EMAIL,
       U.USER_FULL_NAME,
       U.SCHOOL                                      AS SCHOOL_ID,
       COUNT(*)                                      AS PUBLISHED_TRANSCRIPTS,
       GROUP_CONCAT(CONCAT(ST.NAME, ' [', IFNULL(SS.ENROLMENT_TYPE, '-'), ']')
                    ORDER BY SS.ID SEPARATOR ' | ')  AS TRANSCRIPTS
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U    ON U.ID = SS.USER_ID
LEFT  JOIN STANDARD ST ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.SHOW_TRANSCRIPT_TO_STUDENT = 'Y'
GROUP BY SS.USER_ID, U.EMAIL, U.USER_FULL_NAME, U.SCHOOL
HAVING COUNT(*) > 1
   AND SUM(SS.ENROLMENT_TYPE IN ('REGISTRATION_IMPORVE_GRADES', 'REGISTRATION_COMPLETE_GRADES')) > 0
LIMIT 20;

-- ################################################################################
-- Q3 .. Q16: rules were read from the is-rest-api code by a research agent (not line by line by me).
-- Run each query separately. Lines marked ASSUMED are join columns the code did not show - if MySQL
-- says "Unknown column", send me the error and I will fix it.
-- "Active student" = STUDENT_STANDARD.STANDARD_STATUS = 0.
-- ################################################################################

-- ============================================================
-- Q3  Forced password popup
--     WARNING: logging in as a student from this list FORCES a password change, so the common test
--     password of that account will be lost. Pick a throw-away account.
--     Step 1: is the policy switched on?  (needs META_VALUE = 'true')
-- ============================================================
SELECT META_KEY, META_VALUE
FROM SETTINGS
WHERE META_TYPE = 'CONFIGURATION'
  AND META_KEY IN ('FORCE_PASSWORD_CHANGE_POLICY_SERVICE', 'PASSWORD_RESET_IN_DAYS');

--     Step 2: students with no policy row, or a last password date older than PASSWORD_RESET_IN_DAYS (default 30).
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, CP.LAST_PASSWORD_DATE
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U ON U.ID = SS.USER_ID
LEFT  JOIN CHANGE_PASSWORD_POLICY CP
       ON CP.USER_ID = U.ID
      AND CP.ID = (SELECT MAX(P2.ID) FROM CHANGE_PASSWORD_POLICY P2 WHERE P2.USER_ID = U.ID)
WHERE SS.STANDARD_STATUS = 0
  AND U.USER_ROLES = 'STUDENT'
  AND ( CP.ID IS NULL
        OR CP.LAST_PASSWORD_DATE IS NULL
        OR CP.LAST_PASSWORD_DATE <= NOW() - INTERVAL IFNULL(
             (SELECT CAST(META_VALUE AS UNSIGNED) FROM SETTINGS
              WHERE META_TYPE = 'CONFIGURATION' AND META_KEY = 'PASSWORD_RESET_IN_DAYS' LIMIT 1), 30) DAY )
LIMIT 20;

-- ============================================================
-- Q4  Reserve Seat popup (easy path: cached flag ELIGIBLE_FOR_ADV_FOR_NEXT_GRADE = 'Y')
--     studentGraduate must be false: SELECTED_SUBJECTS not empty AND MARKS_PUBLISHED <> 'Y'.
--     Not Grade 12 (STANDARD_ID 7). No SUCCESS payment of type REGISTRATION_FEE_ADV.
--     ASSUMED: STUDENT_STANDARD_DETAILS.STUDENT_STANDARD_ID = STUDENT_STANDARD.ID
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, ST.NAME AS GRADE, SS.REGISTRATION_TYPE,
       SSD.ELIGIBLE_FOR_ADV_FOR_NEXT_GRADE, SSD.ELIGIBLE_FOR_BAE_FOR_NEXT_GRADE
FROM STUDENT_STANDARD SS
INNER JOIN STUDENT_STANDARD_DETAILS SSD ON SSD.STUDENT_STANDARD_ID = SS.ID          -- ASSUMED column
INNER JOIN `USER` U     ON U.ID = SS.USER_ID
LEFT  JOIN STANDARD ST  ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.STANDARD_STATUS = 0
  AND SS.STANDARD_ID <> 7
  AND IFNULL(SS.SELECTED_SUBJECTS, '') <> ''
  AND IFNULL(SS.MARKS_PUBLISHED, 'N') <> 'Y'
  AND (SSD.ELIGIBLE_FOR_ADV_FOR_NEXT_GRADE = 'Y' OR SSD.ELIGIBLE_FOR_BAE_FOR_NEXT_GRADE = 'Y')
  AND NOT EXISTS (SELECT 1 FROM USER_PAYMENT_DETAILS UP
                  WHERE UP.STUDENT_STANDARD_ID = SS.ID
                    AND UP.PAYMENT_TITLE = 'REGISTRATION_FEE_ADV'
                    AND UP.STATUS = 'SUCCESS')
LIMIT 20;

-- ============================================================
-- Q5  System Training "Join" (live window)
--     A booked, accepted, not-completed orientation slot. Pick a row whose window is now or soon
--     (the Join button is limited to the window only when DEMO_SYS_ENTRY_VALIDATION = 'true';
--     otherwise it is always joinable).
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID,
       SO.START_DATE, SO.START_TIME, SO.END_DATE, SO.END_TIME,
       SO.ORIENT_STATUS, SO.ACCEPTANCE_STATUS, SO.MEETING_ID
FROM STUDENT_ORIENTATION SO
INNER JOIN STUDENT_STANDARD SS ON SS.ID = SO.STUDENT_STANDARD_ID
INNER JOIN `USER` U            ON U.ID = SO.USER_ID
WHERE SS.STANDARD_STATUS = 0
  AND SO.ACTIVATED = 'Y'
  AND SO.ACCEPTANCE_STATUS = 'A'
  AND SO.ORIENT_STATUS = 'PENDING'
  AND SO.START_DATE >= CURDATE() - INTERVAL 1 DAY
ORDER BY SO.START_DATE, SO.START_TIME
LIMIT 20;

-- ============================================================
-- Q6a D1 "You already started this payment" (open gateway attempt)
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, M.USER_PAYMENT_DETAILS_ID, M.PG_NAME,
       M.ATTEMPT_STATUS, M.EXPIRES_AT
FROM PAYTABPAYMENTMETADATA M
INNER JOIN `USER` U ON U.ID = M.OPEN_USER_ID
WHERE M.ATTEMPT_STATUS = 'OPEN'
  AND M.EXPIRES_AT > NOW()
LIMIT 20;

-- Q6b D1 "This fee is already paid": a student with a SUCCESS fee (the dialog opens when that fee is tried again)
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, UP.ID AS FEE_ID, UP.PAYMENT_TITLE, UP.PAY_AMOUNT, UP.STATUS
FROM USER_PAYMENT_DETAILS UP
INNER JOIN `USER` U ON U.ID = UP.USER_ID
INNER JOIN STUDENT_STANDARD SS ON SS.ID = UP.STUDENT_STANDARD_ID
WHERE UP.STATUS = 'SUCCESS' AND UP.ACTIVE = 'Y' AND UP.DELETED = 'N'
  AND SS.STANDARD_STATUS = 0
  AND UP.PAYMENT_TYPE NOT IN ('REGISTRATION FEE', 'bookSession', 'extension')
ORDER BY UP.ID DESC
LIMIT 20;

-- ============================================================
-- Q7  D7 "Payment Under Process" (school 5, wire transfer)
--     Must be the EARLIEST unpaid fee of that student (smallest SCHEDULED_PAY_DATE).
-- ============================================================
SELECT U.EMAIL, UP.ID AS FEE_ID, UP.PAYMENT_TITLE, UP.STATUS, UP.PG_NAME,
       UP.PAYMENT_TRANSFER_TYPE, UP.SCHEDULED_PAY_DATE
FROM USER_PAYMENT_DETAILS UP
INNER JOIN `USER` U ON U.ID = UP.USER_ID
WHERE UP.SCHOOL_ID = 5
  AND UP.ACTIVE = 'Y' AND UP.DELETED = 'N'
  AND UP.STATUS = 'INITIATED'
  AND UP.PG_NAME = 'WireTransfer'
  AND UP.PAYMENT_TRANSFER_TYPE = 1
  AND UP.PAYMENT_TYPE NOT IN ('REGISTRATION FEE', 'bookSession', 'extension')
  AND UP.SCHEDULED_PAY_DATE = (SELECT MIN(U2.SCHEDULED_PAY_DATE) FROM USER_PAYMENT_DETAILS U2
                               WHERE U2.USER_ID = UP.USER_ID AND U2.ACTIVE = 'Y' AND U2.DELETED = 'N'
                                 AND U2.STATUS IN ('INITIATED','SCHEDULED','FAILURE','PENDING','REJECTED')
                                 AND U2.PAYMENT_TYPE NOT IN ('REGISTRATION FEE', 'bookSession', 'extension'))
LIMIT 20;
-- The "Fee Details" menu only shows when USER.SIGNUP_TYPE = 'online' (any case); check it on the account you pick.

-- ============================================================
-- Q8  Outlook reminder popup = an "added sibling" whose Outlook/Azure account is not activated yet.
--     APPROXIMATION: the code also requires the creator to be a mapped parent or a PARENT/STUDENT user.
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, U.CREATED_BY, AZ.AZURE_USER_STATUS, AZ.PASSWORD_CREATED_DATE
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U ON U.ID = SS.USER_ID
LEFT  JOIN AZURE_USER_STATUS AZ ON AZ.USER_ID = U.ID
WHERE SS.STANDARD_STATUS = 0
  AND U.USER_ROLES = 'STUDENT'
  AND U.CREATED_BY IS NOT NULL AND U.CREATED_BY <> U.ID
  AND (AZ.USER_ID IS NULL OR AZ.PASSWORD_CREATED_DATE IS NULL)
LIMIT 20;

-- ============================================================
-- Q9  App-install popup: school 1, no APP_ACTIVITY row, prompt not disabled.
--     (Also needs the setting below to be anything except 'N'.)
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, U.APP_INSTALL_PROMPT_ENABLED
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U ON U.ID = SS.USER_ID
WHERE SS.STANDARD_STATUS = 0
  AND U.USER_ROLES = 'STUDENT'
  AND U.SCHOOL = 1
  AND IFNULL(U.APP_INSTALL_PROMPT_ENABLED, 'Y') <> 'N'
  AND NOT EXISTS (SELECT 1 FROM APP_ACTIVITY A WHERE A.USER_ID = U.ID)
LIMIT 20;

SELECT META_KEY, META_VALUE FROM SETTINGS
WHERE META_TYPE = 'CONFIGURATION' AND META_KEY = 'APP_INSTALL_NOTIFICATION_ENABLED';

-- ============================================================
-- Q10 "Need help" WhatsApp button depends only on the SCHOOL:
--     any student of a school with an active SCHOOL_SETTINGS_COMMUNICATION row sees it.
-- ============================================================
SELECT SCHOOL_ID, WHATS_APP_ISD_CODE, WHATS_APP_NUMBER
FROM SCHOOL_SETTINGS_COMMUNICATION
WHERE ACTIVE = 'Y';

-- ============================================================
-- Q11 My Certificates: students who own a non-revoked certificate
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, COUNT(*) AS CERTIFICATES
FROM CERTIFICATE C
INNER JOIN `USER` U ON U.ID = C.RECIPIENT_LOGIN_ID
WHERE C.DELETED = 'N' AND C.STATUS <> 'Revoked'
GROUP BY U.ID, U.EMAIL, U.SCHOOL
ORDER BY CERTIFICATES DESC
LIMIT 20;

-- ============================================================
-- Q12 Academic-year Extension card (PARTIAL: some checks in the code were not located)
--     Active standard, an active subject whose dates span today, LMS user not disabled.
--     The menu hides it for provider 39 and standard 8.
--     ASSUMED: LMS_USER.LMS_STATUS exists (the code treats LMS_STATUS = 0 as disabled).
-- ============================================================
SELECT DISTINCT U.EMAIL, U.SCHOOL AS SCHOOL_ID, ST.NAME AS GRADE, LU.LMS_PROVIDER_ID
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U ON U.ID = SS.USER_ID
INNER JOIN STUDENT_SESSION_SUBJECTS SSS ON SSS.STUDENT_STANDARD_ID = SS.ID
       AND SSS.SUBJECT_STATUS = 'A' AND CURDATE() BETWEEN SSS.START_DATE AND SSS.END_DATE
INNER JOIN LMS_USER LU ON LU.STUDENT_STANDARD_ID = SS.ID AND LU.ENTITY_ROLE = 'STUDENT'
       AND LU.ACTIVE = 'Y' AND IFNULL(LU.LMS_STATUS, 1) <> 0                      -- ASSUMED column
LEFT  JOIN STANDARD ST ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.STANDARD_STATUS = 0
  AND SS.STANDARD_ID <> 8
  AND LU.LMS_PROVIDER_ID <> 39
LIMIT 20;

-- ============================================================
-- Q13 Video Library: active subjects of the student that match a playlist having active videos
--     Rule: VIDEO_PLAYLIST.(SCHOOL_ID, STANDARD_ID, COURSE_TITLE) = subject (school, STANDARD_ID, TITLE or NAME).
-- ============================================================
SELECT DISTINCT U.EMAIL, U.SCHOOL AS SCHOOL_ID, ST.NAME AS GRADE, VP.COURSE_TITLE
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U ON U.ID = SS.USER_ID
INNER JOIN STUDENT_SESSION_SUBJECTS SSS ON SSS.STUDENT_STANDARD_ID = SS.ID AND SSS.SUBJECT_STATUS = 'A'
INNER JOIN SUBJECT SB ON SB.SUBJECT_ID = SSS.SUBJECT_ID
INNER JOIN VIDEO_PLAYLIST VP ON VP.SCHOOL_ID = U.SCHOOL
       AND VP.STANDARD_ID <=> SB.STANDARD_ID
       AND VP.COURSE_TITLE = COALESCE(NULLIF(TRIM(SB.TITLE), ''), SB.NAME)
       AND VP.DELETED = 'N'
INNER JOIN VIDEO_LIBRARY VL ON VL.PLAYLIST_ID = VP.ID
       AND VL.STATUS = 'ACTIVE' AND VL.ACTIVATED = 'Y' AND VL.DELETED = 'N'
LEFT  JOIN STANDARD ST ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.STANDARD_STATUS IN (0, 1)
LIMIT 20;
-- Videos may still be locked by the free-trial / paid-plan rule (those tables were not read).

-- ============================================================
-- Q14 Activity "Join Event": upcoming school activities. Pick a student of that school whose
--     standard / program matches the activity filters (STANDARD_ID, ENROLL_TYPE, LMS_PLATFORM, ...).
--     The button shows from (start - SHOW_JOINING_LINK_BEFORE minutes) until the end.
-- ============================================================
SELECT ID, SCHOOL_ID, ACTIVITY_MEETING_TYPE, START_DATE, END_DATE, START_TIME, END_TIME,
       SHOW_JOINING_LINK_BEFORE, ACTIVITY_FOR, STANDARD_ID, ENROLL_TYPE, LMS_PLATFORM, USER_IDS
FROM EXTRA_ACTIVITY_DETAILS
WHERE ACTIVE = 'Y' AND DELETED = 'N'
  AND TEACHER_IDS IS NOT NULL
  AND (ACTIVITY_FOR = 'All' OR FIND_IN_SET('Students', ACTIVITY_FOR) > 0)
  AND (END_DATE IS NULL OR END_DATE >= CURDATE())
ORDER BY START_DATE
LIMIT 20;

-- ============================================================
-- Q15 Student Handbook: students whose role has VIEW right on the module PAGE_LINK 'student-handbook'
-- ============================================================
SELECT DISTINCT U.EMAIL, U.SCHOOL AS SCHOOL_ID
FROM USER_RIGHTS UR
INNER JOIN MODULES M  ON M.ID = UR.MODULE_ID AND M.PAGE_LINK = 'student-handbook'
                     AND M.ACTIVATED = 'Y' AND M.DELETED = 'N'
INNER JOIN `USER` U   ON U.ROLE_ID = UR.ROLE_ID AND U.USER_ROLES = 'STUDENT'
WHERE UR.MODULE_ACTIVE = 'Y' AND UR.ACTIVATED = 'Y' AND UR.DELETED = 'N' AND UR.VIEW_RIGHT = 'Y'
LIMIT 20;

-- ============================================================
-- Q16 Inbox attachments: students with a mail that has attachments
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, COUNT(*) AS MAILS_WITH_ATTACHMENTS
FROM EMAIL_SEND_LOG_RECIPIENT R
INNER JOIN EMAIL_SEND_LOG ESL ON ESL.ID = R.EMAIL_SEND_LOG_ID
INNER JOIN `USER` U ON U.ID = R.USER_ID
WHERE ESL.ATTACHEMENTS = 'Y'                       -- (sic) the column is spelled ATTACHEMENTS
  AND ESL.MAIL_STATUS IN ('SUCCESS', 'FAILED', 'EXCEPTION', 'CAPTURED', 'OPTED_OUT')
  AND U.USER_ROLES = 'STUDENT'
GROUP BY U.ID, U.EMAIL, U.SCHOOL
ORDER BY MAILS_WITH_ATTACHMENTS DESC
LIMIT 20;

-- ################################################################################
-- CURRENT-SESSION QUERIES: students who are studying RIGHT NOW
--   "Studying now" = current standard (STANDARD_STATUS = 0), an ACTIVE subject (SUBJECT_STATUS = 'A')
--   whose START_DATE..END_DATE covers today, and an active LMS user.
--   (Rule taken from StudentSessionSubjectDao / StudentStandardDao in is-rest-api.)
--   Use these instead of Q1 when you need a student with fresh activity (D2 Canvas / Courseware, D5, etc.).
-- ################################################################################

-- ============================================================
-- QC1  All currently-studying students, grouped by LMS provider and grade (counts only - to see what exists)
--      LMS_PROVIDER_ID: 40 = Canvas, 41 = Courseware, 37/38 = the other main LMS.
-- ============================================================
SELECT LU.LMS_PROVIDER_ID,
       ST.NAME            AS GRADE,
       U.SCHOOL           AS SCHOOL_ID,
       COUNT(DISTINCT U.ID) AS STUDENTS
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U  ON U.ID = SS.USER_ID AND U.USER_ROLES = 'STUDENT'
INNER JOIN LMS_USER LU ON LU.STUDENT_STANDARD_ID = SS.ID AND LU.ENTITY_ROLE = 'STUDENT' AND LU.ACTIVE = 'Y'
INNER JOIN STUDENT_SESSION_SUBJECTS SSS ON SSS.STUDENT_STANDARD_ID = SS.ID
       AND SSS.SUBJECT_STATUS = 'A'
       AND CURDATE() BETWEEN SSS.START_DATE AND SSS.END_DATE
LEFT  JOIN STANDARD ST ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.STANDARD_STATUS = 0
GROUP BY LU.LMS_PROVIDER_ID, ST.NAME, U.SCHOOL
ORDER BY LU.LMS_PROVIDER_ID, U.SCHOOL, ST.NAME;

-- ============================================================
-- QC2  D2: CANVAS (40) students studying now  (change 40 to 41 for Courseware)
--      Most active subjects first, so the first rows are the best test accounts.
-- ============================================================
SELECT U.EMAIL,
       U.USER_FULL_NAME,
       U.SCHOOL             AS SCHOOL_ID,
       ST.NAME              AS GRADE,
       COUNT(DISTINCT SSS.SUBJECT_ID) AS ACTIVE_SUBJECTS,
       MAX(SSS.END_DATE)    AS SESSION_ENDS
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U  ON U.ID = SS.USER_ID AND U.USER_ROLES = 'STUDENT'
INNER JOIN LMS_USER LU ON LU.STUDENT_STANDARD_ID = SS.ID AND LU.ENTITY_ROLE = 'STUDENT'
       AND LU.ACTIVE = 'Y' AND LU.LMS_PROVIDER_ID = 40
INNER JOIN STUDENT_SESSION_SUBJECTS SSS ON SSS.STUDENT_STANDARD_ID = SS.ID
       AND SSS.SUBJECT_STATUS = 'A'
       AND CURDATE() BETWEEN SSS.START_DATE AND SSS.END_DATE
LEFT  JOIN STANDARD ST ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.STANDARD_STATUS = 0
GROUP BY U.ID, U.EMAIL, U.USER_FULL_NAME, U.SCHOOL, ST.NAME
ORDER BY ACTIVE_SUBJECTS DESC, SESSION_ENDS DESC
LIMIT 20;

-- ============================================================
-- QC3  Same idea for ANY provider: currently-studying students with their provider and grade
--      (use this to pick one test student per grade band: K-5, 6-8, 9-12)
-- ============================================================
SELECT U.EMAIL,
       U.SCHOOL             AS SCHOOL_ID,
       ST.NAME              AS GRADE,
       SS.REGISTRATION_TYPE,
       LU.LMS_PROVIDER_ID,
       COUNT(DISTINCT SSS.SUBJECT_ID) AS ACTIVE_SUBJECTS
FROM STUDENT_STANDARD SS
INNER JOIN `USER` U  ON U.ID = SS.USER_ID AND U.USER_ROLES = 'STUDENT'
INNER JOIN LMS_USER LU ON LU.STUDENT_STANDARD_ID = SS.ID AND LU.ENTITY_ROLE = 'STUDENT' AND LU.ACTIVE = 'Y'
INNER JOIN STUDENT_SESSION_SUBJECTS SSS ON SSS.STUDENT_STANDARD_ID = SS.ID
       AND SSS.SUBJECT_STATUS = 'A'
       AND CURDATE() BETWEEN SSS.START_DATE AND SSS.END_DATE
LEFT  JOIN STANDARD ST ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE SS.STANDARD_STATUS = 0
GROUP BY U.ID, U.EMAIL, U.SCHOOL, ST.NAME, SS.REGISTRATION_TYPE, LU.LMS_PROVIDER_ID
ORDER BY LU.LMS_PROVIDER_ID, ST.NAME
LIMIT 50;

-- ============================================================
-- QS  SIMPLE: users that have a STUDENT_SESSION_SUBJECTS row whose START_DATE..END_DATE covers today
--     (one row per student, with provider, grade and how many such subjects)
--     COURSE_PRO_ID: 40 = Canvas, 41 = Courseware, 37/38 = main LMS. Add AND COURSE_PRO_ID = 40 to filter.
--     Add AND SSS.SUBJECT_STATUS = 'A' if you want only active subjects.
-- ============================================================
SELECT U.EMAIL,
       U.USER_FULL_NAME,
       U.SCHOOL            AS SCHOOL_ID,
       ST.NAME             AS GRADE,
       SSS.COURSE_PRO_ID,
       COUNT(*)            AS SUBJECTS_RUNNING_TODAY,
       MIN(SSS.START_DATE) AS FROM_DATE,
       MAX(SSS.END_DATE)   AS TO_DATE
FROM STUDENT_SESSION_SUBJECTS SSS
INNER JOIN STUDENT_STANDARD SS ON SS.ID = SSS.STUDENT_STANDARD_ID
INNER JOIN `USER` U            ON U.ID = SS.USER_ID
LEFT  JOIN STANDARD ST         ON ST.STANDARD_ID = SS.STANDARD_ID
WHERE CURDATE() BETWEEN SSS.START_DATE AND SSS.END_DATE
GROUP BY U.ID, U.EMAIL, U.USER_FULL_NAME, U.SCHOOL, ST.NAME, SSS.COURSE_PRO_ID
ORDER BY SSS.COURSE_PRO_ID, ST.NAME
LIMIT 50;

-- ################################################################################
-- FEEDBACK QUERIES (class feedback, B1) - rules read from DashboardSchoolCalendarUtil / FeedbackEventMappingDao /
-- LiveClassroomAttendanceDao. A calendar event gets isFeedbackFormMapped = 'Y' only when BOTH hold:
--   (1) the student's ROLE has an ACTIVE feedback form mapped to the event type (or to 'COMMON'), and
--   (2) the student ATTENDED it: a LIVE_CLASSROOM_ATTENDANCE row (same name, JOIN_TIME set) for that class / activity day.
-- Run each query separately and send me the rows (email + school is enough).
-- ################################################################################

-- ============================================================
-- QF1  Which roles / event types have a feedback form mapped (if empty, no student can ever see "Rate this class")
-- ============================================================
SELECT FEV.EVENT_NAME, FEM.ROLE_ID, FEM.FEEDBACK_FORM_ID, FF.ACTIVATED AS FORM_ACTIVE
FROM FEEDBACK_EVENT_MAPPING FEM
INNER JOIN FEEDBACK_EVENT_MASTER FEV ON FEV.ID = FEM.EVENT_ID
INNER JOIN FEEDBACK_FORMS FF ON FF.ID = FEM.FEEDBACK_FORM_ID
WHERE FEM.ACTIVE = 'Y' AND FF.ACTIVATED = 'Y'
ORDER BY FEV.EVENT_NAME, FEM.ROLE_ID;

-- ============================================================
-- QF2  The settings the flow reads (BULK day: 0 = Sunday ... 6 = Saturday; AFTER_CLASS must be TRUE for the live-end popup)
-- ============================================================
SELECT META_KEY, META_VALUE
FROM SETTINGS
WHERE META_TYPE = 'CONFIGURATION'
  AND META_KEY IN ('FEEDBACK_SHOW_FROM_DATE', 'USER_FOR_FEEDBACK_TEST', 'FEEDBACK_SHOW_POPUP_AFTER_CLASS',
                   'FEEDBACK_MODAL_DELAY_MIN', 'BULK_FEEDBACK_SHOW_DAY');

-- The feedback site each school opens (the form's address comes from here; a school without a row gets no form):
SELECT SCHOOL_ID, VENDOR_ID FROM SCHOOL_SETTING_FEEDBACK;

-- ============================================================
-- QF3  Students who attended something in the last 14 days AND whose role has a feedback form mapped
--      = the best candidates for "Rate this class". (Names are matched exactly, ignoring case; the code also accepts a
--      long name when the attendance name is its beginning.)
--      ENTITY_NAME: MEETINGS = class, BATCH_TEACHER_MAPPING / BATCH_RESCHEDULE_CANCEL_DETAILS = batch class,
--      EXTRA_ACTIVITY_DETAILS = activity.
-- ============================================================
SELECT U.EMAIL, U.USER_FULL_NAME, U.SCHOOL AS SCHOOL_ID, LCA.ENTITY_NAME, LCA.ENTITY_ID, LCA.JOIN_TIME
FROM LIVE_CLASSROOM_ATTENDANCE LCA
INNER JOIN `USER` U ON TRIM(LOWER(U.USER_FULL_NAME)) = TRIM(LOWER(LCA.NAME))
WHERE LCA.ACTIVE = 'Y' AND LCA.DELETED = 'N'
  AND LCA.JOIN_TIME IS NOT NULL
  AND LCA.JOIN_TIME >= NOW() - INTERVAL 14 DAY
  AND LCA.ENTITY_NAME IN ('MEETINGS', 'BATCH_TEACHER_MAPPING', 'BATCH_RESCHEDULE_CANCEL_DETAILS', 'EXTRA_ACTIVITY_DETAILS')
  AND U.USER_ROLES = 'STUDENT'
  AND EXISTS (SELECT 1
              FROM FEEDBACK_EVENT_MAPPING FEM
              INNER JOIN FEEDBACK_FORMS FF ON FF.ID = FEM.FEEDBACK_FORM_ID
              WHERE FEM.ROLE_ID = U.ROLE_ID AND FEM.ACTIVE = 'Y' AND FF.ACTIVATED = 'Y')
ORDER BY LCA.JOIN_TIME DESC
LIMIT 30;

-- ============================================================
-- QF4  Students who already submitted a feedback (the "already rated" view, status S001)
-- ============================================================
SELECT U.EMAIL, U.SCHOOL AS SCHOOL_ID, FS.ENTITY_TYPE, FS.ENTITY_ID, FS.FEEDBACK_DATE_TIME
FROM FEEDBACK_SUBMISSION FS
INNER JOIN `USER` U ON U.ID = FS.USER_ID
ORDER BY FS.ID DESC
LIMIT 20;
