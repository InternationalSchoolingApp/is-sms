-- ===========================================================================
-- AI Course Advisor - Phase 0 data audit (READ-ONLY, safe to run on a replica)
--
-- Goal: how much course content can we give the AI? Run on the live replica and
-- paste the results back. Nothing here writes data.
-- Filters match what Step 3 itself loads (CoursesDao / SubjectDao:405).
-- ===========================================================================

-- 1) Subjects with an inline description (SUBJECT.SUBJECT_DESC), per school / provider / grade.
SELECT S.SCHOOL_ID, S.COURSE_PRO_ID, S.STANDARD_ID,
       COUNT(*)                                                         AS SUBJECTS,
       SUM(S.SUBJECT_DESC IS NOT NULL AND TRIM(S.SUBJECT_DESC) <> '')   AS WITH_DESC,
       ROUND(100 * SUM(S.SUBJECT_DESC IS NOT NULL AND TRIM(S.SUBJECT_DESC) <> '') / COUNT(*), 1) AS PCT_WITH_DESC
FROM SUBJECT S
WHERE S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.COURSE_PRO_ID IN (37, 38, 41)
GROUP BY S.SCHOOL_ID, S.COURSE_PRO_ID, S.STANDARD_ID
ORDER BY S.SCHOOL_ID, S.COURSE_PRO_ID, S.STANDARD_ID;

-- 2) Subjects with a "Course summary" link (SUBJECT_DETAILS.DESCRIPTION_URL).
SELECT S.COURSE_PRO_ID, S.STANDARD_ID,
       COUNT(*)                                                          AS SUBJECTS,
       SUM(SD.DESCRIPTION_URL IS NOT NULL AND TRIM(SD.DESCRIPTION_URL) <> '') AS WITH_URL
FROM SUBJECT S
LEFT JOIN SUBJECT_DETAILS SD ON SD.SUBJECT_ID = S.SUBJECT_ID AND SD.ACTIVE = 'Y' AND SD.DELETED = 'N'
WHERE S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.COURSE_PRO_ID IN (37, 38, 41)
GROUP BY S.COURSE_PRO_ID, S.STANDARD_ID
ORDER BY S.COURSE_PRO_ID, S.STANDARD_ID;

-- 3) Category descriptions (COURSES.DESCRIPTION).
SELECT C.SCHOOL_ID, C.COURSE_PRO_ID, C.STANDARD_ID,
       COUNT(*)                                                   AS CATEGORIES,
       SUM(C.DESCRIPTION IS NOT NULL AND TRIM(C.DESCRIPTION) <> '') AS WITH_DESC
FROM COURSES C
WHERE C.ACTIVE = 'Y' AND C.DELETED = 'N' AND C.COURSE_PRO_ID IN (37, 38, 41)
GROUP BY C.SCHOOL_ID, C.COURSE_PRO_ID, C.STANDARD_ID
ORDER BY C.SCHOOL_ID, C.COURSE_PRO_ID, C.STANDARD_ID;

-- 4) Website catalog content (WEB_COURSES): overview / prerequisites available?
SELECT LOCALE,
       COUNT(*)                                                     AS ROWS_TOTAL,
       SUM(OVERVIEW IS NOT NULL AND TRIM(OVERVIEW) <> '')             AS WITH_OVERVIEW,
       SUM(PRE_REQUISITES IS NOT NULL AND TRIM(PRE_REQUISITES) <> '') AS WITH_PREREQ
FROM WEB_COURSES
GROUP BY LOCALE;

-- 5) Can WEB_COURSES be matched to SUBJECT by name? (no FK exists - checking a title match)
SELECT COUNT(DISTINCT S.SUBJECT_ID) AS SUBJECTS_MATCHED_BY_TITLE
FROM SUBJECT S
JOIN WEB_COURSES W ON LOWER(TRIM(W.TITLE)) = LOWER(TRIM(S.NAME))
WHERE S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.COURSE_PRO_ID IN (37, 38, 41);

-- 6) Existing static recommendations (RECOMMENDED_COURSE) - which grades/programs have one?
SELECT SCHOOL_ID, COURSE_PRO_ID, REGISTRATION_TYPE, STANDARD_ID,
       LENGTH(COURSE_IDS) - LENGTH(REPLACE(COURSE_IDS, ',', '')) + 1 AS COURSE_COUNT
FROM RECOMMENDED_COURSE
WHERE COURSE_IDS IS NOT NULL AND COURSE_IDS <> ''
ORDER BY SCHOOL_ID, REGISTRATION_TYPE, STANDARD_ID;

-- 7) Sample of 20 real descriptions, to judge quality (first rollout: school 1, Grades 9-12).
SELECT S.SUBJECT_ID, S.STANDARD_ID, C.NAME AS CATEGORY, S.NAME, LEFT(S.SUBJECT_DESC, 300) AS DESC_PREVIEW
FROM SUBJECT S
JOIN COURSES C ON C.ID = S.COURSE_ID
WHERE S.SCHOOL_ID = 1 AND S.STANDARD_ID IN (4, 5, 6, 7) AND S.COURSE_PRO_ID = 37
  AND S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.SUBJECT_DESC IS NOT NULL AND TRIM(S.SUBJECT_DESC) <> ''
LIMIT 20;

-- ===========================================================================
-- FOLLOW-UP (after first run): WEB_COURSES coverage for the first rollout.
-- SUBJECT_DESC / DESCRIPTION_URL / COURSES.DESCRIPTION are empty, so WEB_COURSES
-- (en) is the content source. How many school-1 subjects find a match?
-- ===========================================================================

