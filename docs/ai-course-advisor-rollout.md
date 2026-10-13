# AI Course Advisor — Rollout Runbook (Phase 6)

Everything ships **off**. A stage goes live only by changing rows in `SETTINGS`, which takes effect within about 5 seconds. No deploy is needed.

## 1. Deploy (once)

1. **Backend (`is-rest-api`):** deploy the branch with the `courseadvisor` package.
2. **Database:** run these in order. Each one is safe to re-run.
   1. `external-resource/63_6_0_COURSE_ADVISOR_SETTINGS.sql`
   2. `external-resource/63_6_0_COURSE_ADVISOR_MARKSHEET.sql` (also adds `COURSE_ADVISOR_REQUIRE_SESSION`)
   3. `external-resource/63_6_0_COURSE_ADVISOR_RECOMMENDATION.sql`
   4. `external-resource/63_6_0_COURSE_ADVISOR_CHAT.sql`
3. **Frontend (`is-sms`):** deploy. The AI Suggester card stays hidden until the backend flag says otherwise.
4. **Anthropic key:** nothing new to set. Leave `ANTHROPIC_API_KEY_COURSE_ADVISOR` and `ANTHROPIC_WORKSPACE_ID_COURSE_ADVISOR` empty, and the advisor uses the existing `ANTHROPIC_API_KEY` (`sk-ant-api03-…`). This is the setup verified on UAT.
   - Don't use an `sk-ant-usr-…` key. It isn't scoped to a workspace, and the Anthropic API rejects it (HTTP 400).
5. **Go live:** run `external-resource/63_6_0_COURSE_ADVISOR_ENABLE.sql`. To switch everything off again, run `63_6_0_COURSE_ADVISOR_RESET_DEFAULTS.sql`.

## 2. Live AI check (before switching anything on)

Run this from `is-rest-api`. It uses the real prompts against the real API and costs a few cents.

```bash
ADVISOR_LIVE_API_KEY=<key> ADVISOR_LIVE_WORKSPACE_ID=<workspace id, if needed> ./mvnw test -Dtest=CourseAdvisorLiveTest
```

It checks four things:
- A drawn marksheet is read correctly, and the name, roll number and school name do **not** come back.
- A grocery list is recognised as not being a marksheet.
- The suggestions for a Grade 9 engineering student all pass the validator, and required English is never replaced.
- Chat answers are short, and off-topic or "ignore your rules" questions are declined.

Read the printed answers. They are what students will see.

## 3. Stages

| Stage | Settings to change | Who sees it |
|---|---|---|
| UAT | `COURSE_ADVISOR_AI_ENABLED=Y`, `…_SCHOOL_IDS=1`, `…_LEARNING_PROGRAMS=ONE_TO_ONE`, `…_MARKSHEET_ENABLED=Y`, `…_ADDITIONAL_COURSE_ENABLED=Y`, `…_CHAT_ENABLED=Y` | UAT testers |
| 1 | The same settings on production | School 1, One-to-One (Grades 6–12; KG–5 and Exact Path are always excluded) |
| 2 | `…_LEARNING_PROGRAMS=ONE_TO_ONE,DUAL_DIPLOMA` | Adds Dual Diploma |
| 3 | add `SCHOLARSHIP,SSP,ONE_TO_ONE_FLEX,BATCH` | All programs at school 1 |
| 4 | `…_SCHOOL_IDS=1,4,…` | Other schools |

Partner students only get the extra-course suggestion when `COURSE_ADVISOR_ADDITIONAL_COURSE_FOR_PARTNER=Y`.

**Kill switch:** `COURSE_ADVISOR_AI_ENABLED=N` hides everything within about 5 seconds.

## 4. Smoke test per stage (about 10 minutes)

- [ ] Step 3 shows the "AI Suggester" card. A KG–5 student does **not** see it.
- [ ] Opening it shows the marksheet step with the `*` note. "Skip this step" goes to the questions.
- [ ] Uploading a phone photo of a real marksheet shows the subjects table, and you can edit it.
- [ ] "Get suggestions" shows a checklist, then cards with reasons. Any extra course appears in a separate "Try this" card and is unticked.
- [ ] Untick one card and use "Apply selected". The fee confirmation appears, and after confirming the courses slide in with an "AI pick" badge.
- [ ] "Ask a question" answers, and an "elective" question can propose a course that applies from the chat.
- [ ] An SSO-login student can use it. If the backend logs `no session user or login hash`, check that `userLoginHash` is in the next-auth session.
- [ ] Phone width works, including scrolling the questions with the button kept visible.

## 5. Metrics (read-only SQL)

```sql
-- Daily use: suggestion requests, how many were applied (fully or partly), marksheets, chat questions
SELECT DATE(CREATED_AT) AS DAY,
       SUM(SOURCE = 'SUGGESTER')                                              AS SUGGESTION_REQUESTS,
       SUM(SOURCE = 'SUGGESTER' AND STATUS IN ('APPLIED','PARTIALLY_APPLIED')) AS APPLIED_ANY,
       SUM(SOURCE = 'SUGGESTER' AND STATUS = 'FAILED')                        AS AI_FAILURES,
       SUM(SOURCE = 'CHAT')                                                   AS CHAT_PROPOSALS
FROM STUDENT_COURSE_ADVISOR_RECOMMENDATION
GROUP BY DATE(CREATED_AT) ORDER BY DAY DESC LIMIT 30;

-- Extra-course nudge: how often an offered extra course was accepted vs declined
SELECT COUNT(*) AS OFFERED,
       SUM(FIND_IN_SET(J.ITEM_ID, R.APPLIED_ITEM_IDS) > 0)   AS ACCEPTED,
       SUM(FIND_IN_SET(J.ITEM_ID, R.DISMISSED_ITEM_IDS) > 0) AS DECLINED
FROM STUDENT_COURSE_ADVISOR_RECOMMENDATION R,
     JSON_TABLE(R.ITEMS_JSON, '$[*]' COLUMNS (ITEM_ID VARCHAR(10) PATH '$.itemId', ACTION VARCHAR(20) PATH '$.action')) J
WHERE J.ACTION = 'ADDITIONAL';

-- Marksheet reading outcomes
SELECT STATUS, COUNT(*) FROM STUDENT_COURSE_ADVISOR_MARKSHEET GROUP BY STATUS;

-- Tokens per day, to compare with the monthly budget (multiply by the model's price)
SELECT DAY, SUM(IN_T) AS INPUT_TOKENS, SUM(OUT_T) AS OUTPUT_TOKENS FROM (
  SELECT DATE(CREATED_AT) DAY, INPUT_TOKENS IN_T, OUTPUT_TOKENS OUT_T FROM STUDENT_COURSE_ADVISOR_RECOMMENDATION
  UNION ALL SELECT DATE(CREATED_AT), INPUT_TOKENS, OUTPUT_TOKENS FROM STUDENT_COURSE_ADVISOR_MARKSHEET
  UNION ALL SELECT DATE(CREATED_AT), INPUT_TOKENS, OUTPUT_TOKENS FROM STUDENT_COURSE_ADVISOR_CHAT
) T GROUP BY DAY ORDER BY DAY DESC LIMIT 30;

-- Chat questions to review answer quality (latest 50)
SELECT CREATED_AT, QUESTION, LEFT(ANSWER, 300) AS ANSWER, RECOMMENDATION_ID FROM STUDENT_COURSE_ADVISOR_CHAT
ORDER BY ID DESC LIMIT 50;
```

`JSON_TABLE` needs MySQL 8 or MariaDB 10.6 or later.
