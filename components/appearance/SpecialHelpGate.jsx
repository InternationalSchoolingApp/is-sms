"use client";

import { useState } from "react";
import { Check, Lock, Sparkles } from "lucide-react";

const TOOLS = [
  "Colours that are easier to tell apart",
  "More space between letters and words",
  "Easy-to-read font and page colour",
  "A reading ruler",
  "No all-caps or slanted text",
  "Not sure, I'd like to try them",
];
const CONDITIONS = [
  ["", "I'd rather not say"],
  ["Dyslexia", "Dyslexia"],
  ["ADHD", "ADHD"],
  ["Autism", "Autism"],
  ["Other", "Other"],
];

const CHIP = "cursor-pointer rounded-full border-[3px] px-4 py-2 text-[15px] font-black text-k5-ink";
const chipState = (on) => (on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card");
const BUTTON = "min-h-[52px] cursor-pointer rounded-full border-none px-7 font-k5-display text-lg font-semibold disabled:cursor-default disabled:opacity-60";

export function SpecialHelpLock({ state, requestedAt, onAsk }) {
  const requested = state === "R";
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-5">
      <div role="status" className="flex max-w-[340px] flex-col items-center gap-2.5 rounded-[22px] border-[3px] border-k5-line bg-k5-card p-5 text-center text-k5-ink shadow-[0_8px_24px_rgba(0,0,0,0.12)]">
        {requested ? (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-k5-grn text-white">
              <Check className="h-8 w-8" strokeWidth={3.5} aria-hidden="true" />
            </span>
            <h4 className="m-0 font-k5-display text-xl font-semibold">Your request is sent</h4>
            <p className="m-0 text-[15px] font-bold text-k5-mut">
              {requestedAt ? `Sent on ${requestedAt}. ` : ""}We&apos;ll let you know as soon as it&apos;s switched on.
            </p>
          </>
        ) : (
          <>
            <Lock className="h-8 w-8 text-k5-mut" aria-hidden="true" />
            <h4 className="m-0 font-k5-display text-xl font-semibold">Special help is turned off for you right now</h4>
            <p className="m-0 text-[15px] font-bold text-k5-mut">
              These tools can make reading and colours easier. If you&apos;d find them useful, just ask &mdash; a teacher or the school team will switch them on for you.
            </p>
            <button type="button" onClick={onAsk} className={`${BUTTON} bg-k5-ac text-white`}>
              Ask to turn on Special help
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export function SpecialHelpBanner() {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-[18px] bg-k5-gt px-4 py-3 text-[15px] font-black text-k5-gx">
      <Sparkles className="h-5 w-5 flex-none" aria-hidden="true" />
      Special help is now on for you. Pick what works best below.
    </div>
  );
}

export function SpecialHelpRequestForm({ onBack, onSend }) {
  const [tools, setTools] = useState([]);
  const [reason, setReason] = useState("");
  const [condition, setCondition] = useState("");
  const [other, setOther] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const toggleTool = (tool) => setTools((current) => (current.includes(tool) ? current.filter((t) => t !== tool) : [...current, tool]));

  async function submit() {
    setSending(true);
    setError("");
    const result = await onSend({
      tools,
      reason: reason.trim(),
      condition: condition === "Other" ? `Other: ${other.trim()}` : condition,
    });
    setSending(false);
    if (!result.ok) setError(result.message);
  }

  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5 text-k5-ink">
      <div className="flex flex-col gap-1.5">
        <h3 className="m-0 font-k5-display text-[26px] font-semibold">We&apos;re here to help you learn your way</h3>
        <p className="m-0 text-base font-bold text-k5-mut">
          Some students find reading, colours or focus easier with a few extra settings. Tell us a little so we can set things up right. There are no wrong answers, and this stays between you, your teacher and the school.
        </p>
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="p-0 font-k5-display text-xl font-semibold">What would help you most?</legend>
        <span className="text-[15px] font-bold text-k5-mut">Pick any that sound useful.</span>
        <div className="flex flex-wrap gap-2">
          {TOOLS.map((tool) => (
            <button key={tool} type="button" aria-pressed={tools.includes(tool)} onClick={() => toggleTool(tool)} className={`${CHIP} ${chipState(tools.includes(tool))}`}>
              {tool}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <label htmlFor="sh-reason" className="font-k5-display text-xl font-semibold">Would you like to tell us why?</label>
        <span className="text-[15px] font-bold text-k5-mut">Optional. A sentence is plenty.</span>
        <textarea
          id="sh-reason"
          value={reason}
          maxLength={1000}
          onChange={(event) => setReason(event.target.value)}
          placeholder="e.g. I find it hard to follow long lines of text"
          className="min-h-[84px] w-full resize-y rounded-[14px] border-[3px] border-k5-line bg-k5-card p-3 text-base font-bold text-k5-ink"
        />
      </div>

      <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
        <legend className="p-0 font-k5-display text-xl font-semibold">Is there a condition you&apos;d like us to know about?</legend>
        <span className="text-[15px] font-bold text-k5-mut">
          Optional &mdash; you can skip this. If you share it, we&apos;ll note it on your profile so every teacher you work with can support you. Only the school and your teachers can see it.
        </span>
        <div className="flex flex-wrap gap-2">
          {CONDITIONS.map(([value, label]) => (
            <button key={label} type="button" aria-pressed={condition === value} onClick={() => setCondition(value)} className={`${CHIP} ${chipState(condition === value)}`}>
              {label}
            </button>
          ))}
        </div>
        {condition === "Other" && (
          <input
            type="text"
            value={other}
            maxLength={80}
            onChange={(event) => setOther(event.target.value)}
            placeholder="Tell us in your own words"
            aria-label="Tell us in your own words"
            className="w-full rounded-[14px] border-[3px] border-k5-line bg-k5-card p-3 text-base font-bold text-k5-ink"
          />
        )}
      </fieldset>

      {error && <p role="alert" className="m-0 text-[15px] font-black text-[#D7263D]">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onBack} disabled={sending} className={`${BUTTON} border-[3px] border-k5-line bg-transparent text-k5-mut`}>
          Back
        </button>
        <button type="button" onClick={submit} disabled={sending} className={`${BUTTON} bg-k5-ac text-white`}>
          {sending ? "Sending..." : "Send request"}
        </button>
      </div>
    </div>
  );
}

export function SpecialHelpSent({ firstName, routedTo, onDone }) {
  const name = firstName ? `, ${firstName}` : "";
  return (
    <div className="mx-auto flex max-w-[680px] flex-col gap-5 text-k5-ink">
      <div role="status" className="flex items-start gap-3 rounded-[18px] bg-k5-gt p-4 text-k5-gx">
        <span className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-k5-grn text-white">
          <Check className="h-7 w-7" strokeWidth={3.5} aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-1.5">
          <p className="m-0 font-k5-display text-xl font-semibold">
            Thanks{name}. Your request has been sent to {routedTo || "the school team"}.
          </p>
          <p className="m-0 text-base font-bold">We&apos;ll let you know as soon as it&apos;s switched on &mdash; usually within a day. You can keep using everything else as normal.</p>
        </div>
      </div>
      <div className="flex justify-end">
        <button type="button" onClick={onDone} className={`${BUTTON} bg-k5-ac text-white`}>
          Back to Make it yours
        </button>
      </div>
    </div>
  );
}
