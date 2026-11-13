"use client";

import { BookOpen, Calculator, Dumbbell, FlaskConical, Landmark, Monitor, Palette } from "lucide-react";
import { subjectStyle } from "@/utils/k5Calendar";
import { useDashboardContext } from "@/hooks/useDashboardContext";

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

// Grade 6–8 (Middle.dc.html): the "art" course is drawn as a globe, never a palette.
function GlobeIcon({ className, strokeWidth = 2.2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
    </svg>
  );
}

// Grade 9–12 (High.dc.html): its own course icons (monitor with code, book, +/×, flask, speech bubbles, a head for art and
// psychology). Other subjects keep the shared icon.
const HIGH_ICONS = {
  computer: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4M9 8l-2 2 2 2M15 8l2 2-2 2" />
    </>
  ),
  language: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19V5M8 7h7M8 11h5" />
    </>
  ),
  math: <path d="M7 4v6M4 7h6M14 7h6M5 15l4 4M9 15l-4 4M14 16h6M14 19h6" />,
  science: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  spanish: (
    <>
      <path d="M4 5h11v8H9l-4 3.5V13H4z" />
      <path d="M15 9h5v8h-1v3l-3.5-3H11v-2" />
    </>
  ),
  art: (
    <>
      <path d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.1 2.5 5.3V21h7v-2.5h2.2a1.8 1.8 0 0 0 1.8-1.8V14l1.8-.6-1.8-3.4A7 7 0 0 0 12 3z" />
      <path d="M10 9.5a2 2 0 0 1 3.5-1.3" />
    </>
  ),
};
// Which High icon a course name gets (null: the shared icon).
function highIconKey(name, icon) {
  if (/spanish|español/i.test(String(name || ""))) return "spanish";
  if (/psycholog/i.test(String(name || ""))) return "art";
  return HIGH_ICONS[icon] ? icon : null;
}
function HighIcon({ kind, className, strokeWidth = 2.2 }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {HIGH_ICONS[kind]}
    </svg>
  );
}

/** Just the subject's icon (caller picks size and colour). */
export function SubjectIcon({ name, className }) {
  const { isMiddle, isHigh } = useDashboardContext();
  const icon = subjectStyle(name).icon;
  const highKey = isHigh ? highIconKey(name, icon) : null;
  if (highKey) return <HighIcon kind={highKey} className={className} />;
  const Icon = isMiddle && icon === "art" ? GlobeIcon : SUBJECT_ICONS[icon] || BookOpen;
  return <Icon className={className} strokeWidth={2.2} aria-hidden="true" />;
}

/** Rounded tile with the subject's icon in its tint pair. */
export function SubjectTile({ name, size = "lg" }) {
  const { isMiddle, isHigh } = useDashboardContext();
  const { icon, tile, ink } = subjectStyle(name);
  const highKey = isHigh ? highIconKey(name, icon) : null;
  const Icon = isMiddle && icon === "art" ? GlobeIcon : SUBJECT_ICONS[icon] || BookOpen;
  const box = size === "lg" ? "k5h-stile h-[66px] w-[66px] rounded-[20px]" : "k5h-ctile h-[38px] w-[38px] rounded-xl";
  return (
    <span className={`flex flex-none items-center justify-center ${box} ${tile}`}>
      {highKey ? (
        <HighIcon kind={highKey} className={`${size === "lg" ? "k5h-sicon h-9 w-9" : "h-5 w-5"} ${ink}`} />
      ) : (
        <Icon className={`${size === "lg" ? "k5h-sicon h-9 w-9" : "h-5 w-5"} ${ink}`} strokeWidth={2.2} aria-hidden="true" />
      )}
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
        <span key={label} className={`k5h-pill rounded-full px-3.5 py-2 text-[15px] font-black ${cls}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

/** 78px header tile of a plan (date / WEEK / month). */
export function PlanTile({ top, big, className = "bg-k5-ac shadow-[0_5px_0_var(--k5-acd)]", children }) {
  return (
    <div className={`k5h-ptile relative flex h-[78px] w-[78px] flex-none flex-col items-center justify-center rounded-[24px] ${className}`}>
      <span className="k5h-ptile-top text-[13px] font-black tracking-[0.08em] text-white">{top}</span>
      {big != null && <span className="k5h-ptile-big font-k5-display text-[34px] font-semibold leading-none text-white">{big}</span>}
      {children}
    </div>
  );
}

export function PlanHeader({ tile, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {tile}
      <div className="flex flex-[1_1_200px] flex-col gap-0.5">
        <h2 className="k5h-ptitle m-0 font-k5-display text-[32px] font-semibold leading-[1.05]">{title}</h2>
        {subtitle && <p className="m-0 text-[17px] font-extrabold text-k5-mut">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
