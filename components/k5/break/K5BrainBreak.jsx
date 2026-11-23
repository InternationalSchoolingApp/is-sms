"use client";

import { useCallback } from "react";
import { Check, Play } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useK5ThemeProps } from "@/components/k5/useK5ThemeProps";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { BREAK_WALK, useBrainBreak } from "@/components/k5/break/useBrainBreak";

/**
 * "Brain break time" (mockups: the brk dialog of Playful / Middle / High): after an hour on the dashboard the buddy asks the student
 * to walk for 10 minutes and drink a glass of water. Three steps: ask -> walk (10 minute ring) -> done. Mounted once by K5Shell; the
 * trigger, the "remind me in 5 minutes" and the timer live in useBrainBreak. The buddy says each step in the student's chosen voice.
 */
export function K5BrainBreak({ firstName }) {
  const { speak, stop } = useSpeech();
  const { preferences } = useAppearance();
  const name = firstName || "friend";
  const onSay = useCallback(
    (kind) => {
      if (kind === "stop") return stop();
      if (preferences.buddyEnabled === "off") return undefined;
      const lines = {
        ask: `Wow, ${name}! You learned for one whole hour. Time for a brain break! Walk for 10 minutes and drink a glass of water.`,
        walk: "Let's go! I will count 10 minutes for you.",
        done: "Super job! Your body says thank you.",
      };
      return speak(lines[kind]);
    },
    [speak, stop, preferences.buddyEnabled, name],
  );
  const brk = useBrainBreak({ onSay });
  return <BreakDialog brk={brk} name={name} />;
}

function Footprints({ count, size, gap, step }) {
  return (
    <div className="flex items-start" style={{ gap }} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <svg
          key={i}
          width={size}
          height={Math.round((size * 22) / 16)}
          viewBox="0 0 20 28"
          aria-hidden="true"
          className="k5-brk-fp"
          style={{ animationDelay: `${i * step}s`, transform: i % 2 ? "translateY(8px) rotate(14deg)" : "rotate(-14deg)" }}
        >
          <ellipse cx="10" cy="17" rx="7" ry="10" className="fill-k5-gi" />
          <circle cx="5" cy="4" r="2.6" className="fill-k5-gi" />
          <circle cx="10" cy="2.6" r="2.6" className="fill-k5-gi" />
          <circle cx="15" cy="4" r="2.6" className="fill-k5-gi" />
        </svg>
      ))}
    </div>
  );
}

