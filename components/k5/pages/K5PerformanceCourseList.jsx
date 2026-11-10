"use client";

import { K5_CARD } from "@/components/k5/home/k5Bits";
import { PERFECT_MSG, courseKey, courseTone, num, paceInfo, starLevel } from "@/components/k5/pages/k5PerformanceData";
import { ArrowRightIcon, PaceIcon, ProgressRing, StarSticker, Stars } from "@/components/k5/pages/K5PerformanceIcons";

export function salutation(gender) {
  const g = String(gender ?? "").trim().toLowerCase();
  if (g === "male") return "Mr.";
  if (g === "female") return "Ms.";
  return "";
}

export function teacherName(course) {
  const name = course.teacherName || "N/A";
  if (/^(Mr|Mrs|Ms|Miss|Dr)\.?\s/i.test(name)) return name;
  return [salutation(course.teacherGender), name].filter(Boolean).join(" ");
}

function CourseRow({ course, index, canOpen, onOpen, plain }) {
  const tone = courseTone(course, index);
  const scored = Boolean(course.hasScore);
  const score = num(course.score) ?? 0;
  const level = starLevel(score);
  const perfect = scored && score >= 100;
  const superstar = scored && level.stars === 5;
  const pace = paceInfo(course);
  const streak = course.streak || 0;

  return (
    <button
      type="button"
      onClick={canOpen ? onOpen : undefined}
      disabled={!canOpen}
      className="k5-pmrow relative box-border w-full cursor-pointer rounded-[20px] border-[3px] border-k5-line bg-k5-card px-[18px] py-3.5 text-start font-k5-body text-k5-ink disabled:cursor-default"
      style={{ borderInlineStartWidth: 8, borderInlineStartColor: tone.col }}
    >
      {superstar && !plain && (
        <span className="k5-pkcute pointer-events-none absolute -top-[22px] -end-3 h-[50px] w-[50px]" role="img" aria-label={perfect ? "Perfect 100!" : "Superstar!"}>
          <StarSticker />
        </span>
      )}
      <ProgressRing pct={num(course.progress) ?? 0} col={tone.col} lt={tone.lt} />
      <span className="flex min-w-0 flex-col">
        <span className="font-k5-display text-[19px] font-semibold text-k5-ink">{course.courseName || "N/A"}</span>
        <span className="text-sm font-extrabold text-k5-mut">{teacherName(course)}</span>
      </span>
      <span className="k5-pkscore relative flex flex-col">
        {plain ? (
          <>
            <b className="font-k5-display text-base font-semibold" style={{ color: scored ? "var(--k5-ink)" : "var(--k5-mut)" }}>
              {scored ? `${score.toFixed(2)}%` : "No score yet"}
            </b>
            <small className="text-[13px] font-extrabold text-k5-mut">{scored && course.grade ? `Score · Grade ${course.grade}` : "Score"}</small>
          </>
        ) : (
          <Stars n={scored ? level.stars : 0} size={16} gap={1} />
        )}
        {plain ? null : scored ? (
          <>
            <b className="font-k5-display text-base font-semibold" style={{ color: level.fg }}>{level.label}!</b>
            <small className="text-[13px] font-extrabold text-k5-mut">
              score <span className="underline decoration-dotted underline-offset-[3px]">{score.toFixed(2)}%</span>
            </small>
            <span
              role="tooltip"
              className="k5-pkbub absolute bottom-[calc(100%+10px)] left-1/2 z-[5] w-[230px] whitespace-normal rounded-2xl border-[3px] px-3.5 py-2.5 text-center font-k5-display text-base font-semibold leading-snug shadow-[0_5px_0_rgba(28,38,64,0.15)]"
              style={{ background: level.bg, color: level.fg, borderColor: level.acc }}
            >
              {perfect ? PERFECT_MSG : level.msg}
              <span
                aria-hidden="true"
                className="absolute -bottom-[9px] left-1/2 -ml-[7px] h-3.5 w-3.5 rotate-45 border-b-[3px] border-r-[3px]"
                style={{ background: level.bg, borderColor: level.acc }}
              />
            </span>
          </>
        ) : (
          <>
            <b className="font-k5-display text-base font-semibold text-k5-mut">No score yet</b>
            <small className="text-[13px] font-extrabold text-k5-mut">score —</small>
          </>
        )}
      </span>
      <span className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full py-[3px] pe-3 ps-2 text-[13px] font-black" style={{ background: pace.bg, color: pace.fg }}>
          <PaceIcon pace={pace.key} />
          {pace.label}
        </span>
        {streak > 0 && (
          <span className="inline-flex items-center whitespace-nowrap rounded-full py-[3px] pe-3 ps-2 text-[13px] font-black" style={{ background: "var(--k5-oT)", color: "var(--k5-oI)" }}>
            {streak} on time
          </span>
        )}
      </span>
      {canOpen && (
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[15px] font-black text-k5-acx">
          View assignments
          <ArrowRightIcon />
        </span>
      )}
    </button>
  );
}

/** Mockup "My courses": one row per course; a row opens that course's assignments (the course view). */
export function K5PerformanceCourseList({ courses, detailed, onOpen, plain = false }) {
  return (
    <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">My courses</h2>
        {courses.length > 0 && detailed && (
          <span className="k5-pmaside ms-auto inline-flex items-center gap-1.5 text-sm font-extrabold text-k5-mut">Click a course to see its assignments</span>
        )}
      </div>
      {!courses.length ? (
        <div className="py-6 text-center">
          <p className="m-0 font-k5-display text-lg font-semibold text-k5-mut">No academic performance found</p>
          <p className="m-0 mt-2 text-sm font-extrabold text-k5-mut">Your courses will appear here after the next daily update.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-7 pt-3.5">
          {courses.map((course, i) => (
            <CourseRow key={courseKey(course)} course={course} index={i} canOpen={Boolean(detailed && course.lmsEnrollmentId)} onOpen={() => onOpen(course, i)} plain={plain} />
          ))}
        </div>
      )}
    </section>
  );
}
