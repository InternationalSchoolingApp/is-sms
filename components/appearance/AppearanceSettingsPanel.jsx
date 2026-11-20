"use client";

import { BookOpen, Check, Hand, HeartPulse, Moon, ScanLine, Sun, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { BUDDIES, DYSLEXIA_OFF, DYSLEXIA_ON, GRADE_LOOKS, PAGE_COLORS, THEME_SWATCHES, VOICE_SPEEDS, VOICES, effectiveGradeLook, gradeLookOf } from "@/constant/appearance";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";

const OPTION =
  "flex min-h-[84px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[20px] border-[3px] px-1 py-2 text-[15px] font-black text-k5-ink";
const optionState = (selected) => (selected ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card");

function Section({ id, title, subtitle, children }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex flex-col gap-0.5">
        <h3 id={id} className="m-0 font-k5-display text-xl font-semibold">
          {title}
        </h3>
        {subtitle && <p className="m-0 text-[15px] font-bold text-k5-mut">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function Choice({ name, value, label, children, className = "", style }) {
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
      <span>{label}</span>
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
  const t = useTranslations("header.appearance");
  return (
    <Section id="lk-theme" title={t("theme")}>
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
              <span className={`text-[15px] leading-tight ${preview.font}`}>{t(`looks.${key}`)}</span>
            </button>
          );
        })}
      </div>
    </Section>
  );
}

/**
 * The appearance settings, laid out like the mockup look dialog: favourite colour, day or night,
 * text size, letters, hand, buddy and voice on the left; the "Special help" panel (colour vision,
 * reading help, dyslexia tools) on the right. Every change applies instantly and is saved on its own.
 * Buddy + voice only show where a buddy exists (`withBuddy`, K–5).
 */
