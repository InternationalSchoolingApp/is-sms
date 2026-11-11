"use client";

import { BookOpen, Check, Hand, HeartPulse, Moon, ScanLine, Sun, Volume2 } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { BUDDIES, DYSLEXIA_OFF, DYSLEXIA_ON, PAGE_COLORS, THEME_SWATCHES, VOICES } from "@/constant/appearance";
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

/**
 * The appearance settings, laid out like the mockup look dialog: favourite colour, day or night,
 * text size, letters, hand, buddy and voice on the left; the "Special help" panel (colour vision,
 * reading help, dyslexia tools) on the right. Every change applies instantly and is saved on its own.
 * Buddy + voice only show where a buddy exists (`withBuddy`, K–5).
 */
export function AppearanceSettingsPanel({ withBuddy = false, onHear }) {
  const { preferences, updatePreference: _panelUpdate } = useAppearance();
  return (
    <div className="grid items-start gap-[22px] min-[921px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-5">
        <Section id="lk-color" title="Favorite color">
          <div className="grid grid-cols-5 gap-2.5">
            {Object.entries(THEME_SWATCHES).map(([key, t]) => (
              <Choice key={key} name="theme" value={key} label={t.name}>
                <span className="flex h-[58px] w-[58px] items-center justify-center rounded-full" style={{ background: t.color }}>
                  {preferences.theme === key && <Check className="h-7 w-7 text-white" strokeWidth={3.5} aria-hidden="true" />}
                </span>
              </Choice>
            ))}
          </div>
        </Section>

        <Section id="lk-mode" title="Day or night?">
          <div className="grid grid-cols-2 gap-3">
            <Choice name="mode" value="light" label="Day" className="font-k5-display text-xl font-semibold !text-[#1C2640]" style={{ background: "#FFF0CC" }}>
              <Sun className="h-7 w-7 text-[#FFC531]" aria-hidden="true" />
            </Choice>
            <Choice name="mode" value="dark" label="Night" className="font-k5-display text-xl font-semibold !text-white" style={{ background: "#1B2547" }}>
              <Moon className="h-7 w-7 text-[#FFC531]" aria-hidden="true" />
            </Choice>
          </div>
        </Section>

        <Section id="lk-size" title="Text size">
          <div className="grid grid-cols-3 gap-3">
            <Choice name="textSize" value="small" label="Small">
              <span className="font-k5-display text-lg font-semibold">Aa</span>
            </Choice>
            <Choice name="textSize" value="medium" label="Medium">
              <span className="font-k5-display text-2xl font-semibold">Aa</span>
            </Choice>
            <Choice name="textSize" value="large" label="Large">
              <span className="font-k5-display text-[32px] font-semibold leading-none">Aa</span>
            </Choice>
          </div>
        </Section>

        <Section id="lk-font" title="Letters">
          <div className="grid grid-cols-3 gap-3">
            {[
              ["cute", "Cute", "Abc", "var(--font-fredoka)"],
              ["simple", "Simple", "Abc", "var(--font-lexend)"],
              ["easy", "Easy to read", "Abc", "var(--font-andika)"],
              ["clear", "Super clear", "Il1 O0", "var(--font-atkinson)"],
            ].map(([value, label, sample, family]) => (
              <Choice key={value} name="font" value={value} label={label}>
                <span className="text-[30px] font-bold leading-none" style={{ fontFamily: family }}>
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
            <Section id="lk-buddy" title="Your buddy">
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
                <span className="text-[15px] font-bold text-k5-ink">{preferences.buddyEnabled === "off" ? "Buddy is hidden" : "Buddy is showing"}</span>
              </div>
              <div className={`grid grid-cols-5 gap-2.5 ${preferences.buddyEnabled === "off" ? "pointer-events-none opacity-40" : ""}`}>
                {Object.entries(BUDDIES).map(([key, b]) => (
                  <Choice key={key} name="buddy" value={key} label={b.name} className="!min-h-0 gap-1.5 !px-1 !pb-2 !pt-2.5 font-k5-display !text-[17px] font-semibold">
                    <PicoMascot buddy={key} width={44} full={false} />
                  </Choice>
                ))}
              </div>
            </Section>

            <Section id="lk-voice" title="Buddy's voice" subtitle="Tap one to hear it!">
              <div className="grid grid-cols-3 gap-2.5 min-[561px]:grid-cols-6">
                {Object.entries(VOICES).map(([key, v]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={preferences.voice === key}
                    onClick={() => onHear?.(key)}
                    className={`${OPTION} px-1 ${optionState(preferences.voice === key)}`}
                  >
                    <Volume2 className="h-6 w-6 text-k5-acx" aria-hidden="true" />
                    {v.name}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Choice name="speech" value="on" label="Buddy talks" />
                <Choice name="speech" value="off" label="Buddy is quiet" />
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
            <h3 className="m-0 font-k5-display text-[22px] font-semibold leading-[1.1]">Special help</h3>
            <span className="text-sm font-extrabold text-k5-mut">Colour-blind colours, reading help and dyslexia tools</span>
          </div>
        </div>

        <Section id="lk-cv" title="Color vision" subtitle="Pick colors that are easy for your eyes to tell apart.">
          <div className="grid grid-cols-2 gap-3">
            <Choice name="colorVision" value="standard" label="Standard">
              <Swatches colors={["#2563EB", "#C92F6E", "#6A3FC4", "#8A6A00", "#C92A2F"]} />
            </Choice>
            <Choice name="colorVision" value="cvd" label="Color-blind friendly">
              <Swatches colors={["#0072B2", "#B34700", "#A3507F", "#E69F00", "#00795A"]} />
            </Choice>
          </div>
        </Section>

        <Section id="lk-sp" title="Reading help" subtitle="More space between letters and words can make reading easier.">
          <div className="grid grid-cols-2 gap-3">
            <Choice name="reading" value="normal" label="Normal spacing">
              <span aria-hidden="true" className="text-xl font-extrabold">read me</span>
            </Choice>
            <Choice name="reading" value="spaced" label="Extra spacing">
              <span aria-hidden="true" className="text-xl font-extrabold tracking-[0.14em] [word-spacing:0.3em]">read me</span>
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
  return (
    <section aria-labelledby="lk-dx" className="flex flex-col gap-3 rounded-[22px] bg-k5-card p-3.5">
      <div className="flex flex-col gap-0.5">
        <h3 id="lk-dx" className="m-0 flex items-center gap-2 font-k5-display text-xl font-semibold">
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
          <ScanLine className="h-8 w-8 flex-none text-k5-vi" aria-hidden="true" />
        </Toggle>
        <Toggle label="Plain letters" sub="No ALL CAPS or slanted text" on={plainText === "on"} onToggle={() => updatePreference("plainText", plainText === "on" ? "off" : "on")}>
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
