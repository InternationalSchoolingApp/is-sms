"use client";

import { K5_CARD } from "@/components/k5/home/k5Bits";
import { Medal } from "@/components/k5/pages/K5PerformanceIcons";

/** Mockup "Achievements" (.pmbadges): earned medals (kept for good, with their date) and locked ones. */
export function K5PerformanceAchievements({ badges }) {
  return (
    <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
      <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">Achievements</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        {badges.map((b) => (
          <div
            key={b.id}
            className={`flex items-center gap-3 rounded-[18px] border-[3px] px-3.5 py-3 ${b.earned ? "k5-pmearned" : ""}`}
            style={b.earned ? { background: b.medal.bg, borderColor: b.medal.bg } : { background: "var(--k5-soft)", borderColor: "var(--k5-line)", borderStyle: "dashed" }}
          >
            <span className="k5-pmbi flex h-[62px] w-14 flex-none items-center justify-center">
              <Medal medal={b.medal} earned={b.earned} />
            </span>
            <span className="min-w-0">
              <b className="block font-k5-display text-base font-semibold" style={b.earned ? { color: b.medal.fg } : undefined}>
                {b.name}
              </b>
              <small className="text-[13px] font-extrabold" style={{ color: b.earned ? b.medal.fg : "var(--k5-mut)" }}>
                {b.desc}
              </small>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
