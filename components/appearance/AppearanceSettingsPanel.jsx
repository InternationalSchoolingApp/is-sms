"use client";

import { useState } from "react";
import { BookOpen, Check } from "lucide-react";
import { SpecialHelpBanner, SpecialHelpLock, SpecialHelpRequestForm, SpecialHelpSent } from "@/components/appearance/SpecialHelpGate";
import { useSpecialHelp } from "@/hooks/useSpecialHelp";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { BUDDIES, BUDDY_NAME_MAX, DYSLEXIA_OFF, DYSLEXIA_ON, GRADE_LOOKS, PAGE_COLORS, THEME_SWATCHES, VOICE_SPEEDS, VOICES, buddyNameOf, cleanBuddyName, effectiveGradeLook, gradeLookOf } from "@/constant/appearance";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";

const OPTION =
  "flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-[3px] px-1 py-2 text-[15px] font-black text-k5-ink";
const optionState = (selected) => (selected ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card");

function Section({ id, title, subtitle, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="m-0 font-k5-display text-xl font-semibold leading-[1.2]">
          {title}
        </h3>
        {subtitle && <p className="m-0 text-[15px] font-bold text-k5-mut">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

// The caption under an Aa / Abc / read me sample (mockup: 14px, extra-bold, muted).
const CAPTION = "text-sm font-extrabold text-k5-mut";

function Choice({ name, value, label, children, className = "", style, labelClass = "" }) {
  const { preferences, updatePreference, canCustomize } = useAppearance();
  const selected = preferences[name] === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={!canCustomize}
      onClick={() => updatePreference(name, value)}
      className={`${OPTION} ${style ? (selected ? "border-k5-ac" : "border-k5-line") : optionState(selected)} disabled:cursor-default ${className}`}
      style={style}
    >
      {children}
      <span className={labelClass}>{label}</span>
    </button>
  );
}

// Each Theme card's preview (mockup Look dialog > Theme): "Aa" in that look's font, its colour dots, and a card edge in
// that look's style (chunky / soft shadow / flat).
const LOOK_PREVIEW = {
  playful: { card: "rounded-2xl border-[3px] border-[#D3E3FB] shadow-[0_3px_0_#D3E3FB]", font: "font-[family-name:var(--font-fredoka)] font-bold" },
  balanced: { card: "rounded-xl border-[1.5px] border-[#D9E6F5] shadow-[0_4px_12px_rgba(23,27,46,0.08)]", font: "font-[family-name:var(--font-outfit)] font-semibold" },
  mature: { card: "rounded-md border border-[#E3E7ED]", font: "font-[family-name:var(--font-roboto)] font-medium" },
};

/**
 * Theme (mockup Look dialog): Playful / Balanced / Mature - any student may pick any of the three dashboard looks. The
 * card of the look on screen is selected; picking the student's own grade look saves "auto" (it then follows the grade).
 */
function GradeLookSection() {
  const { preferences, updatePreference, canCustomize } = useAppearance();
  // The student's real grade (inside the shell isMiddle / isHigh follow the picked look).
  const { isMiddle, isHigh, gradeIsMiddle, gradeIsHigh } = useDashboardContext();
  const grade = { isMiddle: gradeIsMiddle ?? isMiddle, isHigh: gradeIsHigh ?? isHigh };
  const own = gradeLookOf(grade);
  const current = effectiveGradeLook(preferences.gradeLook, grade);
  return (
    <Section id="lk-theme" title="Theme">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-3">
        {Object.entries(GRADE_LOOKS).map(([key, look]) => {
          const selected = current === key;
          const preview = LOOK_PREVIEW[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={selected}
              disabled={!canCustomize}
              onClick={() => updatePreference("gradeLook", key === own ? "auto" : key)}
              className={`flex cursor-pointer flex-col items-stretch gap-2.5 rounded-[14px] border-2 p-3 text-start text-k5-ink disabled:cursor-default ${optionState(selected)}`}
            >
              <span className={`flex items-center justify-between gap-2 bg-white px-3.5 py-3 ${preview.card}`}>
                <span className={`text-[26px] leading-none text-[#1B2130] ${preview.font}`}>Aa</span>
                <span className="flex gap-1">
                  {look.dots.map((color) => (
                    <span key={color} className="block h-3.5 w-3.5 rounded-full" style={{ background: color }} />
                  ))}
                </span>
              </span>
              <span className={`text-[15px] leading-tight ${preview.font}`}>{look.name}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/** The small face on a voice card (mockup): a girl with a bow or a boy with short hair, in the same flat style as the other voice icons. */
function VoiceFace({ gender }) {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true" className="flex-none">
      <circle cx="12" cy="13" r="9" fill="#F9C9A8" />
      <path d={gender === "boy" ? "M3.5 12c0-5.5 3.6-8.6 8.5-8.6s8.5 3.1 8.5 8.6c-1.6-2.4-4.6-3.4-8.5-3.4s-6.9 1-8.5 3.4z" : "M3 12c0-6 4-9 9-9s9 3 9 9c-2-3-5-4-9-4s-7 1-9 4z"} fill={gender === "boy" ? "#3A2A1A" : "#8A4B2A"} />
      <circle cx="9" cy="13" r="1.4" fill="#1C2640" />
      <circle cx="15" cy="13" r="1.4" fill="#1C2640" />
      <path d="M9.5 16.5q2.5 2 5 0" fill="none" stroke="#1C2640" strokeWidth="1.5" strokeLinecap="round" />
      {gender !== "boy" && <path d="M17 4l2.5-1.5L19 5.5z" fill="#C42A6B" />}
    </svg>
  );
}

// The pointers of "Pick your pointer" (mockup art; the arrows themselves are in app/pointer.css).
const ARROW = "M5 3L5 25L10.5 19.8L14.5 28.5L18.6 26.6L14.7 18H22.5Z";
const POINTERS = [
  {
    value: "normal",
    label: "Normal",
    art: <path d={ARROW} fill="#FFFFFF" stroke="#1E2242" strokeWidth="2.2" strokeLinejoin="round" />,
  },
  {
    value: "rocket",
    label: "Rocket",
    art: (
      <g transform="rotate(-45 16 16)">
        <path d="M13 21 L16 28 L19 21Z" fill="#FFB020" stroke="#1E2242" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M11 17 L7 23.5 L11.5 22Z M21 17 L25 23.5 L20.5 22Z" fill="#FF5A5F" stroke="#1E2242" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M16 3 C21 8 22 14 21 21.5 H11 C10 14 11 8 16 3Z" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M16 3 C18.6 5.6 19.7 7.6 20.3 9.6 H11.7 C12.3 7.6 13.4 5.6 16 3Z" fill="#FF5A5F" stroke="#1E2242" strokeWidth="1.6" strokeLinejoin="round" />
        <circle cx="16" cy="13.5" r="2.6" fill="#4DA3FF" stroke="#1E2242" strokeWidth="1.5" />
      </g>
    ),
  },
  {
    value: "star",
    label: "Star",
    art: (
      <>
        <path d={ARROW} fill="#FFD54A" stroke="#1E2242" strokeWidth="2.2" strokeLinejoin="round" />
        <path d="M24.5 18.3 L26.1 22.2 L30.4 22.6 L27.2 25.4 L28.1 29.5 L24.5 27.3 L20.9 29.5 L21.8 25.4 L18.6 22.6 L22.9 22.2Z" fill="#FFD23F" stroke="#1E2242" strokeWidth="1.6" strokeLinejoin="round" />
      </>
    ),
  },
  {
    value: "wand",
    label: "Magic wand",
    art: (
      <>
        <path d="M9.8 7.6 L29 26.8 L26.8 29 L7.6 9.8Z" fill="#6A3FC4" stroke="#1E2242" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M23.5 21.3 L29 26.8 L26.8 29 L21.3 23.5Z" fill="#FFD23F" stroke="#1E2242" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M8.2 1.2 L10.1 5.7 L14.9 6.0 L11.2 9.2 L12.3 13.9 L8.2 11.3 L4.1 13.9 L5.2 9.2 L1.5 6.0 L6.3 5.7Z" fill="#FFD23F" stroke="#1E2242" strokeWidth="1.7" strokeLinejoin="round" />
      </>
    ),
  },
  {
    value: "block",
    label: "Block",
    art: (
      <>
        <path d="M3 3 H6 V6 H9 V9 H12 V12 H15 V15 H18 V18 H12 V21 H9 V24 H6 V27 H3Z" fill="#7BC950" stroke="#1E2242" strokeWidth="2" shapeRendering="crispEdges" />
        <path d="M12 21 H15 V24 H18 V27 H15 V30 H12Z" fill="#8B5A2B" stroke="#1E2242" strokeWidth="2" shapeRendering="crispEdges" />
        <path d="M6 9 H9 V12 H6Z M6 15 H9 V18 H6Z" fill="#5DA83A" />
      </>
    ),
  },
  {
    value: "rainbow",
    label: "Rainbow",
    art: (
      <>
        <defs>
          <linearGradient id="lk-ptr-rainbow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF6B6B" />
            <stop offset=".5" stopColor="#FFD23F" />
            <stop offset="1" stopColor="#4CD97B" />
          </linearGradient>
        </defs>
        <path d={ARROW} fill="url(#lk-ptr-rainbow)" stroke="#1E2242" strokeWidth="2.2" strokeLinejoin="round" />
      </>
    ),
  },
  {
    value: "paw",
    label: "Paw",
    art: (
      <>
        <path d={ARROW} fill="#F59AB8" stroke="#1E2242" strokeWidth="2.2" strokeLinejoin="round" />
        <ellipse cx="24.5" cy="26" rx="3.6" ry="3" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1.4" />
        <circle cx="20.2" cy="22.6" r="1.55" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1.2" />
        <circle cx="22.9" cy="20.6" r="1.55" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1.2" />
        <circle cx="26.1" cy="20.6" r="1.55" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1.2" />
        <circle cx="28.8" cy="22.6" r="1.55" fill="#FFFFFF" stroke="#1E2242" strokeWidth="1.2" />
      </>
    ),
  },
];

/** "Your buddy's name" (mockup): rename the buddy picked above (up to 14 letters) or put its own name back. */
function BuddyNameRow() {
  const { preferences, updatePreferences, canCustomize } = useAppearance();
  const buddy = BUDDIES[preferences.buddy] ? preferences.buddy : "pico";
  const [typed, setTyped] = useState(null);
  const shown = typed ?? buddyNameOf(preferences, buddy);
  const setName = (value) => {
    const names = { ...preferences.buddyNames };
    const clean = cleanBuddyName(value);
    if (clean.trim()) names[buddy] = clean;
    else delete names[buddy];
    updatePreferences({ buddyNames: names });
  };
  return (
    <div className="mt-1 flex flex-col gap-1.5">
      <label htmlFor="lk-buddy-name" className="font-k5-display text-[17px] font-semibold text-k5-ink">
        Your buddy&apos;s name
      </label>
      <div className="flex gap-2">
        <input
          id="lk-buddy-name"
          type="text"
          maxLength={BUDDY_NAME_MAX}
          value={shown}
          disabled={!canCustomize}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="lk-buddy-name-hint"
          onChange={(e) => {
            setTyped(e.target.value);
            setName(e.target.value);
          }}
          onBlur={() => setTyped(null)}
          className="h-12 min-w-0 flex-1 rounded-2xl border-[3px] border-k5-line bg-k5-card px-3.5 font-k5-display text-lg font-semibold text-k5-ink outline-none focus:border-k5-ac"
        />
        <button
          type="button"
          disabled={!canCustomize}
          onClick={() => {
            setTyped(null);
            setName("");
          }}
          className="h-12 flex-none cursor-pointer rounded-2xl border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-[15px] font-semibold text-k5-ink disabled:cursor-default"
        >
          Reset
        </button>
      </div>
      <span id="lk-buddy-name-hint" className="text-[13px] font-bold text-k5-mut">
        Give your buddy any name you like (up to {BUDDY_NAME_MAX} letters).
      </span>
    </div>
  );
}

function DayNightSwitch() {
  const { isDark, updatePreference, canCustomize } = useAppearance();
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        role="switch"
        aria-checked={isDark}
        aria-label="Day or night"
        disabled={!canCustomize}
        onClick={() => updatePreference("mode", isDark ? "light" : "dark")}
        className="flex-none cursor-pointer rounded-full border-0 bg-transparent p-0 shadow-[0_2px_8px_rgba(16,24,40,0.15)] outline-none focus-visible:ring-3 focus-visible:ring-k5-ac/50 disabled:cursor-default"
      >
        <svg width="132" height="58" viewBox="0 0 220 96" aria-hidden="true" className="block">
          <defs>
            <clipPath id="day-night-switch-clip"><rect width="220" height="96" rx="48" /></clipPath>
            <filter id="day-night-switch-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#000000" floodOpacity="0.35" />
            </filter>
          </defs>
          <g clipPath="url(#day-night-switch-clip)">
            <rect width="220" height="96" fill={isDark ? "#03051A" : "#2F74B0"} />
            {isDark ? (
              <>
                <circle cx="172" cy="48" r="140" fill="#161A31" />
                <circle cx="172" cy="48" r="108" fill="#272B43" />
                <circle cx="172" cy="48" r="78" fill="#3C4058" />
                <g fill="#FFFFFF">
                  <path d="M30 24l1.68 4.32 4.32 1.68-4.32 1.68L30 36l-1.68-4.32L24 30l4.32-1.68z" />
                  <path d="M58 18l1.12 2.88 2.88 1.12-2.88 1.12L58 26l-1.12-2.88L54 22l2.88-1.12z" />
                  <path d="M44 48l1.12 2.88 2.88 1.12-2.88 1.12L44 56l-1.12-2.88L40 52l2.88-1.12z" />
                  <path d="M24 60l1.68 4.32L30 66l-4.32 1.68L24 72l-1.68-4.32L18 66l4.32-1.68z" />
                  <path d="M70 45l.84 2.16L73 48l-2.16.84L70 51l-.84-2.16L67 48l2.16-.84z" />
                  <path d="M84 36l1.12 2.88L88 40l-2.88 1.12L84 44l-1.12-2.88L80 40l2.88-1.12z" />
                  <path d="M64 65l1.4 3.6L69 70l-3.6 1.4L64 75l-1.4-3.6L59 70l3.6-1.4z" />
                  <path d="M98 22l.56 1.44L100 24l-1.44.56L98 26l-.56-1.44L96 24l1.44-.56z" />
                </g>
              </>
            ) : (
              <>
                <circle cx="48" cy="48" r="150" fill="#3B7FB8" />
                <circle cx="48" cy="48" r="122" fill="#4A8BC1" />
                <circle cx="48" cy="48" r="96" fill="#5B97C9" />
                <circle cx="48" cy="48" r="70" fill="#6CA3D0" />
                <g fill="#B4D3EA">
                  <circle cx="204" cy="28" r="24" /><circle cx="178" cy="62" r="20" /><circle cx="142" cy="78" r="20" />
                  <circle cx="104" cy="88" r="18" /><circle cx="62" cy="94" r="18" /><circle cx="22" cy="92" r="18" />
                </g>
                <g fill="#EEF9FC">
                  <circle cx="214" cy="36" r="22" /><circle cx="186" cy="70" r="20" /><circle cx="150" cy="86" r="20" />
                  <circle cx="112" cy="96" r="18" /><circle cx="70" cy="102" r="18" /><circle cx="28" cy="100" r="18" />
                  <rect y="92" width="220" height="10" />
                </g>
              </>
            )}
            <g style={{ transform: `translateX(${isDark ? 124 : 0}px)`, transition: "transform 350ms ease" }}>
              {isDark ? (
                <>
                  <circle cx="48" cy="48" r="36" fill="#C4C8D1" filter="url(#day-night-switch-shadow)" />
                  <circle cx="60" cy="40" r="30" fill="#3C4058" />
                  <circle cx="25" cy="56" r="4" fill="#969DB1" />
                  <circle cx="45" cy="70" r="3" fill="#969DB1" />
                </>
              ) : (
                <circle cx="48" cy="48" r="36" fill="#F2C12E" filter="url(#day-night-switch-shadow)" />
              )}
            </g>
          </g>
          <rect x="1.5" y="1.5" width="217" height="93" rx="46.5" fill="none" stroke="#D5DCE6" strokeWidth="3" />
        </svg>
      </button>
      <span className="font-k5-display text-[18px] font-semibold">{isDark ? "Night" : "Day"}</span>
    </div>
  );
}

/**
 * The appearance settings, laid out like the mockup look dialog: favourite colour, day or night,
 * text size, letters, hand, buddy and voice on the left; the "Special help" panel (colour vision,
 * reading help, dyslexia tools) on the right. Every change applies instantly and is saved on its own.
 * Buddy + voice only show where a buddy exists (`withBuddy`, K–5).
 */
export function AppearanceSettingsPanel({ withBuddy = false, onHear, firstName = "" }) {
  const { preferences, updatePreference: _panelUpdate, canCustomize } = useAppearance();
  const specialHelp = useSpecialHelp();
  const [view, setView] = useState("settings");
  const [routedTo, setRoutedTo] = useState("");
  if (view === "request") {
    return (
      <SpecialHelpRequestForm
        onBack={() => setView("settings")}
        onSend={async (form) => {
          const result = await specialHelp.send(form);
          if (result.ok) {
            setRoutedTo(result.routedTo);
            setView("sent");
          }
          return result;
        }}
      />
    );
  }
  if (view === "sent") return <SpecialHelpSent firstName={firstName} routedTo={routedTo} onDone={() => setView("settings")} />;
  return (
    <div className="flex flex-col gap-[22px]">
    {/* Theme sits above both columns, full width (mockup). */}
    <div className="mb-[18px]">
      <GradeLookSection />
    </div>
    <div className="grid items-start gap-[22px] min-[921px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Section id="lk-color" title="Favorite color">
          <div className="grid grid-cols-5 gap-2.5">
            {Object.entries(THEME_SWATCHES).map(([key, t]) => {
              const selected = preferences.theme === key;
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  disabled={!canCustomize}
                  onClick={() => _panelUpdate("theme", key)}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-[18px] border-0 bg-transparent px-1 py-2.5 text-[15px] font-black text-k5-ink disabled:cursor-default"
                >
                  <span
                    className="flex h-[58px] w-[58px] items-center justify-center rounded-full max-[480px]:h-10 max-[480px]:w-10"
                    style={{ background: t.color, boxShadow: selected ? `0 0 0 4px var(--k5-card), 0 0 0 8px ${t.color}` : "0 4px 0 rgba(0, 0, 0, 0.18)" }}
                  >
                    {selected && <Check className="h-7 w-7 text-white" strokeWidth={3.4} aria-hidden="true" />}
                  </span>
                  {t.name}
                </button>
              );
            })}
          </div>
        </Section>

        <Section id="lk-mode" title="Day or night?">
          <DayNightSwitch />
        </Section>

        <Section id="lk-size" title="Text size">
          <div className="grid grid-cols-3 gap-3">
            <Choice name="textSize" value="small" label="Small" className="!gap-0.5" labelClass={CAPTION}>
              <span className="font-k5-display text-[20px] font-semibold leading-none">Aa</span>
            </Choice>
            <Choice name="textSize" value="medium" label="Medium" className="!gap-0.5" labelClass={CAPTION}>
              <span className="font-k5-display text-[28px] font-semibold leading-none">Aa</span>
            </Choice>
            <Choice name="textSize" value="large" label="Large" className="!gap-0.5" labelClass={CAPTION}>
              <span className="font-k5-display text-[38px] font-semibold leading-none">Aa</span>
            </Choice>
          </div>
        </Section>

        <Section id="lk-font" title="Letters">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-3">
            {[
              ["cute", "Cute", "Abc", "var(--font-fredoka)", "font-semibold text-[32px]"],
              ["simple", "Simple", "Abc", "var(--font-lexend)", "font-semibold text-[32px]"],
              ["easy", "Easy to read", "Abc", "var(--font-andika)", "font-bold text-[32px]"],
              ["clear", "Super clear", "Il1 O0", "var(--font-atkinson)", "font-bold text-[30px]"],
            ].map(([value, label, sample, family, look]) => (
              <Choice key={value} name="font" value={value} label={label} className="!min-h-[96px] !gap-1" labelClass={CAPTION}>
                <span className={`leading-none ${look}`} style={{ fontFamily: family }}>
                  {sample}
                </span>
              </Choice>
            ))}
          </div>
        </Section>

        <Section id="lk-hand" title="Which hand do you use?" subtitle="We move the menu to the other side, so your hand never covers it.">
          <div className="grid grid-cols-2 gap-3">
            <HandChoice value="left" label="Left hand" sub="Menu goes on the right" flip />
            <HandChoice value="right" label="Right hand" sub="Menu goes on the left" />
          </div>
        </Section>

        {withBuddy && (
          <>
            <section aria-labelledby="lk-buddy" className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3">
                <h3 id="lk-buddy" className="m-0 font-k5-display text-xl font-semibold leading-[1.2]">
                  Your buddy
                </h3>
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.buddyEnabled !== "off"}
                  aria-labelledby="lk-buddy"
                  onClick={() => _panelUpdate("buddyEnabled", preferences.buddyEnabled === "off" ? "on" : "off")}
                  className="flex cursor-pointer items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-card py-1 pe-1 ps-3 font-k5-display text-base font-semibold text-k5-ink"
                >
                  {preferences.buddyEnabled === "off" ? "Off" : "On"}
                  <span aria-hidden="true" className={`relative block h-7 w-[50px] rounded-full transition-colors duration-200 ${preferences.buddyEnabled === "off" ? "bg-[#C9D2E3]" : "bg-[#2FB866]"}`}>
                    <span className={`absolute start-[3px] top-[3px] block h-[22px] w-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.3)] transition-transform duration-200 ${preferences.buddyEnabled === "off" ? "" : "translate-x-[22px]"}`} />
                  </span>
                </button>
              </div>
              <div className={`grid grid-cols-5 gap-2.5 transition-opacity duration-200 ${preferences.buddyEnabled === "off" ? "pointer-events-none opacity-40" : ""}`}>
                {Object.entries(BUDDIES).map(([key, b]) => (
                  <Choice key={key} name="buddy" value={key} label={buddyNameOf(preferences, key) || b.name} className="!min-h-0 !gap-1.5 !px-1 !pb-2 !pt-2.5 font-k5-display !text-[17px] font-semibold">
                    <PicoMascot buddy={key} width={55} wave={false} />
                  </Choice>
                ))}
              </div>
              <BuddyNameRow />
            </section>

            <Section id="lk-voice" title="Buddy's voice" subtitle="Tap one to hear it!">
              <div className="grid grid-cols-4 gap-2.5 max-[560px]:grid-cols-2">
                {Object.entries(VOICES).map(([key, v]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={preferences.voice === key}
                    aria-label={`${v.name}, ${v.gender} voice, ${v.accent}`}
                    onClick={() => (onHear ? onHear({ voice: key }) : _panelUpdate("voice", key))}
                    title={`${v.gender === "boy" ? "Boy" : "Girl"} · ${v.accent}`}
                    className={`${OPTION} !min-h-[84px] !gap-1.5 !px-1 !py-2 ${optionState(preferences.voice === key)}`}
                  >
                    <VoiceFace gender={v.gender} />
                    <span>{v.name}</span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-black text-k5-mut">How fast?</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.entries(VOICE_SPEEDS).map(([key, s]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={preferences.voiceSpeed === key}
                      onClick={() => (onHear ? onHear({ voiceSpeed: key }) : _panelUpdate("voiceSpeed", key))}
                      className={`${OPTION} ${optionState(preferences.voiceSpeed === key)}`}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Choice name="speech" value="on" label="Buddy talks" />
                <Choice name="speech" value="off" label="Buddy is quiet" />
              </div>
            </Section>

            <Section id="lk-christmas" title="🎄 Christmas theme" subtitle="Snow, music and decorations on Christmas Day.">
              <div className="grid grid-cols-2 gap-3">
                <Choice name="christmas" value="on" label="On" />
                <Choice name="christmas" value="off" label="Off" />
              </div>
            </Section>

            <section aria-labelledby="lk-game-sound" className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <h3 id="lk-game-sound" className="m-0 font-k5-display text-xl font-semibold leading-[1.2]">
                  Game sounds
                </h3>
                <p className="m-0 text-[15px] font-bold text-k5-mut">Sounds in the games and balloons</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={preferences.gameSound !== "off"}
                aria-label="Game sounds"
                onClick={() => _panelUpdate("gameSound", preferences.gameSound === "off" ? "on" : "off")}
                className="flex flex-none cursor-pointer items-center gap-2 border-0 bg-transparent p-1 font-k5-display text-sm font-bold text-k5-ink"
              >
                <span>{preferences.gameSound === "off" ? "Off" : "On"}</span>
                <span aria-hidden="true" className={`relative block h-[30px] w-[52px] flex-none rounded-full ${preferences.gameSound === "off" ? "bg-k5-line" : "bg-k5-ac"}`}>
                  <span className={`absolute top-[3px] block h-6 w-6 rounded-full bg-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition-[left] ${preferences.gameSound === "off" ? "left-[3px]" : "left-[25px]"}`} />
                </span>
              </button>
            </section>
          </>
        )}

        <Section id="lk-pointer" title="Pick your pointer">
          <div className="grid grid-cols-4 gap-2.5 max-[420px]:grid-cols-2">
            {POINTERS.map((p) => {
              const selected = (preferences.pointer || "normal") === p.value;
              return (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={selected}
                  disabled={!canCustomize}
                  onClick={() => _panelUpdate("pointer", p.value)}
                  className={`flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-[3px] px-1 pb-2 pt-2.5 text-center font-k5-display text-[15px] font-semibold leading-[1.1] text-k5-ink disabled:cursor-default ${optionState(selected)}`}
                >
                  <svg width="44" height="44" viewBox="0 0 32 32" aria-hidden="true">
                    {p.art}
                  </svg>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </Section>
      </div>

      <div className="relative flex min-w-0 flex-col gap-5 rounded-[26px] border-[3px] border-dashed border-k5-line bg-k5-soft p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[14px] bg-k5-vt">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="stroke-k5-vi">
              <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
              <path d="M9 11h6M12 8v6" />
            </svg>
          </span>
          <div className="flex flex-col">
            <h3 className="m-0 font-k5-display text-[22px] font-semibold leading-[1.1]">Special help</h3>
            <span className="text-sm font-extrabold text-k5-mut">Colour-blind colours, reading help and dyslexia tools</span>
          </div>
        </div>

        {specialHelp.justEnabled && specialHelp.state === "Y" && <SpecialHelpBanner />}
        <div
          inert={specialHelp.locked || specialHelp.loading}
          aria-hidden={specialHelp.locked || undefined}
          className={`flex flex-col gap-5 transition-[filter,opacity] ${specialHelp.locked || specialHelp.loading ? "pointer-events-none select-none opacity-35 grayscale" : ""}`}
        >
        <Section id="lk-cv" title="Color vision" subtitle="Pick colors that are easy for your eyes to tell apart.">
          <div className="grid grid-cols-2 gap-3">
            <Choice name="colorVision" value="standard" label="Standard" className="!gap-2">
              <Swatches colors={["#2563EB", "#C92F6E", "#6A3FC4", "#8A6A00", "#C92A2F"]} />
            </Choice>
            <Choice name="colorVision" value="cvd" label="Color-blind friendly" className="!gap-2">
              <Swatches colors={["#0072B2", "#B34700", "#A3507F", "#E69F00", "#00795A"]} />
            </Choice>
          </div>
        </Section>

        <Section id="lk-sp" title="Reading help" subtitle="More space between letters and words can make reading easier.">
          <div className="grid grid-cols-2 gap-3">
            <Choice name="reading" value="normal" label="Normal spacing" labelClass={CAPTION}>
              <span aria-hidden="true" className="text-xl font-extrabold">read me</span>
            </Choice>
            <Choice name="reading" value="spaced" label="Extra spacing" labelClass={CAPTION}>
              <span aria-hidden="true" className="text-xl font-extrabold tracking-[0.14em] [word-spacing:0.3em]">read me</span>
            </Choice>
          </div>
        </Section>

        <DyslexiaSection />
        </div>
        {specialHelp.locked && <SpecialHelpLock state={specialHelp.state} requestedAt={specialHelp.requestedAt} onAsk={() => setView("request")} />}
      </div>
    </div>
    </div>
  );
}

function HandChoice({ value, label, sub, flip = false }) {
  const { preferences, updatePreference, canCustomize } = useAppearance();
  const selected = preferences.hand === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={!canCustomize}
      onClick={() => updatePreference("hand", value)}
      className={`flex min-h-[76px] cursor-pointer items-center gap-3 rounded-[22px] border-[3px] px-4 py-2.5 text-left text-k5-ink disabled:cursor-default ${optionState(selected)}`}
    >
      <svg width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" className={`flex-none ${flip ? "-scale-x-100" : ""}`}>
        <path d="M8 13V5a1.5 1.5 0 0 1 3 0v6M11 10V3.5a1.5 1.5 0 0 1 3 0V10M14 10V5a1.5 1.5 0 0 1 3 0v7c0 4-2.5 8-7 8-3 0-4.5-1.5-6-4l-2-3.5a1.5 1.5 0 0 1 2.5-1.5L8 13" fill="#FFD8B0" stroke="#A15C1E" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
      <span className="flex flex-col">
        <span className="font-k5-display text-[21px] font-semibold">{label}</span>
        <span className="text-[13px] font-extrabold text-k5-mut">{sub}</span>
      </span>
    </button>
  );
}

/** An on / off row (mockup toggle): whole row is the button, the switch shows the state. */
function Toggle({ label, sub, on, onToggle, children, large = false }) {
  const { canCustomize } = useAppearance();
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={!canCustomize}
      onClick={onToggle}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-[20px] border-[3px] px-3.5 py-2.5 text-start text-k5-ink disabled:cursor-default ${large ? "min-h-[84px]" : "min-h-[72px]"} ${optionState(on)}`}
    >
      {children}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={`font-k5-display font-semibold ${large ? "text-[19px]" : "text-[17px]"}`}>{label}</span>
        {sub && <span className="text-[13px] font-extrabold text-k5-mut">{sub}</span>}
      </span>
      <span aria-hidden="true" className={`relative h-[30px] w-[52px] flex-none rounded-full ${on ? "bg-k5-grn" : "bg-k5-line"}`}>
        <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white shadow-[0_2px_0_rgba(0,0,0,0.2)] transition-[left] ${on ? "left-[25px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}

function DyslexiaSection() {
  const { preferences, updatePreference, updatePreferences } = useAppearance();
  const { dyslexia, plainText, ruler, pageColor } = preferences;
  return (
    <section aria-labelledby="lk-dx" className="flex flex-col gap-3 rounded-[22px] bg-k5-card p-3.5">
      <div className="flex flex-col gap-0.5">
        <h3 id="lk-dx" className="m-0 flex items-center gap-2 font-k5-display text-xl font-semibold leading-[1.2]">
          <BookOpen className="h-6 w-6 text-k5-vi" aria-hidden="true" />
          Dyslexia help
        </h3>
        <p className="m-0 text-[15px] font-bold text-k5-mut">Research-based settings that make reading easier.</p>
      </div>
      <Toggle
        large
        label="Dyslexia mode"
        sub="One tap: easy-to-read font, more space, soft page colour, plain letters"
        on={dyslexia === "on"}
        onToggle={() => updatePreferences(dyslexia === "on" ? DYSLEXIA_OFF : DYSLEXIA_ON)}
      >
        <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-k5-vt text-[22px] font-bold text-[var(--k5-vX)]" style={{ fontFamily: "var(--font-lexend)" }}>
          Aa
        </span>
      </Toggle>
      <div className="flex flex-col gap-2">
        <span className="font-k5-display text-[17px] font-semibold">Page colour</span>
        <div role="group" aria-label="Page colour" className="grid grid-cols-5 gap-2">
          {Object.entries(PAGE_COLORS).map(([value, c]) => (
            <button
              key={value}
              type="button"
              aria-pressed={pageColor === value}
              onClick={() => updatePreference("pageColor", value)}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[3px] px-1 py-2 text-[13px] font-black text-k5-ink ${optionState(pageColor === value)}`}
            >
              <span aria-hidden="true" className="block h-9 w-9 rounded-full border-2 border-k5-line" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
        <Toggle label="Reading ruler" sub="A bright strip follows your finger or mouse" on={ruler === "on"} onToggle={() => updatePreference("ruler", ruler === "on" ? "off" : "on")}>
          <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="flex-none">
            <rect x="2" y="2" width="36" height="36" rx="10" className="fill-k5-yt" />
            <path d="M9 11h22M9 29h22" className="stroke-k5-line" strokeWidth="3" strokeLinecap="round" />
            <rect x="5" y="15" width="30" height="10" rx="3" fill="#FFF3C4" stroke="#FFC531" strokeWidth="2.5" />
            <path d="M9 20h22" stroke="#1C2640" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </Toggle>
        <Toggle label="Plain letters" sub="No ALL CAPS or slanted text" on={plainText === "on"} onToggle={() => updatePreference("plainText", plainText === "on" ? "off" : "on")}>
          <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[10px] bg-k5-gt font-k5-body text-[18px] font-black normal-case not-italic text-k5-ink">Ab</span>
        </Toggle>
      </div>
    </section>
  );
}

function Swatches({ colors }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {colors.map((c) => (
        <span key={c} className="block h-[18px] w-[18px] rounded-full" style={{ background: c }} />
      ))}
    </span>
  );
}
