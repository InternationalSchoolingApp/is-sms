"use client";

import { useTranslations } from "next-intl";
import { CalendarIcon, ChartIcon, CheckBoxIcon, UpRightIcon } from "@/components/k5/pages/K5PerformanceIcons";
import { CountUp } from "@/components/motion/CountUp";

function Tile({ icon, bg, fg, label, value, children }) {
  return (
    <div className="k5h-r16 flex items-center gap-3.5 rounded-[22px] border-[3px] border-k5-line bg-k5-card px-[18px] py-4 shadow-[0_5px_0_var(--k5-line)]">
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
  const t = useTranslations("k5Performance");
  if (!tiles || !tiles.totalCourses) return null;
  const avg = tiles.avgScore;
  return (
    <section aria-label={t("title")} className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-3.5">
      <Tile icon={<ChartIcon size={22} />} bg="var(--k5-bT)" fg="var(--k5-bI)" label={t("stats.avgScore")} value={avg == null ? t("noScoreYet") : <><CountUp value={avg} decimals={1} />%</>}>
        {avg == null ? t("stats.nothingGraded") : t("stats.acrossCourses", { count: tiles.scoredCourses })}
      </Tile>
      <Tile icon={<CheckBoxIcon />} bg="var(--k5-gT)" fg="var(--k5-gI)" label={t("stats.submitted")} value={<CountUp value={tiles.submitted} />}>
        {t("stats.toGo", { count: tiles.toGo })}
      </Tile>
      <Tile icon={<UpRightIcon />} bg="var(--k5-vT)" fg="var(--k5-vI)" label={t("stats.coursesAhead")} value={t.rich("stats.aheadOf", { total: tiles.totalCourses, n: () => <CountUp value={tiles.ahead} /> })}>
        <span style={{ color: "var(--k5-bI)" }}>{t("stats.onTrack", { count: tiles.onTrack })}</span> · <span style={{ color: "var(--k5-red)" }}>{t("stats.behind", { count: tiles.behind })}</span>
      </Tile>
      <Tile icon={<CalendarIcon />} bg="var(--k5-tT)" fg="var(--k5-tI)" label={t("stats.daysLeft")} value={session ? <CountUp value={session.days} /> : "—"}>
        {session ? t("stats.ends", { date: session.endsTx }) : ""}
      </Tile>
    </section>
  );
}
