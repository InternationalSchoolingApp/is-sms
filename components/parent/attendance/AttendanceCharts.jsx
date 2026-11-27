"use client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
// Present / Late / Absent, in the design's colours. Early Leave stays hidden, as in the legacy widget (product decision).
// Every slice is also labelled with its name and count, so colour is never the only signal.
const SUMMARY = [
  { key: "classesAttended", label: "Present", color: "#13802B" },
  { key: "late", label: "Late", color: "#FFB020" },
  { key: "absent", label: "Absent", color: "#D21F4C" },
];
const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** Attendance % per month of `year` as the design's bars. A month with no class held is a grey stub, not 0%. */
export function MonthlyChart({ months, year, currentMonthIndex }) {
  const byLabel = Object.fromEntries(
    months.filter((m) => String(m?.monthKey ?? "").startsWith(String(year))).map((m) => [m.monthLabel, m]),
  );
  const values = MONTHS.map((label) => {
    const month = byLabel[label];
    return month && month.totalClassesHeld > 0 ? Number(month.attendancePercent) || 0 : null;
  });

  return (
    <>
      <div className="pv-bars at-bars12" role="img" aria-label={`Attendance per month of ${year}`}>
        {values.map((value, i) => {
          const month = byLabel[MONTHS[i]];
          const title = value === null ? `${MONTHS[i]} ${year}: no classes held` : `${MONTHS[i]} ${year}: ${month.attendedClasses ?? 0} of ${month.totalClassesHeld} classes attended`;
          return (
            <div
              key={MONTHS[i]}
              className={`pv-bar${value === null ? " no" : i === currentMonthIndex ? " cur" : ""}`}
              style={{ height: `${value === null ? 3 : value * 0.86}%` }}
              title={title}
            >
              {value !== null && <span>{value}%</span>}
            </div>
          );
        })}
      </div>
      <div className="pv-mon at-mon12">
        {MONTHS.map((label, i) => (
          <span key={label} className={values[i] === null ? "no" : undefined}>
            {label}
          </span>
        ))}
      </div>
    </>
  );
}

/** This month's Present / Late / Absent breakdown: the design's ring plus its legend. */
export function SummaryChart({ summary }) {
  const held = Number(summary.totalClassesHeldThisMonth) || 0;
  const counts = SUMMARY.map((s) => Number(summary[s.key]) || 0);
  const lengths = counts.map((count) => (held > 0 ? Math.min(CIRCUMFERENCE, (count / held) * CIRCUMFERENCE) : 0));
  const arcs = SUMMARY.map((s, i) => ({ ...s, length: lengths[i], offset: lengths.slice(0, i).reduce((a, b) => a + b, 0) }));

  return (
    <div className="pv-don">
      <svg width="130" height="130" viewBox="0 0 130 130" role="img" aria-label={`${held} classes held this month`}>
        <circle cx="65" cy="65" r={RADIUS} fill="none" stroke="#E2F3E6" strokeWidth="16" />
        {arcs.map(
          (arc) =>
            arc.length > 0 && (
              <circle
                key={arc.key}
                cx="65"
                cy="65"
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth="16"
                strokeDasharray={`${arc.length} ${CIRCUMFERENCE - arc.length}`}
                strokeDashoffset={-arc.offset}
                transform="rotate(-90 65 65)"
              />
            ),
        )}
        <text x="65" y="62" textAnchor="middle" fontSize="26" fontWeight="700" fill="#000">
          {held}
        </text>
        <text x="65" y="82" textAnchor="middle" fontSize="12" fill="#6B7280">
          classes
        </text>
      </svg>
      <div className="pv-leg">
        {SUMMARY.map((s, i) => (
          <div key={s.key}>
            <i style={{ background: s.color }} />
            {s.label}
            <b>{counts[i]}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