function Glass({ full, big }) {
  const [w, h, face] = big ? [70, 92, [35, 22]] : [40, 54, [20, 12]];
  return (
    <div className="relative flex-none overflow-hidden rounded-b-[20px] border-4 border-t-0 border-k5-ink bg-k5-card" style={{ width: w, height: h }}>
      <div className="k5-brk-water absolute inset-x-0 bottom-0 bg-gradient-to-b from-[#7CCBFF] to-[#3A9BEA]" style={{ height: full ? "84%" : "16%" }} />
      <span className="k5-brk-bub absolute bottom-1.5 left-[22%] block h-2 w-2 rounded-full bg-white/85" />
      <span className="k5-brk-bub absolute bottom-1.5 left-[62%] block h-1.5 w-1.5 rounded-full bg-white/85 [animation-delay:1.1s]" />
      <svg width={face[0]} height={face[1]} viewBox="0 0 40 26" aria-hidden="true" className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2">
        <circle cx="11" cy="8" r="3.4" fill="#1C2640" />
        <circle cx="29" cy="8" r="3.4" fill="#1C2640" />
        <circle cx="6" cy="15" r="3" fill="#FF9EB5" />
        <circle cx="34" cy="15" r="3" fill="#FF9EB5" />
        <path d="M14 15q6 7 12 0" fill="none" stroke="#1C2640" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Shoe() {
  return (
    <svg width="120" height="74" viewBox="0 0 120 74" aria-hidden="true" className="k5-brk-shoe">
      <path d="M14 54V26q0-8 8-8h16l12 14q18 4 32 8q24 6 28 14z" className="fill-k5-gi" />
      <path d="M14 54h96" className="stroke-k5-ink" strokeWidth="3" />
      <path d="M8 54h104a6 6 0 0 1 0 12H14a6 6 0 0 1-6-6z" fill="#FFFFFF" className="stroke-k5-ink" strokeWidth="3" strokeLinejoin="round" />
      <path d="M14 54V26q0-8 8-8h16l12 14q18 4 32 8q24 6 28 14" fill="none" className="stroke-k5-ink" strokeWidth="3" strokeLinejoin="round" />
      <path d="M44 30l8-4M52 36l8-4M60 40l8-4" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" />
      <circle cx="26" cy="36" r="5" fill="#FFC531" />
    </svg>
  );
}

function Star({ size, fill, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className={`k5-brk-star absolute ${className}`}>
      <path d="M12 2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17l-6 3.3 1.3-6.7-5-4.6 6.8-.8z" fill={fill} stroke="#1C2640" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function Cloud({ className }) {
  return (
    <svg viewBox="0 0 90 40" aria-hidden="true" className={`k5-brk-cloud absolute ${className}`}>
      <path d="M20 34h52a14 14 0 0 0 0-28a18 18 0 0 0-32 2a12 12 0 0 0-20 26z" fill="#FFFFFF" />
    </svg>
  );
}

function Tick() {
  return <Check className="h-5 w-5 text-k5-gx" strokeWidth={3.2} aria-hidden="true" />;
}

function BreakDialog({ brk, name }) {
  const { isMiddle, isHigh } = useDashboardContext();
  const { preferences } = useAppearance();
  const mid = isMiddle || isHigh;
  const { phase, walkLeft, water, startWalk, drinkWater, snooze, back, end } = brk;
  const themeProps = useK5ThemeProps(
    `max-h-[calc(100vh-32px)] gap-0 overflow-y-auto rounded-[2.125rem] bg-k5-card p-0 text-k5-ink ring-0 sm:max-w-[620px] ${
      mid ? "border-[1.5px] border-k5-ink shadow-[0_18px_44px_rgba(23,27,46,.18)]" : "border-[3px] border-k5-ink shadow-[0_8px_0_var(--k5-ink)]"
    }`,
  );
  const title = phase === "walk" ? "Walking time!" : phase === "done" ? "Super job!" : "Brain break time!";
  const clock = `${Math.floor(walkLeft / 60)}:${String(walkLeft % 60).padStart(2, "0")}`;
  // Same look rules as the mockups: Playful has 3px borders + a hard 5px button shadow; Middle a 1.5px border and 2px; High none.
  const dash = mid ? "border-[1.5px] rounded-[1.125rem]" : "border-[3px] rounded-[26px]";
  const btnShadow = isHigh ? "" : mid ? "shadow-[0_2px_0_var(--k5-grnD)]" : "shadow-[0_5px_0_var(--k5-grnD)]";
  const btnShadowBig = isHigh ? "" : mid ? "shadow-[0_2px_0_var(--k5-grnD)]" : "shadow-[0_6px_0_var(--k5-grnD)]";
  const btnShadowYellow = isHigh ? "" : mid ? "shadow-[0_2px_0_#C9930A]" : "shadow-[0_5px_0_#C9930A]";
  const rowH = isHigh ? "min-h-[45px]" : "min-h-[52px]";
  const outline = `${mid ? "border-[1.5px]" : "border-[3px]"} ${rowH} cursor-pointer rounded-full border-k5-bi bg-k5-card px-[18px] font-k5-display text-lg font-semibold text-k5-ink`;
  const waterDone = `inline-flex ${rowH} items-center justify-center gap-2 rounded-full bg-k5-gt px-[18px] font-k5-display text-lg font-semibold text-k5-ink`;
  const buddy = (width, walking) => <PicoMascot buddy={preferences.buddy} width={width} full={false} walking={walking} />;
  return (
    <Dialog open={phase !== null} onOpenChange={() => {}} disablePointerDismissal>
      <DialogContent showCloseButton={false} data-brain-break="" {...themeProps} className={`${themeProps.className} z-[80]`} overlayClassName="z-[75] bg-[rgba(10,16,34,0.6)]">
        <div className="relative flex flex-col items-center gap-2.5 overflow-hidden rounded-t-[inherit] bg-k5-bt px-6 pb-[18px] pt-[22px] text-center max-[480px]:px-4">
          <Cloud className="left-3.5 top-3.5 h-10 w-[90px] opacity-90" />
          <Cloud className="right-[18px] top-[38px] h-8 w-[70px] opacity-80 [animation-delay:2s]" />
          {phase === "ask" && (
            <span className={`relative inline-flex items-center gap-2 rounded-full border-k5-ink bg-k5-card py-1.5 pl-2 pr-4 text-[15px] font-black ${mid ? "border-[1.5px]" : "border-[3px]"}`}>
              <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true" className="k5-brk-clock">
                <circle cx="9" cy="6" r="4" fill="#FFC531" stroke="#1C2640" strokeWidth="2" />
                <circle cx="23" cy="6" r="4" fill="#FFC531" stroke="#1C2640" strokeWidth="2" />
                <circle cx="16" cy="18" r="11" fill="#FF7A93" stroke="#1C2640" strokeWidth="2.4" />
                <circle cx="16" cy="18" r="7.5" fill="#FFFFFF" />
                <path d="M16 13v5l3 2" fill="none" stroke="#1C2640" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
              1 hour on screen
            </span>
          )}
          <DialogTitle className="relative m-0 font-k5-display text-[34px] font-semibold leading-[1.1] max-[480px]:text-[28px]">{title}</DialogTitle>
        </div>

        {phase === "ask" && (
          <div className="flex flex-col gap-[18px] px-6 pb-[22px] pt-5 max-[480px]:px-4">
            <div className="flex items-center gap-3.5">
              <span className="flex-none">{buddy(72, false)}</span>
              <div className={`relative flex-1 bg-k5-vt px-4 py-3 ${mid ? "rounded-[0.875rem]" : "rounded-[1.25rem]"}`}>
                <span aria-hidden="true" className="absolute -start-2 top-1/2 -mt-2 block h-4 w-4 rotate-45 bg-k5-vt" />
                <p className="relative m-0 font-k5-display text-[19px] font-medium leading-[1.3] max-[480px]:text-[17px]">
                  Wow, {name}! You learned for 1 whole hour. Let&rsquo;s rest your eyes and wiggle your legs!
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-3.5">
              <div className={`flex flex-col items-center gap-2 border-dashed border-k5-gi bg-k5-gt p-4 text-center ${dash}`}>
                <div className="flex h-24 flex-col items-center justify-end gap-1">
                  <Shoe />
                  <Footprints count={4} size={14} gap={10} step={0.4} />
                </div>
                <h3 className="m-0 font-k5-display text-2xl font-semibold leading-[1.1]">Walk 10 minutes</h3>
                <p className="m-0 text-[15px] font-extrabold text-k5-mut">Stretch, march, look far away</p>
                <button type="button" onClick={startWalk} className={`mt-auto flex min-h-14 cursor-pointer items-center justify-center gap-2.5 self-stretch rounded-full border-0 bg-k5-grn font-k5-display text-xl font-semibold text-white ${btnShadow}`}>
                  <Play className="h-[22px] w-[22px] fill-white" aria-hidden="true" />
                  Start walk
                </button>
              </div>
              <div className={`flex flex-col items-center gap-2 border-dashed border-k5-bi bg-k5-bt p-4 text-center ${dash}`}>
                <div className="flex h-24 items-end justify-center">
                  <Glass full={water} big />
                </div>
                <h3 className="m-0 font-k5-display text-2xl font-semibold leading-[1.1]">Drink water</h3>
                <p className="m-0 text-[15px] font-extrabold text-k5-mut">One full glass</p>
                {water ? (
                  <span className={`mt-auto self-stretch ${waterDone}`}>
                    <Tick />
                    Yum! Done
                  </span>
                ) : (
                  <button type="button" onClick={drinkWater} className={`mt-auto self-stretch ${outline}`}>
                    I drank it!
                  </button>
                )}
              </div>
            </div>
            <button type="button" onClick={snooze} className="min-h-12 cursor-pointer self-center rounded-full border-0 bg-transparent px-5 text-base font-extrabold text-k5-mut underline">
              Remind me in 5 minutes
            </button>
          </div>
        )}

        {phase === "walk" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-6 pt-[22px] text-center max-[480px]:px-4">
            <div className="relative h-[210px] w-[210px]">
              <svg width="210" height="210" viewBox="0 0 200 200" aria-hidden="true" className="absolute inset-0 -rotate-90">
                <circle cx="100" cy="100" r="88" fill="none" className="stroke-k5-gt" strokeWidth="16" />
                <circle
                  cx="100"
                  cy="100"
                  r="88"
                  fill="none"
                  className="k5-brk-ring stroke-k5-gi"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray="552.9"
                  strokeDashoffset={((552.9 * walkLeft) / BREAK_WALK).toFixed(1)}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
                {buddy(74, true)}
                <span role="timer" aria-live="off" dir="ltr" className="font-k5-display text-[40px] font-semibold leading-none">
                  {clock}
                </span>
                <span className="text-sm font-black text-k5-mut">left</span>
              </div>
            </div>
            <Footprints count={6} size={16} gap={12} step={0.3} />
            <p className="m-0 max-w-[420px] text-lg font-extrabold">Walk around, stretch up high and look out the window.</p>
            {!water && (
              <div className="flex flex-wrap items-center justify-center gap-3 rounded-[22px] bg-k5-bt px-3.5 py-2.5">
                <Glass full={false} />
                <span className="font-k5-display text-lg font-semibold">Don&rsquo;t forget your water!</span>
                <button type="button" onClick={drinkWater} className={outline}>
                  I drank it!
                </button>
              </div>
            )}
            <button type="button" onClick={back} className={`min-h-[60px] cursor-pointer rounded-full border-0 bg-[#FFC531] px-[30px] font-k5-display text-[22px] font-semibold text-[#1C2640] ${btnShadowYellow}`}>
              I&rsquo;m back!
            </button>
          </div>
        )}

        {phase === "done" && (
          <div className="flex flex-col items-center gap-4 px-6 pb-[26px] pt-[22px] text-center max-[480px]:px-4">
            <div className="relative h-[130px] w-[170px]">
              <Star size={34} fill="#FFC531" className="left-0 top-2.5 [animation-delay:.1s]" />
              <Star size={26} fill="#FF9EB5" className="right-1 top-0 [animation-delay:.3s]" />
              <Star size={22} fill="#7CCBFF" className="bottom-1.5 right-[18px] [animation-delay:.5s]" />
              <span className="absolute left-[30px] top-2.5">{buddy(110, true)}</span>
            </div>
            <p className="m-0 text-[19px] font-extrabold">Your body says thank you. Ready to learn again?</p>
            <div className="flex flex-wrap justify-center gap-2.5">
              <span className={waterDone}>
                <Tick />
                Walk 10 minutes
              </span>
              {water ? (
                <span className={waterDone}>
                  <Tick />
                  Drink water
                </span>
              ) : (
                <button type="button" onClick={drinkWater} className={outline}>
                  I drank it!
                </button>
              )}
            </div>
            <button type="button" onClick={end} className={`flex min-h-16 cursor-pointer items-center justify-center gap-2.5 rounded-full border-0 bg-k5-grn px-[34px] font-k5-display text-[22px] font-semibold text-white ${btnShadowBig}`}>
              Back to learning
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
