"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { Medal } from "@/components/k5/pages/K5PerformanceIcons";
import { use3D } from "@/components/three/use3D";

// Earned medals as 3D coins (three.js) only when 3D is allowed; locked medals, High and everyone else keep the 2D medal.
const Medal3D = dynamic(() => import("@/components/three/Medal3D"), { ssr: false, loading: () => null });

/** Mockup "Achievements" (.pmbadges): earned medals (kept for good, with their date) and locked ones. */
export function K5PerformanceAchievements({ badges }) {
  const three = use3D();
  // Hovering an earned medal spins its 3D coin once (each hover bumps that medal's key).
  const [spins, setSpins] = useState({});
  return (
    <section className={`${K5_CARD} flex flex-col gap-3.5 px-[22px] py-5`}>
      <h2 className="m-0 font-k5-display text-2xl font-semibold leading-tight">Achievements</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(190px,1fr))] gap-3">
        {badges.map((b) => {
          const coin = three.enabled && b.earned;
          return (
            <div
              key={b.id}
              onPointerEnter={coin ? () => setSpins((s) => ({ ...s, [b.id]: (s[b.id] || 0) + 1 })) : undefined}
              className={`flex items-center gap-3 rounded-[18px] border-[3px] px-3.5 py-3 ${b.earned ? "k5-pmearned" : ""}`}
              style={b.earned ? { background: b.medal.bg, borderColor: b.medal.bg } : { background: "var(--k5-soft)", borderColor: "var(--k5-line)", borderStyle: "dashed" }}
            >
              <span className="k5-pmbi flex h-[62px] w-14 flex-none items-center justify-center" data-motion-3d={coin ? "medal" : undefined}>
                {coin ? <Medal3D medal={b.medal} band={three.band} spinKey={spins[b.id] || 0} /> : <Medal medal={b.medal} earned={b.earned} />}
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
          );
        })}
      </div>
    </section>
  );
}
