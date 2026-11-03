"use client";

import { BookOpen, Calculator, Dumbbell, FlaskConical, Landmark, Monitor, Palette } from "lucide-react";
import { subjectStyle } from "@/utils/k5Calendar";

// Shared building blocks of the Grade K–5 home (Playful.dc.html card / pill / button values).

export const K5_CARD = "rounded-[26px] border-[3px] border-k5-line bg-k5-card shadow-k5-chunky";
export const K5_ROUND_BTN =
  "flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-ink shadow-k5-btn disabled:cursor-default disabled:opacity-40";
export const K5_PRIMARY_BTN =
  "flex min-h-[50px] cursor-pointer items-center gap-1.5 rounded-full border-none bg-k5-ac py-0 pl-[22px] pr-[18px] font-k5-display text-[19px] font-semibold text-white shadow-[0_5px_0_var(--k5-acd)]";
// Colour-clue highlight (mockup: 3px solid #FFC531, offset 4px).
export const CLUE_RING = "outline outline-[3px] outline-offset-4 outline-[#FFC531]";

const SUBJECT_ICONS = {
  math: Calculator,
  science: FlaskConical,
  language: BookOpen,
  computer: Monitor,
  civics: Landmark,
  art: Palette,
  pe: Dumbbell,
  book: BookOpen,
};

/** Just the subject's icon (caller picks size and colour). */
export function SubjectIcon({ name, className }) {
  const Icon = SUBJECT_ICONS[subjectStyle(name).icon] || BookOpen;
  return <Icon className={className} strokeWidth={2.2} aria-hidden="true" />;
}

/** Rounded tile with the subject's icon in its tint pair. */
export function SubjectTile({ name, size = "lg" }) {
  const { icon, tile, ink } = subjectStyle(name);
  const Icon = SUBJECT_ICONS[icon] || BookOpen;
  const box = size === "lg" ? "h-[66px] w-[66px] rounded-[20px]" : "h-[38px] w-[38px] rounded-xl";
  return (
    <span className={`flex flex-none items-center justify-center ${box} ${tile}`}>
      <Icon className={`${size === "lg" ? "h-9 w-9" : "h-5 w-5"} ${ink}`} strokeWidth={2.2} aria-hidden="true" />
    </span>
  );
}

/** "1 done · 1 live · 3 to go" pills. */
export function StatusPills({ counts }) {
  const pills = [
    counts.done ? [`${counts.done} done`, "bg-k5-act text-k5-acx"] : null,
    counts.live ? [`${counts.live} live`, "bg-k5-gt text-k5-gx"] : null,
    counts.next ? [`${counts.next} to go`, "bg-k5-yt text-k5-yx"] : null,
  ].filter(Boolean);
  if (!pills.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {pills.map(([label, cls]) => (
        <span key={label} className={`rounded-full px-3.5 py-2 text-[15px] font-black ${cls}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

/** 78px header tile of a plan (date / WEEK / month). */
export function PlanTile({ top, big, className = "bg-k5-ac shadow-[0_5px_0_var(--k5-acd)]", children }) {
  return (
    <div className={`relative flex h-[78px] w-[78px] flex-none flex-col items-center justify-center rounded-[24px] ${className}`}>
      <span className="text-[13px] font-black tracking-[0.08em] text-white">{top}</span>
      {big != null && <span className="font-k5-display text-[34px] font-semibold leading-none text-white">{big}</span>}
      {children}
    </div>
  );
}

export function PlanHeader({ tile, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {tile}
      <div className="flex flex-[1_1_200px] flex-col gap-0.5">
        <h2 className="m-0 font-k5-display text-[32px] font-semibold leading-[1.05]">{title}</h2>
        {subtitle && <p className="m-0 text-[17px] font-extrabold text-k5-mut">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