export function AppearanceSettingsPanel({ withBuddy = false, onHear }) {
  const { preferences, updatePreference: _panelUpdate } = useAppearance();
  const t = useTranslations("header.appearance");
  // Accent names of the voices (constant/appearance.js VOICES[].accent), translated when known.
  const accent = (value) => (t.has(`accents.${value}`) ? t(`accents.${value}`) : value);
  return (
    <div className="grid items-start gap-[22px] min-[921px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <GradeLookSection />
        <Section id="lk-color" title={t("favoriteColor")}>
          <div className="grid grid-cols-5 gap-2.5">
            {Object.entries(THEME_SWATCHES).map(([key, swatch]) => (
              <Choice key={key} name="theme" value={key} label={t(`colors.${key}`)}>
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full" style={{ background: swatch.color }}>
                  {preferences.theme === key && <Check className="h-7 w-7 text-white" strokeWidth={3.5} aria-hidden="true" />}
                </span>
              </Choice>
            ))}
          </div>
        </Section>

        <Section id="lk-mode" title={t("dayOrNight")}>
          <div className="grid grid-cols-2 gap-3">
            <Choice name="mode" value="light" label={t("day")} className="font-k5-display text-xl font-semibold !text-[#1C2640]" style={{ background: "#FFF0CC" }}>
              <Sun className="h-7 w-7 text-[#FFC531]" aria-hidden="true" />
            </Choice>
            <Choice name="mode" value="dark" label={t("night")} className="font-k5-display text-xl font-semibold !text-white" style={{ background: "#1B2547" }}>
              <Moon className="h-7 w-7 text-[#FFC531]" aria-hidden="true" />
            </Choice>
          </div>
        </Section>

        <Section id="lk-size" title={t("textSize")}>
          <div className="grid grid-cols-3 gap-3">
            <Choice name="textSize" value="small" label={t("small")}>
              <span className="font-k5-display text-lg font-semibold">Aa</span>
            </Choice>
            <Choice name="textSize" value="medium" label={t("medium")}>
              <span className="font-k5-display text-2xl font-semibold">Aa</span>
            </Choice>
            <Choice name="textSize" value="large" label={t("large")}>
              <span className="font-k5-display text-[32px] font-semibold leading-none">Aa</span>
            </Choice>
          </div>
        </Section>

        <Section id="lk-font" title={t("letters")}>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["cute", "Abc", "var(--font-fredoka)"],
              ["simple", "Abc", "var(--font-lexend)"],
              ["easy", "Abc", "var(--font-andika)"],
              ["clear", "Il1 O0", "var(--font-atkinson)"],
            ].map(([value, sample, family]) => (
              <Choice key={value} name="font" value={value} label={t(`fonts.${value}`)}>
                <span className="text-[30px] font-bold leading-none" style={{ fontFamily: family }}>
                  {sample}
                </span>
              </Choice>
            ))}
          </div>
        </Section>

        <Section id="lk-hand" title={t("hand")} subtitle={t("handSub")}>
          <div className="grid grid-cols-2 gap-3">
            <HandChoice value="left" label={t("leftHand")} sub={t("leftHandSub")} flip />
            <HandChoice value="right" label={t("rightHand")} sub={t("rightHandSub")} />
          </div>
        </Section>

        {withBuddy && (
          <>
            <Section id="lk-buddy" title={t("buddy")}>
              <div className="mb-2 flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.buddyEnabled !== "off"}
                  onClick={() => _panelUpdate("buddyEnabled", preferences.buddyEnabled === "off" ? "on" : "off")}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${preferences.buddyEnabled === "off" ? "bg-k5-line" : "bg-k5-ac"}`}
                >
                  <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${preferences.buddyEnabled === "off" ? "translate-x-0" : "translate-x-5"}`} />
                </button>
                <span className="text-[15px] font-bold text-k5-ink">{preferences.buddyEnabled === "off" ? t("buddyHidden") : t("buddyShowing")}</span>
              </div>
              <div className={`grid grid-cols-5 gap-2.5 ${preferences.buddyEnabled === "off" ? "pointer-events-none opacity-40" : ""}`}>
                {Object.entries(BUDDIES).map(([key, b]) => (
                  <Choice key={key} name="buddy" value={key} label={b.name} className="!min-h-0 gap-1.5 !px-1 !pb-2 !pt-2.5 font-k5-display !text-[17px] font-semibold">
                    <PicoMascot buddy={key} width={44} full={false} />
                  </Choice>
                ))}
              </div>
            </Section>

            <Section id="lk-voice" title={t("voice")} subtitle={t("voiceSub")}>
              <div className="grid grid-cols-4 gap-2.5 max-[560px]:grid-cols-2">
                {Object.entries(VOICES).map(([key, v]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={preferences.voice === key}
                    aria-label={t("voiceAria", { name: v.name, gender: v.gender, accent: accent(v.accent) })}
                    onClick={() => (onHear ? onHear({ voice: key }) : _panelUpdate("voice", key))}
                    className={`${OPTION} gap-0.5 px-1 ${optionState(preferences.voice === key)}`}
                  >
                    <Volume2 className="h-6 w-6 text-k5-acx" aria-hidden="true" />
                    <span>{v.name}</span>
                    <span className="text-xs font-extrabold text-k5-mut">
                      {v.gender === "boy" ? t("boy") : t("girl")} · {accent(v.accent)}
                    </span>
                  </button>
                ))}
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[15px] font-black text-k5-mut">{t("howFast")}</span>
                <div className="grid grid-cols-3 gap-2.5">
                  {Object.entries(VOICE_SPEEDS).map(([key]) => (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={preferences.voiceSpeed === key}
                      onClick={() => (onHear ? onHear({ voiceSpeed: key }) : _panelUpdate("voiceSpeed", key))}
                      className={`${OPTION} ${optionState(preferences.voiceSpeed === key)}`}
                    >
                      {t(`speeds.${key}`)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Choice name="speech" value="on" label={t("buddyTalks")} />
                <Choice name="speech" value="off" label={t("buddyQuiet")} />
              </div>
            </Section>

            <Section id="lk-game-sound" title={t("gameSounds")} subtitle={t("gameSoundsSub")}>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={preferences.gameSound !== "off"}
                  aria-label={t("gameSounds")}
                  onClick={() => _panelUpdate("gameSound", preferences.gameSound === "off" ? "on" : "off")}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${preferences.gameSound === "off" ? "bg-k5-line" : "bg-k5-ac"}`}
                >
                  <span className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${preferences.gameSound === "off" ? "translate-x-0" : "translate-x-5"}`} />
                </button>
                <span className="text-[15px] font-bold text-k5-ink">{preferences.gameSound === "off" ? t("gameSoundsOff") : t("gameSoundsOn")}</span>
              </div>
            </Section>
          </>
        )}
      </div>

      <div className="flex min-w-0 flex-col gap-5 rounded-[26px] border-[3px] border-dashed border-k5-line bg-k5-soft p-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[14px] bg-k5-vt">
            <HeartPulse className="h-6 w-6 text-k5-vi" aria-hidden="true" />
          </span>
          <div className="flex flex-col">
            <h3 className="m-0 font-k5-display text-[22px] font-semibold leading-[1.1]">{t("specialHelp")}</h3>
            <span className="text-sm font-extrabold text-k5-mut">{t("specialHelpSub")}</span>
          </div>
        </div>

        <Section id="lk-cv" title={t("colorVision")} subtitle={t("colorVisionSub")}>
          <div className="grid grid-cols-2 gap-3">
            <Choice name="colorVision" value="standard" label={t("standard")}>
              <Swatches colors={["#2563EB", "#C92F6E", "#6A3FC4", "#8A6A00", "#C92A2F"]} />
            </Choice>
            <Choice name="colorVision" value="cvd" label={t("colorBlind")}>
              <Swatches colors={["#0072B2", "#B34700", "#A3507F", "#E69F00", "#00795A"]} />
            </Choice>
          </div>
        </Section>

        <Section id="lk-sp" title={t("readingHelp")} subtitle={t("readingHelpSub")}>
          <div className="grid grid-cols-2 gap-3">
            <Choice name="reading" value="normal" label={t("normalSpacing")}>
              <span aria-hidden="true" className="text-xl font-extrabold">{t("readMe")}</span>
            </Choice>
            <Choice name="reading" value="spaced" label={t("extraSpacing")}>
              <span aria-hidden="true" className="text-xl font-extrabold tracking-[0.14em] [word-spacing:0.3em]">{t("readMe")}</span>
            </Choice>
          </div>
        </Section>

        <DyslexiaSection />
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
      <Hand className={`h-8 w-8 flex-none text-k5-acx ${flip ? "-scale-x-100" : ""}`} aria-hidden="true" />
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
  const t = useTranslations("header.appearance");
  return (
    <section aria-labelledby="lk-dx" className="flex flex-col gap-3 rounded-[22px] bg-k5-card p-3.5">
      <div className="flex flex-col gap-0.5">
        <h3 id="lk-dx" className="m-0 flex items-center gap-2 font-k5-display text-xl font-semibold">
          <BookOpen className="h-6 w-6 text-k5-vi" aria-hidden="true" />
          {t("dyslexiaHelp")}
        </h3>
        <p className="m-0 text-[15px] font-bold text-k5-mut">{t("dyslexiaHelpSub")}</p>
      </div>
      <Toggle
        large
        label={t("dyslexiaMode")}
        sub={t("dyslexiaModeSub")}
        on={dyslexia === "on"}
        onToggle={() => updatePreferences(dyslexia === "on" ? DYSLEXIA_OFF : DYSLEXIA_ON)}
      >
        <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-k5-vt text-[22px] font-bold text-[var(--k5-vX)]" style={{ fontFamily: "var(--font-lexend)" }}>
          Aa
        </span>
      </Toggle>
      <div className="flex flex-col gap-2">
        <span className="font-k5-display text-[17px] font-semibold">{t("pageColour")}</span>
        <div role="group" aria-label={t("pageColour")} className="grid grid-cols-5 gap-2">
          {Object.entries(PAGE_COLORS).map(([value, c]) => (
            <button
              key={value}
              type="button"
              aria-pressed={pageColor === value}
              onClick={() => updatePreference("pageColor", value)}
              className={`flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl border-[3px] px-1 py-2 text-[13px] font-black text-k5-ink ${optionState(pageColor === value)}`}
            >
              <span aria-hidden="true" className="block h-9 w-9 rounded-full border-2 border-k5-line" style={{ background: c.color }} />
              {t(`pageColors.${value}`)}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
        <Toggle label={t("readingRuler")} sub={t("readingRulerSub")} on={ruler === "on"} onToggle={() => updatePreference("ruler", ruler === "on" ? "off" : "on")}>
          <ScanLine className="h-8 w-8 flex-none text-k5-vi" aria-hidden="true" />
        </Toggle>
        <Toggle label={t("plainLetters")} sub={t("plainLettersSub")} on={plainText === "on"} onToggle={() => updatePreference("plainText", plainText === "on" ? "off" : "on")}>
          <span aria-hidden="true" className="flex h-8 w-8 flex-none items-center justify-center text-xl font-extrabold text-k5-vi">Ab</span>
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
