"use client";

import { Download } from "lucide-react";
import { OptimizedImage } from "@/components/common/OptimizedImage";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";

const STAR_PATH = "M10 1l2.6 5.4 5.9.8-4.3 4.1 1 5.9L10 14.4 4.8 17.2l1-5.9L1.5 7.2l5.9-.8z";
// Twinkling stars around the book (mockup .hbstar): position, size, colour, delay.
const STARS = [
  { size: 28, fill: "#FFC531", pos: "left-[6%] top-[12%]", delay: "0s" },
  { size: 20, fill: "#7CCBFF", pos: "right-[10%] top-[8%]", delay: "0.6s" },
  { size: 24, fill: "#FF9EB5", pos: "right-[6%] bottom-[22%]", delay: "1.2s" },
  { size: 18, fill: "#9BE15D", pos: "left-[12%] bottom-[16%]", delay: "0.9s" },
];

const DOWNLOAD_CLASS =
  "flex min-h-[58px] items-center gap-2.5 self-start rounded-full border-none bg-k5-ac px-7 font-k5-display text-xl font-semibold text-white no-underline shadow-[0_5px_0_var(--k5-acd)] max-[760px]:w-full max-[760px]:justify-center";

/**
 * K–5 look of Student Handbook (mockup Student Handbook): the floating book on a soft stage, the school
 * chip, the title, the download button and the yellow note. The handbook file, the cover and the policies
 * link are the ones the existing page uses.
 */
export function K5Handbook({ title, schoolName, loading, canView, filePath, policyLink, coverImage }) {
  usePicoContentReady(!loading);

  return (
    <div className="flex flex-col gap-4">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-vt">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke: "var(--k5-vI)" }}>
            <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
            <path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5" />
            <path d="M9 8h7M9 11.5h5" />
          </svg>
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">{title}</h1>
          <p className="m-0 text-lg font-extrabold text-k5-mut">Everything about your school, in one book.</p>
        </div>
      </div>

      {loading ? (
        <p className="m-0 py-8 text-center font-k5-display text-2xl font-semibold text-k5-mut">Loading…</p>
      ) : !canView ? (
        <div className={`${K5_CARD} p-8 text-center font-k5-display text-2xl font-semibold text-k5-mut`}>You do not have access to this module.</div>
      ) : (
        <section aria-labelledby="k5-hb" className={`${K5_CARD} grid grid-cols-2 items-center gap-[30px] overflow-hidden p-[26px] max-[900px]:grid-cols-1 max-[760px]:gap-[18px] max-[760px]:p-3.5`}>
          <div className="relative box-border flex min-h-[460px] items-center justify-center rounded-3xl bg-[radial-gradient(circle_at_50%_40%,var(--k5-act)_0%,var(--k5-soft)_70%)] px-5 pb-[46px] pt-[30px] max-[760px]:min-h-[360px]">
            {STARS.map((s, i) => (
              <svg key={i} className={`k5-hbstar absolute ${s.pos}`} width={s.size} height={s.size} viewBox="0 0 20 20" aria-hidden="true" style={{ animationDelay: s.delay }}>
                <path d={STAR_PATH} fill={s.fill} stroke="#1C2640" strokeWidth="1.2" />
              </svg>
            ))}
            <div className="k5-hbbook relative aspect-[560/724] w-[270px] max-w-[72%] [perspective:1200px]">
              <span
                aria-hidden="true"
                className="absolute -bottom-2 -right-2.5 left-1.5 top-2 rounded-l-md rounded-r-[14px] shadow-[0_18px_30px_rgba(10,16,34,0.25)]"
                style={{ background: "repeating-linear-gradient(to bottom, #FFFFFF 0 3px, #E3E8F0 3px 4px)" }}
              />
              <div className="k5-hbcover absolute inset-0 overflow-hidden rounded-l-[4px] rounded-r-xl shadow-[inset_10px_0_12px_-6px_rgba(0,0,0,0.35),0_6px_0_rgba(10,16,34,0.12)] [transform-origin:0%_50%]">
                <OptimizedImage src={coverImage} alt="Student Handbook cover: A perfect combination of flexibility and accountability" width={560} height={724} sizes="270px" className="block h-full w-full object-cover" />
                <span aria-hidden="true" className="absolute inset-y-0 left-0 w-3.5" style={{ background: "linear-gradient(to right, rgba(0,0,0,0.28), rgba(255,255,255,0.25) 60%, rgba(0,0,0,0.05))" }} />
                <span
                  aria-hidden="true"
                  className="k5-hbshine absolute inset-0"
                  style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.45) 45%, transparent 60%)", backgroundSize: "250% 100%" }}
                />
              </div>
            </div>
            <span aria-hidden="true" className="absolute bottom-[22px] left-1/2 h-4 w-[62%] -translate-x-1/2 rounded-[50%] bg-[rgba(10,16,34,0.16)] blur-[4px]" />
          </div>

          <div className="flex min-w-0 flex-col gap-[18px]">
            {schoolName && <span className="self-start rounded-full bg-k5-vt px-3.5 py-1 text-sm font-black text-k5-vi">{schoolName}</span>}
            <h2 id="k5-hb" className="m-0 font-k5-display text-[34px] font-semibold leading-[1.1] max-[760px]:text-[28px]">{title}</h2>
            <p className="m-0 text-lg font-extrabold leading-[1.45] text-k5-mut">Your school&apos;s own book. It tells you how your school works and what to expect.</p>
            {filePath ? (
              <a href={filePath} target="_blank" rel="noreferrer" className={DOWNLOAD_CLASS}>
                <Download className="h-[22px] w-[22px]" strokeWidth={2.8} aria-hidden="true" />
                Download Handbook
              </a>
            ) : (
              <button type="button" disabled aria-disabled="true" className={`${DOWNLOAD_CLASS} cursor-not-allowed opacity-60`}>
                <Download className="h-[22px] w-[22px]" strokeWidth={2.8} aria-hidden="true" />
                Download Handbook
              </button>
            )}
            <div role="note" className="flex gap-3 rounded-[18px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3.5">
              <span aria-hidden="true" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#FFC531] font-k5-display text-lg font-bold text-[#3A2A00]">i</span>
              <p className="m-0 text-base font-extrabold leading-[1.45]">
                It is the responsibility of the student and the parent to keep a check on the updated terms and policies of the school.{" "}
                {policyLink ? (
                  <a href={policyLink} target="_blank" rel="noreferrer" className="font-black text-k5-acx underline">
                    Click Here to know more.
                  </a>
                ) : (
                  <span className="font-black text-k5-acx">Click Here to know more.</span>
                )}
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