-- 8) Coverage per grade: exact title match vs. match after dropping Honors/Advanced/AP suffix.
SELECT S.STANDARD_ID,
       COUNT(*) AS SUBJECTS,
       SUM(EXISTS (SELECT 1 FROM WEB_COURSES W WHERE W.LOCALE = 'en'
                   AND LOWER(TRIM(W.TITLE)) = LOWER(TRIM(S.NAME)))) AS EXACT_MATCH,
       SUM(EXISTS (SELECT 1 FROM WEB_COURSES W WHERE W.LOCALE = 'en'
                   AND LOWER(TRIM(W.TITLE)) = LOWER(TRIM(
                       REGEXP_REPLACE(S.NAME, '[[:space:]]+(Honors|Honours|Advanced|Advance|AP)$', ''))))) AS MATCH_AFTER_SUFFIX_STRIP
FROM SUBJECT S
WHERE S.SCHOOL_ID = 1 AND S.COURSE_PRO_ID = 37 AND S.STANDARD_ID IN (1, 2, 3, 4, 5, 6, 7)
  AND S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.SHOWN_ELLIGIBILITY_STATUS = 'Y'
GROUP BY S.STANDARD_ID
ORDER BY S.STANDARD_ID;

-- 9) The subjects that still don't match (first 50) - to see why.
SELECT S.SUBJECT_ID, S.STANDARD_ID, S.NAME
FROM SUBJECT S
WHERE S.SCHOOL_ID = 1 AND S.COURSE_PRO_ID = 37 AND S.STANDARD_ID IN (4, 5, 6, 7)
  AND S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.SHOWN_ELLIGIBILITY_STATUS = 'Y'
  AND NOT EXISTS (SELECT 1 FROM WEB_COURSES W WHERE W.LOCALE = 'en'
                  AND LOWER(TRIM(W.TITLE)) = LOWER(TRIM(
                      REGEXP_REPLACE(S.NAME, '[[:space:]]+(Honors|Honours|Advanced|Advance|AP)$', ''))))
ORDER BY S.STANDARD_ID, S.NAME
LIMIT 50;

-- 10) What a WEB_COURSES row looks like (3 samples), to size the AI context.
SELECT TITLE, CATEGORY, LEFT(OVERVIEW, 400) AS OVERVIEW_PREVIEW, PRE_REQUISITES, LENGTH(OVERVIEW) AS OVERVIEW_CHARS
FROM WEB_COURSES WHERE LOCALE = 'en' LIMIT 3;

-- ===========================================================================
-- ROUND 3: Step 3 shows SUBJECT.TITLE (CTECourseUtil:1680), not SUBJECT.NAME
-- (NAME holds LMS names like "Algebra I v23 (GS) (Master)"). Re-check on TITLE,
-- only for subjects Step 3 can actually list (no Answer Keys / Credit Recovery).
-- ===========================================================================

-- 11) Coverage per grade using TITLE (exact, and after dropping Honors/Advanced suffix).
SELECT S.STANDARD_ID,
       COUNT(*) AS SUBJECTS,
       SUM(EXISTS (SELECT 1 FROM WEB_COURSES W WHERE W.LOCALE = 'en'
                   AND LOWER(TRIM(W.TITLE)) = LOWER(TRIM(S.TITLE)))) AS EXACT_MATCH,
       SUM(EXISTS (SELECT 1 FROM WEB_COURSES W WHERE W.LOCALE = 'en'
                   AND LOWER(TRIM(W.TITLE)) = LOWER(TRIM(
                       REGEXP_REPLACE(S.TITLE, '[[:space:]]+(Honors|Honours|Advanced|Advance)$', ''))))) AS MATCH_AFTER_SUFFIX_STRIP
FROM SUBJECT S
WHERE S.SCHOOL_ID = 1 AND S.COURSE_PRO_ID = 37 AND S.STANDARD_ID IN (1, 2, 3, 4, 5, 6, 7)
  AND S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.SUBJECT_ID = S.PID AND S.SHOWN_ELLIGIBILITY_STATUS = 'Y' AND S.COURSE_TYPE NOT IN ('AK', 'CR')
GROUP BY S.STANDARD_ID
ORDER BY S.STANDARD_ID;

-- 12) 40 Grade 9 titles as students see them, with the WEB_COURSES title they matched (if any).
SELECT S.SUBJECT_ID, S.COURSE_TYPE, S.TITLE,
       (SELECT W.TITLE FROM WEB_COURSES W WHERE W.LOCALE = 'en'
          AND LOWER(TRIM(W.TITLE)) = LOWER(TRIM(
              REGEXP_REPLACE(S.TITLE, '[[:space:]]+(Honors|Honours|Advanced|Advance)$', ''))) LIMIT 1) AS WEB_TITLE
FROM SUBJECT S
WHERE S.SCHOOL_ID = 1 AND S.COURSE_PRO_ID = 37 AND S.STANDARD_ID = 4
  AND S.ACTIVE = 'Y' AND S.DELETED = 'N' AND (S.PARENT_ID = 0 OR S.PARENT_ID IS NULL)
  AND S.SUBJECT_ID = S.PID AND S.SHOWN_ELLIGIBILITY_STATUS = 'Y' AND S.COURSE_TYPE NOT IN ('AK', 'CR')
ORDER BY S.TITLE
LIMIT 40;

-- 13) What WEB_COURSES titles and categories look like (to design the matching).
SELECT CATEGORY, COUNT(*) AS N, MIN(TITLE) AS EXAMPLE_1, MAX(TITLE) AS EXAMPLE_2
FROM WEB_COURSES WHERE LOCALE = 'en'
GROUP BY CATEGORY;
