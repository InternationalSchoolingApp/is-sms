"use client";

import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { BUDDIES, buddyNameOf } from "@/constant/appearance";

// The pictures of the Christmas theme, drawn like the mockups (Playful / Middle / High .dc.html).

/** The little tree that takes the place of the 25 in the calendars (mockup: the mini calendar and the Month view). */
export function ChristmasTreeIcon({ size = 34, label = "25, Christmas" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={label} className="flex-none">
      <path d="M12 5 L6.5 12 H9 L5 17.5 H19 L15 12 H17.5 Z" fill="#1F9E5A" />
      <rect x="10.5" y="17.5" width="3" height="3.5" fill="#8B5A2B" />
      <circle cx="10" cy="11.5" r="0.9" fill="#E5484D" />
      <circle cx="14" cy="14.8" r="0.9" fill="#E5484D" />
      <circle cx="12.6" cy="9.4" r="0.8" fill="#FFC531" />
      <circle cx="9.4" cy="15.6" r="0.8" fill="#2F7BF5" />
      <path d="M12 1.5l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2L8.8 3.8l2.2-.3z" fill="#FFC531" />
    </svg>
  );
}

/** The record next to "Music on / Music off": it spins while the music plays. */
export function MusicDisc({ playing }) {
  return (
    <svg className={`k5-xm-disc ${playing ? "is-spin" : "is-stop"}`} width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10.5" fill="#D7DEEE" stroke="#1E2242" strokeWidth="1.2" />
      <path d="M12 1.5a10.5 10.5 0 0 1 9.1 5.25L12 12z" fill="#FF8FB1" opacity=".6" />
      <path d="M21.1 17.25A10.5 10.5 0 0 1 12 22.5L12 12z" fill="#7CC4FF" opacity=".65" />
      <path d="M2.9 17.25A10.5 10.5 0 0 1 2.9 6.75L12 12z" fill="#FFD84D" opacity=".6" />
      <circle cx="12" cy="12" r="4" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1" />
      <circle cx="12" cy="12" r="1.5" fill="#1E2242" />
    </svg>
  );
}

/** The buddy dressed as Santa, for the "No classes" card of 25 December (mockup santa face + the floating "Ho Ho Ho!"). */
export function SantaBuddy() {
  const { isMiddle } = useDashboardContext();
  const { preferences } = useAppearance();
  const buddy = BUDDIES[preferences.buddy] ? preferences.buddy : "pico";
  const color = buddy === "pico" && isMiddle ? "#3B9BFF" : BUDDIES[buddy].color;
  return (
    <span className="relative flex flex-none">
      <svg width="92" height="92" viewBox="0 0 200 200" role="img" aria-label={`${buddyNameOf(preferences)} dressed as Santa`} className="flex-none overflow-visible">
        <circle cx="100" cy="104" r="92" fill={color} />
        <circle cx="100" cy="114" r="60" fill="#FFE3D3" />
        <circle cx="56" cy="146" r="20" fill="#FFFFFF" />
        <circle cx="76" cy="170" r="22" fill="#FFFFFF" />
        <circle cx="100" cy="180" r="24" fill="#FFFFFF" />
        <circle cx="124" cy="170" r="22" fill="#FFFFFF" />
        <circle cx="144" cy="146" r="20" fill="#FFFFFF" />
        <path d="M44 126 Q50 160 100 162 Q150 160 156 126 Q132 150 100 150 Q68 150 44 126 Z" fill="#FFFFFF" />
        <path d="M74 104 Q82 95 90 104M110 104 Q118 95 126 104" fill="none" stroke="#1C2640" strokeWidth="6" strokeLinecap="round" />
        <circle cx="68" cy="124" r="9" fill="#FF9EB5" opacity="0.85" />
        <circle cx="132" cy="124" r="9" fill="#FF9EB5" opacity="0.85" />
        <ellipse cx="100" cy="148" rx="8" ry="6" fill="#9A2B2B" />
        <path d="M100 136 Q86 124 70 134 Q84 146 100 140 Q116 146 130 134 Q114 124 100 136 Z" fill="#FFFFFF" stroke="#E6DED6" strokeWidth="2" />
        <circle cx="100" cy="124" r="8" fill="#FF8A8A" />
        <path d="M40 84 Q56 16 118 14 Q164 14 178 62 L160 72 Q142 42 116 42 Q76 44 68 82 Z" fill="#E5484D" />
        <path d="M36 86 Q100 56 166 80" fill="none" stroke="#FFFFFF" strokeWidth="22" strokeLinecap="round" />
        <circle cx="176" cy="64" r="15" fill="#FFFFFF" />
      </svg>
      <span className="k5-xm-ho" aria-hidden="true">Ho</span>
      <span className="k5-xm-ho [animation-delay:0.8s]" aria-hidden="true">Ho</span>
      <span className="k5-xm-ho [animation-delay:1.6s]" aria-hidden="true">Ho!</span>
    </span>
  );
}

/** The string of coloured bulbs along the top of the My Classes heading on 25 December (mockup). */
export function ChristmasLights() {
  const bulbs = ["#F28B8B", "#8FD1A6", "#FFD978", "#9CC2F7"];
  return (
    <span aria-hidden="true" className="k5-xm-lights pointer-events-none absolute left-[18px] right-[18px] top-0 flex h-[14px] items-start justify-between border-t-2 border-[#9BC4A8] px-1">
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className="k5-xm-bulb" style={{ background: bulbs[i % bulbs.length], animationDelay: `${(i % 5) * 0.4}s` }} />
      ))}
    </span>
  );
}
