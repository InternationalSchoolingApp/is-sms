"use client";

import { useState } from "react";
import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { ParentProgressDetailModal } from "@/components/parent/performance/ParentProgressDetailModal";
import {
  clampProgress,
  dateValue,
  scoreRating,
  subjectColors,
  supportsDetailedView,
  teacherLabel,
} from "@/components/parent/performance/performanceHelpers";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useParentAcademicPerformance } from "@/hooks/parent/useParentAcademicPerformance";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import "@/components/parent/performance/performance.css";

const PAGE_SIZE = 10;

const svg = (paths, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);
const ICON_STAR = <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />;
const ICON_TREND = <path d="M3 17l6-6 4 4 8-8M15 7h6v6" />;
const ICON_FLAG = <path d="M5 21V4M5 4h11l-2 4 2 4H5" />;
const ICON_CAL = (
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>
);
const STAR_PATH = "M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z";

// The design's pace chip: background, label and whether the runner animates fast (ahead) or slow.
const PACE_CHIP = {
  Ahead: { label: "Ahead", background: "#E2F3E6", fast: true },
  OnTrack: { label: "On Track", background: "var(--act)" },
  Behind: { label: "Behind", background: "#FDE6E8" },
  GettingStarted: { label: "Get Started", background: "var(--act)" },
};

const Runner = ({ fast }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={fast ? "pmpA" : "pmpB"}>
    <circle cx="15.2" cy="4" r="2.5" fill="currentColor" stroke="none" />
    <path d="M14.2 7.4L12 13.4" />
    <g className="pmlg pmL1" style={{ transformOrigin: "12px 13.4px" }}>
      <path d="M12 13.4v7.2h1.8" />
    </g>
    <g className="pmlg pmL2" style={{ transformOrigin: "12px 13.4px" }}>
      <path d="M12 13.4v7.2h1.8" />
    </g>
    <g className="pmar pmA1" style={{ transformOrigin: "13.6px 9px" }}>
      <path d="M13.6 9v4.6" />
    </g>
    <g className="pmar pmA2" style={{ transformOrigin: "13.6px 9px" }}>
      <path d="M13.6 9v4.6" />
    </g>
  </svg>
);

const RING_RADIUS = 24.5;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

function CourseRow({ course, index, first, detailed, onOpen }) {
  const [strong, tint] = subjectColors(course.courseName, index);
  const score = parseFloat(course.score);
  const hasScore = !Number.isNaN(score);
  const rating = hasScore ? scoreRating(score, first) : null;
  const ring = clampProgress(detailed ? course.progressGradable : score);
  const pace = detailed ? PACE_CHIP[course.progressPace] : null;
  const pending = detailed && course.pendingAssignment != null && course.pendingAssignment !== "" ? course.pendingAssignment : null;
  const canOpen = detailed && course.lmsEnrollmentId && course.lmsCourseId;
  const teacher = teacherLabel(course);
  const sub = [teacher !== "N/A" ? teacher : null, course.endDate ? `Ends ${course.endDate}` : null, course.remainingDays ? `${course.remainingDays} days left` : null]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <>
      <span className="pmring">
        <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true" style={{ display: "block", transform: "rotate(-90deg)" }}>
          <circle cx="28" cy="28" r={RING_RADIUS} fill="none" strokeWidth="7" stroke={tint} />
          <circle cx="28" cy="28" r={RING_RADIUS} fill="none" strokeWidth="7" strokeLinecap="round" stroke={strong} strokeDasharray={`${((RING_LENGTH * ring) / 100).toFixed(1)} ${RING_LENGTH.toFixed(1)}`} />
        </svg>
        <b>{ring.toFixed(0)}%</b>
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span className="pmname">{course.courseName || "N/A"}</span>
        {sub && <span className="pv-sm">{sub}</span>}
      </span>
      <span className="pkscore">
        {rating ? (
          <>
            <span className="pkst" role="img" aria-label={`${rating.stars} of 5 stars`}>
              {[0, 1, 2, 3, 4].map((j) => (
                <svg key={j} width="15" height="15" viewBox="0 0 24 24" aria-hidden="true">
                  <path d={STAR_PATH} strokeWidth="1.4" strokeLinejoin="round" fill={j < rating.stars ? "#FFC531" : "#ECEEF2"} stroke={j < rating.stars ? "#C98A00" : "#ECEEF2"} />
                </svg>
              ))}
            </span>
            {rating.word && <b className="pkw">{rating.word}</b>}
            <small>
              score <span className="pku">{score.toFixed(2)}%</span>
            </small>
            {rating.tip && (
              <span className="pkbub" role="tooltip">
                {rating.tip}
                <i />
              </span>
            )}
          </>
        ) : (
          <small>score N/A</small>
        )}
      </span>
      <span className="pmchips">
        {pace && (
          <span className="pmst" style={{ background: pace.background }}>
            <Runner fast={pace.fast} />
            {pace.label}
          </span>
        )}
        {pending !== null && (
          <span className="pmst" style={{ background: "#FFF2CC" }}>
            {pending} pending
          </span>
        )}
      </span>
      <span className="pmgo">
        {canOpen && (
          <>
            View assignments
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </>
        )}
      </span>
    </>
  );

  const style = { borderInlineStartColor: strong, animationDelay: `${index * 0.05}s` };
  return canOpen ? (
    <button type="button" className="pmrow" style={style} onClick={onOpen}>
      {body}
    </button>
  ) : (
    <div className="pmrow pf-nogo" style={style}>
      {body}
    </div>
  );
}

