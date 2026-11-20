"use client";

import { useTranslations } from "next-intl";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { STAR_LEVELS, starLevel } from "@/components/k5/pages/k5PerformanceData";
import { ArrowUpIcon, Stars } from "@/components/k5/pages/K5PerformanceIcons";

/** Mockup "My Score": the average as stars and a word, the star ladder with "You are here", and the next step. */
export function K5PerformanceScoreCard({ avg }) {
  const t = useTranslations("k5Performance");
  const head = (
    <div>
      <h2 id="k5-pf-score" className="m-0 font-k5-display text-2xl font-semibold leading-tight">{t("score.title")}</h2>
      <p className="m-0 text-[15px] font-extrabold leading-snug text-k5-mut">{t("score.subtitle")}</p>
    </div>
  );
  if (avg == null) {
    return (
      <section aria-labelledby="k5-pf-score" className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
        {head}
        <p className="m-0 text-[15px] font-extrabold text-k5-mut">{t("score.empty")}</p>
      </section>
    );
  }
  const level = starLevel(avg);
  const up = STAR_LEVELS[STAR_LEVELS.indexOf(level) - 1];
  return (
    <section aria-labelledby="k5-pf-score" className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
      {head}
      <div className="flex flex-wrap items-center gap-4 rounded-[20px] px-4 py-3.5" style={{ background: level.bg }}>
        <span className="k5-pkbig">
          <Stars n={level.stars} size={34} gap={4} />
        </span>
        <span className="flex min-w-0 flex-col" style={{ color: level.fg }}>
          <b className="font-k5-display text-[30px] font-semibold leading-tight">{t("score.levelExclaim", { label: t(`stars.${level.id}.label`) })}</b>
          <span className="text-[15px] font-black">{t("score.average", { avg: avg.toFixed(1) })}</span>
        </span>
      </div>
      <ul aria-label={t("score.levels")} className="m-0 flex list-none flex-col gap-1.5 p-0">
        {STAR_LEVELS.map((l) => {
          const on = l === level;
          return (
            <li
              key={l.label}
              className="flex min-h-10 items-center gap-3 rounded-[14px] border-[3px] px-3 py-1"
              style={{ background: on ? l.bg : "transparent", borderColor: on ? l.acc : "transparent" }}
            >
              <Stars n={l.stars} size={18} />
              <b className="min-w-0 flex-1 font-k5-display text-base font-semibold" style={{ color: on ? l.fg : "var(--k5-ink)" }}>
                {t(`stars.${l.id}.label`)}
              </b>
              {on && (
                <span className="whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-black text-white" style={{ background: l.fg }}>
                  {t("score.youAreHere")}
                </span>
              )}
              <span className="whitespace-nowrap text-sm font-black text-k5-mut">{t(`stars.${l.id}.range`)}</span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 flex items-center gap-2.5 rounded-2xl bg-k5-act px-3.5 py-2.5 text-base font-black leading-snug text-k5-acx">
        <ArrowUpIcon />
        {up ? t("score.next", { min: up.min, label: t(`stars.${up.id}.label`), more: (up.min - avg).toFixed(1) }) : t("score.top")}
      </p>
    </section>
  );
}
