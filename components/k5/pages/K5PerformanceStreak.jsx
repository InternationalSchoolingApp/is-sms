"use client";

import { useTranslations } from "next-intl";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { CountUp } from "@/components/motion/CountUp";
import { STREAK_BADGES } from "@/components/k5/pages/k5PerformanceData";
import { ArrowUpIcon, Flame } from "@/components/k5/pages/K5PerformanceIcons";

const ORANGE = "#F28C28";

/** Mockup "My Streak": the best current on-time run across courses and a flame trail to the next badge. */
export function K5PerformanceStreak({ courses }) {
  const top = courses.reduce((a, c) => ((c.streak || 0) > (a?.streak ?? 0) ? c : a), null);
  const best = top?.streak ?? 0;
  const next = STREAK_BADGES.find((b) => best < b.need);
  const goal = next ? next.need : best;
  const left = next ? next.need - best : 0;
  const t = useTranslations("k5Performance");
  const nextMsg = next ? t("streak.next", { count: left, badge: t(`streak.badges.${next.id}`) }) : t("streak.allEarned");

  return (
    <section aria-labelledby="k5-pf-streak" className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
      <div>
        <h2 id="k5-pf-streak" className="m-0 font-k5-display text-2xl font-semibold leading-tight">{t("streak.title")}</h2>
        <p className="m-0 text-[15px] font-extrabold leading-snug text-k5-mut">{t("streak.subtitle")}</p>
      </div>

        <>
          <div className="flex items-center gap-4 rounded-[20px] px-[18px] py-4" style={{ background: best ? "var(--k5-oT)" : "var(--k5-soft)" }}>
            <span className="relative h-[84px] w-[84px] flex-none">
              <Flame size={84} className="k5-pkflame" outer={best ? ORANGE : "#C3CBD6"} inner={best ? "#FFD27A" : "#E3E7EE"} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5" style={{ color: best ? "var(--k5-oI)" : "var(--k5-mut)" }}>
              <b className="font-k5-display text-2xl font-semibold leading-tight">
                {best === 0 ? t("streak.none") : best === 1 ? t("streak.one") : t.rich("streak.many", { n: () => <CountUp value={best} /> })}
              </b>
              <span className="text-[15px] font-black">
                {best ? t("streak.bestIn", { course: top.courseName }) : t("streak.startHint")}
              </span>
            </span>
          </div>

          {goal > 0 && (
            <ol aria-label={nextMsg} className="m-0 flex list-none flex-wrap gap-2 p-0">
              {Array.from({ length: goal }, (_, i) => {
                const on = i < best;
                return (
                  <li
                    key={i}
                    aria-hidden="true"
                    className="box-border flex h-[38px] w-[38px] items-center justify-center rounded-full border-[3px] font-k5-display text-[15px] font-semibold text-k5-mut"
                    style={{ background: on ? ORANGE : "var(--k5-card)", borderColor: on ? ORANGE : "var(--k5-line)", borderStyle: on ? "solid" : "dashed" }}
                  >
                    {on ? <Flame size={20} outer="#FFFFFF" /> : i + 1}
                  </li>
                );
              })}
            </ol>
          )}

          <p className="m-0 flex items-center gap-2.5 rounded-2xl bg-k5-act px-3.5 py-2.5 text-base font-black leading-snug text-k5-acx">
            <ArrowUpIcon />
            {nextMsg}
          </p>
        </>
    </section>
  );
}
