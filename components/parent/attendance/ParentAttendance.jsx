"use client";

import { ParentChildRequired } from "@/components/parent/ParentChildRequired";
import { MonthlyChart, SummaryChart } from "@/components/parent/attendance/AttendanceCharts";
import { TodaySession } from "@/components/parent/attendance/TodaySession";
import { useParentAttendance } from "@/hooks/parent/useParentAttendance";
import { useSelectedChild } from "@/hooks/parent/useSelectedChild";
import { todayYmd } from "@/utils/attendanceDates";
import "@/components/parent/attendance/attendance.css";

const svg = (paths, size = 22) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);
const ICON_CAL = (
  <>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </>
);
const ICON_CHECK = <path d="M5 12.5l4.5 4.5L19 7.5" />;
const ICON_CLOCK = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </>
);

// A change vs last month, as the design's small pill. `goodWhenUp` decides whether a rise is good (green) or bad (red).
function Delta({ value, unit, goodWhenUp }) {
  const delta = Number(value) || 0;
  const good = goodWhenUp ? delta > 0 : delta < 0;
  const tone = delta === 0 || good ? undefined : { background: "#FDE6E8" };
  return (
    <em style={tone}>
      {delta === 0 ? "Same as last month" : `${delta > 0 ? "+" : ""}${delta}${unit} vs last month`}
    </em>
  );
}

function Hero({ title, subtitle }) {
  return (
    <div className="sc-hero">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  );
}

/**
 * Parent "Attendance" (pageLink parent-attendance), legacy attendaceByStudentId.js: the selected child's summary
 * cards, the year's monthly attendance chart, this month's Present / Late / Absent breakdown and today's session.
 * Switching child reloads everything. "Today" is the child's today.
 */
export function ParentAttendance() {
  return (
    <ParentChildRequired>
      <SelectedChildAttendance />
    </ParentChildRequired>
  );
}

function SelectedChildAttendance() {
  const { selectedChild } = useSelectedChild();
  const { isLoading, sessionOut, summary, months, timeZone, retry } = useParentAttendance();
  const today = todayYmd(timeZone);
  const year = Number(today.slice(0, 4));
  const monthIndex = Number(today.slice(5, 7)) - 1;
  const monthName = new Date(`${today.slice(0, 7)}-15T12:00:00Z`).toLocaleString("en-US", { month: "long", timeZone: "UTC" });
  const childName = String(selectedChild?.studentName ?? "").trim();
  const first = childName.split(/\s+/)[0] || "";
  const possessive = first ? `${first}’s` : "";
  const held = Number(summary?.totalClassesHeldThisMonth) || 0;
  const neverMissed = summary && held > 0 && !(Number(summary.absent) > 0) && !(Number(summary.late) > 0);

  return (
    <section className="sch on" aria-label="Attendance">
      <Hero title={`${possessive ? `${possessive} ` : ""}Attendance`} subtitle={first ? `See how many classes ${first} came to.` : "See how many classes your child came to."} />

      {isLoading ? (
        <div aria-busy="true">
          <div className="pv-stats">
            {[0, 1, 2].map((i) => (
              <div key={i} className="at-skel" style={{ height: 88, borderRadius: 20 }} />
            ))}
          </div>
          <div className="at-skel" style={{ height: 320, borderRadius: 24, marginTop: 16 }} />
        </div>
      ) : !summary ? (
        <div className="pv-card" style={{ marginTop: 16 }}>
          <p className="pv-empty">{sessionOut ? "Your session has expired. Please log in again." : "Attendance details not found"}</p>
          {!sessionOut && (
            <div style={{ textAlign: "center" }}>
              <button type="button" onClick={retry} className="fbtn p">
                Try again
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="pv-stats">
            <div className="pv-st">
              <div>
                <small>Classes Today</small>
                <b>{summary.classesToday ?? 0}</b>
              </div>
              <i>{svg(ICON_CAL)}</i>
            </div>
            <div className="pv-st">
              <div>
                <small>
                  Attendance · {monthName} {year}
                </small>
                <b>{summary.attendancePercentThisMonth ?? 0}%</b>
                <Delta value={summary.attendanceDeltaFromLastMonth} unit="%" goodWhenUp />
              </div>
              <i style={{ background: "#E2F3E6", color: "#13802B" }}>{svg(ICON_CHECK)}</i>
            </div>
            <div className="pv-st">
              <div>
                <small>
                  Late · {monthName} {year}
                </small>
                <b>{summary.latePercentThisMonth ?? 0}%</b>
                <Delta value={summary.lateDeltaFromLastMonth} unit=" classes" goodWhenUp={false} />
              </div>
              <i style={{ background: "#FFF2CC", color: "#B98200" }}>{svg(ICON_CLOCK)}</i>
            </div>
          </div>

          <div className="pv-2">
            <div className="pv-card">
              <h3>Attendance Overview</h3>
              <p className="sub">Every month of {year}.</p>
              <MonthlyChart months={months} year={year} currentMonthIndex={monthIndex} />
            </div>
            <div className="pv-card">
              <h3>Monthly Summary</h3>
              <p className="sub">
                {monthName} {year}
              </p>
              <SummaryChart summary={summary} />
              {neverMissed && (
                <div className="atbadge">
                  <svg width="64" height="78" viewBox="0 0 64 78" aria-hidden="true" className="atmedal">
                    <path d="M18 40 L10 74 L22 67 L28 77 L34 44 Z" fill="#E5243B" />
                    <path d="M46 40 L54 74 L42 67 L36 77 L30 44 Z" fill="#B81A2E" />
                    <circle cx="32" cy="30" r="27" fill="#FFC531" stroke="#C9930A" strokeWidth="4" />
                    <circle cx="32" cy="30" r="19" fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2" strokeDasharray="3 4" />
                    <path d="M32 16l4.1 8.4 9.2 1.3-6.7 6.5 1.6 9.2L32 37.1l-8.2 4.3 1.6-9.2-6.7-6.5 9.2-1.3z" fill="#FFFFFF" stroke="#C9930A" strokeWidth="1.6" strokeLinejoin="round" />
                  </svg>
                  <div className="atb-t">
                    <span className="atb-c">Attendance Star</span>
                    <b>{first ? `Super star! ${first} never missed a class.` : "Super star! Never missed a class."}</b>
                    <small>
                      {first ? `${first} came` : "Came"} to all {held} classes in {monthName}.
                    </small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <TodaySession />
    </section>
  );
}
