"use client";

import { CalendarIcon, ChartIcon, CheckBoxIcon, UpRightIcon } from "@/components/k5/pages/K5PerformanceIcons";

function Tile({ icon, bg, fg, label, value, children }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[22px] border-[3px] border-k5-line bg-k5-card px-[18px] py-4 shadow-[0_5px_0_var(--k5-line)]">
      <span className="flex h-[50px] w-[50px] flex-none items-center justify-center rounded-2xl" style={{ background: bg, color: fg }}>
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <small className="text-sm font-extrabold text-k5-mut">{label}</small>
        <b className="font-k5-display text-[26px] font-semibold leading-tight">{value}</b>
        <span className="text-[13px] font-black text-k5-mut">{children}</span>
      </span>
    </div>
  );
}

/** Mockup .pmtiles: average score, assignments submitted, courses ahead, days left (Performance tab tiles). */
export function K5PerformanceStats({ tiles, session }) {
  if (!tiles || !tiles.totalCourses) return null;
  const avg = tiles.avgScore;
  return (
    <section aria-label="My Performance" className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
      <Tile icon={<ChartIcon size={22} />} bg="var(--k5-bT)" fg="var(--k5-bI)" label="Average score" value={avg == null ? "No score yet" : `${Number(avg).toFixed(1)}%`}>
        {avg == null ? "nothing graded yet" : `across ${tiles.scoredCourses} course${tiles.scoredCourses === 1 ? "" : "s"}`}
      </Tile>
      <Tile icon={<CheckBoxIcon />} bg="var(--k5-gT)" fg="var(--k5-gI)" label="Assignments submitted" value={tiles.submitted}>
        {`${tiles.toGo} still to go`}
      </Tile>
      <Tile icon={<UpRightIcon />} bg="var(--k5-vT)" fg="var(--k5-vI)" label="Courses ahead" value={`${tiles.ahead} of ${tiles.totalCourses}`}>
        <span style={{ color: "var(--k5-bI)" }}>{tiles.onTrack} on track</span> · <span style={{ color: "var(--k5-red)" }}>{tiles.behind} behind</span>
      </Tile>
      <Tile icon={<CalendarIcon />} bg="var(--k5-tT)" fg="var(--k5-tI)" label="Days left" value={session ? session.days : "—"}>
        {session ? `Ends ${session.endsTx}` : ""}
      </Tile>
    </section>
  );
}
