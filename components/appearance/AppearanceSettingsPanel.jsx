"use client";

import { BookOpen, Check, Hand, Moon, MonitorSmartphone, Sun, Volume2 } from "lucide-react";
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

function Choice({ name, value, label, children, className = "" }) {
  const { preferences, updatePreference, canCustomize } = useAppearance();
  const selected = preferences[name] === value;
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={!canCustomize}
      onClick={() => updatePreference(name, value)}
      className={`${OPTION} ${optionState(selected)} disabled:cursor-default ${className}`}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}

/**
 * The appearance settings (plan section 12.3 matrix). Every change applies instantly and is
 * saved on its own. Buddy + voice only show where a buddy exists (`withBuddy`, K–5); the
 * accessibility settings are never hidden from any grade.
 */
export function AppearanceSettingsPanel({ withBuddy = false, onHear }) {
  const { preferences } = useAppearance();
  return (
    <div className="flex flex-col gap-5">
      {withBuddy && (
        <>
          <Section id="lk-buddy" title="Your buddy">
            <div className="grid grid-cols-5 gap-2.5 max-[480px]:grid-cols-3">
              {Object.entries(BUDDIES).map(([key, b]) => (
                <Choice key={key} name="buddy" value={key} label={b.name} className="font-k5-display font-semibold">
                  <PicoMascot buddy={key} width={44} full={false} />
                </Choice>
              ))}
            </div>
          </Section>
          <Section id="lk-voice" title="Buddy's voice" subtitle="Tap one to hear it!">
            <div className="grid grid-cols-5 gap-2.5 max-[480px]:grid-cols-3">
              {Object.entries(VOICES).map(([key, v]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={preferences.voice === key}
                  onClick={() => onHear?.(key)}
                  className={`${OPTION} ${optionState(preferences.voice === key)}`}
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

      <Section id="lk-color" title="Favorite color">
        <div className="grid grid-cols-5 gap-2.5 max-[480px]:grid-cols-3">
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
        <div className="grid grid-cols-3 gap-3">
          <Choice name="mode" value="light" label="Day" className="font-k5-display text-xl font-semibold">
            <Sun className="h-7 w-7 text-[#C9930A]" aria-hidden="true" />
          </Choice>
          <Choice name="mode" value="dark" label="Night" className="font-k5-display text-xl font-semibold">
            <Moon className="h-7 w-7 text-k5-acx" aria-hidden="true" />
          </Choice>
          <Choice name="mode" value="system" label="Same as device" className="font-k5-display text-base font-semibold">
            <MonitorSmartphone className="h-7 w-7 text-k5-mut" aria-hidden="true" />
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

      <Section id="lk-cv" title="Color vision" subtitle="Pick colors that are easy for your eyes to tell apart.">
        <div className="grid grid-cols-2 gap-3">
          <Choice name="colorVision" value="standard" label="Standard">
            <Swatches colors={["#1E66E0", "#1F7A3A", "#D7263D", "#F2B807"]} />
          </Choice>
          <Choice name="colorVision" value="cvd" label="Color-blind friendly">
            <Swatches colors={["#0072B2", "#00795A", "#B34700", "#E69F00"]} />
          </Choice>
        </div>
      </Section>

      <Section id="lk-contrast" title="Contrast" subtitle="Darker lines and words.">
        <div className="grid grid-cols-2 gap-3">
          <Choice name="contrast" value="standard" label="Standard" />
          <Choice name="contrast" value="high" label="High contrast" />
        </div>
      </Section>

      <Section id="lk-sp" title="Reading help" subtitle="More space between letters and words can make reading easier.">
        <div className="grid grid-cols-2 gap-3">
          <Choice name="reading" value="normal" label="Normal spacing">
            <span className="text-lg font-black">abc</span>
          </Choice>
          <Choice name="reading" value="spaced" label="Extra spacing">
            <span className="text-lg font-black tracking-[0.2em]">a b c</span>
          </Choice>
        </div>
      </Section>

      <DyslexiaSection />

      <Section id="lk-hand" title="Which hand do you use?" subtitle="We move the menu to the other side, so your hand never covers it.">
        <div className="grid grid-cols-2 gap-3">
          <Choice name="hand" value="left" label="Left hand">
            <Hand className="h-7 w-7 -scale-x-100 text-k5-acx" aria-hidden="true" />
          </Choice>
          <Choice name="hand" value="right" label="Right hand">
            <Hand className="h-7 w-7 text-k5-acx" aria-hidden="true" />
          </Choice>
        </div>
      </Section>

      <Section id="lk-font" title="Letters">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(118px,1fr))] gap-3">
          {[
            ["cute", "Cute", "var(--font-fredoka)"],
            ["simple", "Simple", "var(--font-lexend)"],
            ["easy", "Easy", "var(--font-andika)"],
            ["clear", "Super clear", "var(--font-atkinson)"],
          ].map(([value, label, family]) => (
            <Choice key={value} name="font" value={value} label={label}>
              <span className="text-[28px] font-bold leading-none" style={{ fontFamily: family }}>
                Aa
              </span>
            </Choice>
          ))}
        </div>
      </Section>

      <Section id="lk-motion" title="Moving pictures">
        <div className="grid grid-cols-2 gap-3">
          <Choice name="motion" value="system" label="Same as device" />
          <Choice name="motion" value="reduced" label="Less moving" />
        </div>
      </Section>
    </div>
  );
}

/** An on / off row (mockup toggle): whole row is the button, the switch shows the state. */
function Toggle({ label, sub, on, onToggle, children }) {
  const { canCustomize } = useAppearance();
  return (
    <button
      type="button"
      aria-pressed={on}
      disabled={!canCustomize}
      onClick={onToggle}
      className={`flex min-h-[72px] w-full cursor-pointer items-center gap-3 rounded-[20px] border-[3px] px-3.5 py-2.5 text-start text-k5-ink disabled:cursor-default ${optionState(on)}`}
    >
      {children}
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="font-k5-display text-[19px] font-semibold">{label}</span>
        {sub && <span className="text-[13px] font-extrabold text-k5-mut">{sub}</span>}
      </span>
      <span aria-hidden="true" className={`relative h-[30px] w-[52px] flex-none rounded-full ${on ? "bg-k5-grn" : "bg-k5-line"}`}>
        <span className={`absolute top-[3px] h-6 w-6 rounded-full bg-white transition-[left] ${on ? "left-[25px]" : "left-[3px]"}`} />
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
          <BookOpen className="h-6 w-6 text-k5-yi" aria-hidden="true" />
          Reading help for dyslexia
        </h3>
        <p className="m-0 text-[15px] font-bold text-k5-mut">Easier letters, calmer colours and a line to follow.</p>
      </div>
      <Toggle
        label="Dyslexia-friendly mode"
        sub="Simple letters, extra spacing, cream page, plain text"
        on={dyslexia === "on"}
        onToggle={() => updatePreferences(dyslexia === "on" ? DYSLEXIA_OFF : DYSLEXIA_ON)}
      >
        <span className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-k5-yt text-[22px] font-bold text-k5-yx" style={{ fontFamily: "var(--font-lexend)" }}>
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
        <p className="m-0 text-[13px] font-bold text-k5-mut">Shows in Day look. Night keeps its dark pages.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-2.5">
        <Toggle label="Reading ruler" sub="A bright line follows your finger or mouse" on={ruler === "on"} onToggle={() => updatePreference("ruler", ruler === "on" ? "off" : "on")} />
        <Toggle label="Plain text" sub="No ALL CAPS and no slanted words" on={plainText === "on"} onToggle={() => updatePreference("plainText", plainText === "on" ? "off" : "on")} />
      </div>
    </section>
  );
}

function Swatches({ colors }) {
  return (
    <span className="flex gap-1" aria-hidden="true">
      {colors.map((c) => (
        <span key={c} className="block h-5 w-5 rounded-full" style={{ background: c }} />
      ))}
    </span>
  );
}