function Footer({ page, total, onPageChange }) {
  const count = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total ? page * PAGE_SIZE + 1 : 0;
  const end = Math.min(total, (page + 1) * PAGE_SIZE);
  return (
    <div className="tc-ft">
      <p>{`Showing ${start} to ${end} of ${total} entries`}</p>
      <nav className="pg" aria-label="Pages">
        <button type="button" disabled={page === 0} onClick={() => onPageChange(Math.max(0, page - 1))}>
          Previous
        </button>
        {Array.from({ length: count }, (_, i) => (
          <button key={i} type="button" aria-current={i === page ? "page" : undefined} onClick={() => onPageChange(i)}>
            {i + 1}
          </button>
        ))}
        <button type="button" disabled={page >= count - 1} onClick={() => onPageChange(Math.min(count - 1, page + 1))}>
          Next
        </button>
      </nav>
    </div>
  );
}

/**
 * Academic Performance of the selected child — the parent's own page, legacy parentAcademicPerformance.js +
 * parentAcademicPerformanceContent.js ("Academic Performance" table). Pace / Pending / Progress columns and the
 * course detail only exist for Agilix Buzz providers; other providers show the empty state (not an error).
 */
function PerformanceBody() {
  const { context } = useDashboardContext();
  const { selectedChild } = useSelectedChild();
  const { isLoading, failed, sessionOut, courses, courseProviderId, childUserId, retry } = useParentAcademicPerformance();
  const [pageState, setPageState] = useState({ childId: null, page: 0 });
  const [selected, setSelected] = useState(null);
  // The page number belongs to one child: another child starts on page 1 (derived, no effect needed).
  const page = pageState.childId === childUserId ? pageState.page : 0;
  const setPage = (next) => setPageState({ childId: childUserId, page: next });

  const detailed = supportsDetailedView(courseProviderId);
  const first = String(selectedChild?.studentName ?? "").trim().split(/\s+/)[0] || "";
  const possessive = first ? `${first}\u2019s ` : "";
  const parentName = String(context?.userName ?? "").trim();

  const loading = !context || isLoading;
  const message = loading
    ? "Loading…"
    : sessionOut
      ? "Your session has expired. Redirecting to sign in…"
      : failed
        ? "Academic performance could not be loaded."
        : courses.length === 0
          ? "No academic performance found"
          : null;

  // Stat cards: only the numbers we really have.
  const scores = courses.map((c) => parseFloat(c.score)).filter((n) => !Number.isNaN(n));
  const average = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  const paced = detailed ? courses.filter((c) => PACE_CHIP[c.progressPace]) : [];
  const ahead = paced.filter((c) => c.progressPace === "Ahead").length;
  const onTrack = paced.filter((c) => c.progressPace === "OnTrack").length;
  const latest = courses
    .filter((c) => c.endDate && !Number.isNaN(dateValue(c.endDate)))
    .sort((a, b) => dateValue(b.endDate) - dateValue(a.endDate))[0];
  const daysLeft = latest ? parseInt(latest.remainingDays, 10) : NaN;
  const best = [...courses]
    .filter((c) => !Number.isNaN(parseFloat(c.score)) && c.courseName)
    .sort((a, b) => parseFloat(b.score) - parseFloat(a.score))
    .slice(0, 2)
    .map((c) => c.courseName);

  const visible = courses.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  return (
    <section className="sch on" aria-label="Academic performance">
      <div className="sc-hero">
        <div>
          <h2>{possessive}Academic Performance</h2>
          <p>{first ? `How ${first} is doing in each course.` : "How your child is doing in each course."}</p>
        </div>
      </div>

      {message ? (
        <div className="pv-card" style={{ marginTop: 16 }}>
          <p className="pv-empty">
            {message}
            {failed && !sessionOut && (
              <button type="button" onClick={retry} className="fbtn o" style={{ marginLeft: 12, height: 34 }}>
                Try again
              </button>
            )}
          </p>
        </div>
      ) : (
        <>
          {best.length > 0 && (
            <div className="pv-msg">
              <i>{svg(ICON_STAR, 26)}</i>
              <div>
                <b>{parentName ? `Hi ${parentName}, here is how ${first || "your child"} is doing.` : `Here is how ${first || "your child"} is doing.`}</b>
                <span>
                  {first || "Your child"} is doing best in {best.join(" & ")}. Keep cheering!
                </span>
              </div>
            </div>
          )}

          <div className="pv-stats">
            {average !== null && (
              <div className="pv-st">
                <div>
                  <small>Average score</small>
                  <b>{average.toFixed(1)}%</b>
                  <span className="d">across {scores.length} {scores.length === 1 ? "course" : "courses"}</span>
                </div>
                <i>{svg(ICON_TREND)}</i>
              </div>
            )}
            {paced.length > 0 && (
              <div className="pv-st">
                <div>
                  <small>Courses ahead</small>
                  <b>
                    {ahead} of {paced.length}
                  </b>
                  <span className="d">{onTrack} on track</span>
                </div>
                <i style={{ background: "#FFF2CC", color: "#B98200" }}>{svg(ICON_FLAG)}</i>
              </div>
            )}
            {!Number.isNaN(daysLeft) && (
              <div className="pv-st">
                <div>
                  <small>Days left</small>
                  <b>{Math.max(0, daysLeft)}</b>
                  <span className="d">Ends {latest.endDate}</span>
                </div>
                <i>{svg(ICON_CAL)}</i>
              </div>
            )}
          </div>

          <div className="pv-card" style={{ marginTop: 16 }}>
            <div className="pv-hd">
              <h3>{possessive}courses</h3>
              {detailed && (
                <span className="pv-sm" style={{ fontSize: 13 }}>
                  Click a course to see its assignments
                </span>
              )}
            </div>
            <div className="pv-rows">
              {visible.map((course, i) => (
                <CourseRow
                  key={course.lmsEnrollmentId || `${course.courseName}-${i}`}
                  course={course}
                  index={page * PAGE_SIZE + i}
                  first={first}
                  detailed={detailed}
                  onOpen={() => setSelected({ ...course, studentUserId: childUserId })}
                />
              ))}
            </div>
            {courses.length > PAGE_SIZE && <Footer page={page} total={courses.length} onPageChange={setPage} />}
          </div>
        </>
      )}

      {selected && selected.studentUserId === String(selectedChild?.userId) && (
        <ParentProgressDetailModal course={selected} onClose={() => setSelected(null)} />
      )}
    </section>
  );
}

export function ParentAcademicPerformance() {
  return (
    <ParentChildRequired>
      <PerformanceBody />
    </ParentChildRequired>
  );
}
