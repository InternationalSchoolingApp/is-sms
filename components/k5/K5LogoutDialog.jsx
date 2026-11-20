"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

/**
 * "Are you sure you want to log out?" in the Playful mockup (Playful.dc.html lgDlg): a 500px card with a thick ink border and
 * chunky shadow, a speech bubble, the ghost, the question and No / Yes. The ghost reacts to the pointer like the mockup:
 * over "Yes" it turns sad (blue bubble, tear, droop), over "No" it is happy (green bubble, sparkles, spin and hop).
 * Same actions as the dialog it replaces: No / Escape / outside click close it, Yes signs out (`busy` while that runs; nothing
 * closes it then).
 */
const GHOST_BODY =
  "M40 182 V108 C40 68 68 40 100 40 C132 40 160 68 160 108 V182 q-7.5 16 -15 0 q-7.5 -12 -15 0 q-7.5 16 -15 0 q-7.5 -12 -15 0 q-7.5 16 -15 0 q-7.5 -12 -15 0 q-7.5 16 -15 0 q-7.5 -12 -15 0 Z";

// The bubble's words are k5.logout.say.<mood>.
const SAY = {
  calm: { bg: "var(--k5-card)", fg: "var(--k5-ink)" },
  sad: { bg: "#E8F1FF", fg: "#1F5FBF" },
  happy: { bg: "#E4F4EA", fg: "#12703A" },
};

function Ghost({ mood }) {
  return (
    <div aria-hidden="true" className="relative mx-auto h-[236px] w-[200px]">
      <div className={`k5-ghhop absolute inset-0 bottom-[26px] ${mood === "calm" ? "" : `k5-gh-${mood}`}`}>
        <svg className="k5-ghbody block overflow-visible" width="200" height="210" viewBox="0 0 200 210">
          {mood === "happy" && (
            <g className="k5-ghspark" fill="#FFC531" stroke="#2A2F4A" strokeWidth="2" strokeLinejoin="round">
              <path d="M22 60 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z" />
              <path d="M176 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
              <path d="M182 130 l3 6 6 3 -6 3 -3 6 -3 -6 -6 -3 6 -3 Z" />
            </g>
          )}
          <path d={GHOST_BODY} fill={mood === "sad" ? "#EEF3FF" : "#FFFFFF"} stroke="#2A2F4A" strokeWidth="4.5" strokeLinejoin="round" />
          <path d="M58 92 C58 70 74 56 90 54" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
          {mood === "calm" && (
            <>
              <circle cx="80" cy="104" r="10" fill="#2A2F4A" />
              <circle cx="120" cy="104" r="10" fill="#2A2F4A" />
              <circle cx="83.5" cy="100" r="3.4" fill="#FFFFFF" />
              <circle cx="123.5" cy="100" r="3.4" fill="#FFFFFF" />
              <ellipse cx="66" cy="122" rx="10" ry="6" fill="#FFB3C1" opacity="0.8" />
              <ellipse cx="134" cy="122" rx="10" ry="6" fill="#FFB3C1" opacity="0.8" />
              <path d="M89 122 q11 14 22 0 Z" fill="#FF7A8A" stroke="#2A2F4A" strokeWidth="3" strokeLinejoin="round" />
            </>
          )}
          {mood === "sad" && (
            <>
              <path d="M68 96 l18 -8" stroke="#2A2F4A" strokeWidth="4" strokeLinecap="round" />
              <path d="M132 96 l-18 -8" stroke="#2A2F4A" strokeWidth="4" strokeLinecap="round" />
              <circle cx="80" cy="108" r="9" fill="#2A2F4A" />
              <circle cx="120" cy="108" r="9" fill="#2A2F4A" />
              <circle cx="82.5" cy="105" r="3" fill="#FFFFFF" />
              <circle cx="122.5" cy="105" r="3" fill="#FFFFFF" />
              <ellipse cx="66" cy="122" rx="10" ry="6" fill="#FFB3C1" opacity="0.8" />
              <ellipse cx="134" cy="122" rx="10" ry="6" fill="#FFB3C1" opacity="0.8" />
              <path d="M88 136 q12 -12 24 0" fill="none" stroke="#2A2F4A" strokeWidth="4" strokeLinecap="round" />
              <path className="k5-ghtear" d="M72 116 q-5 9 0 12 q5 -3 0 -12 Z" fill="#5BB4FF" stroke="#2B7CD3" strokeWidth="1.5" />
            </>
          )}
          {mood === "happy" && (
            <>
              <path d="M70 106 q10 -13 20 0" fill="none" stroke="#2A2F4A" strokeWidth="4.5" strokeLinecap="round" />
              <path d="M110 106 q10 -13 20 0" fill="none" stroke="#2A2F4A" strokeWidth="4.5" strokeLinecap="round" />
              <ellipse cx="64" cy="120" rx="12" ry="7" fill="#FF9BB0" />
              <ellipse cx="136" cy="120" rx="12" ry="7" fill="#FF9BB0" />
              <path d="M84 120 q16 24 32 0 Z" fill="#FF7A8A" stroke="#2A2F4A" strokeWidth="3" strokeLinejoin="round" />
              <path d="M93 130 q7 5 14 0" fill="none" stroke="#C93A55" strokeWidth="2.5" strokeLinecap="round" />
            </>
          )}
        </svg>
      </div>
      <span
        className={`k5-ghshadow absolute bottom-1 left-1/2 -ml-[55px] h-3.5 w-[110px] rounded-[50%] bg-[rgba(42,47,74,0.18)] ${mood === "calm" ? "" : `k5-gs-${mood}`}`}
      />
    </div>
  );
}

const BTN =
  "flex min-h-[52px] min-w-[140px] cursor-pointer items-center justify-center gap-2 rounded-full border-[3px] px-[22px] font-k5-display text-[19px] font-semibold disabled:cursor-default disabled:opacity-70";

// Mounted only while open, so the ghost starts calm every time.
export function K5LogoutDialog({ open, ...props }) {
  return open ? <LogoutCard {...props} /> : null;
}

function LogoutCard({ busy = false, onConfirm, onCancel }) {
  const t = useTranslations("k5.logout");
  const tc = useTranslations("common");
  const [mood, setMood] = useState("calm");
  const noRef = useRef(null);

  // The safe choice ("No") has the focus, like an alert dialog should.
  useEffect(() => {
    const id = setTimeout(() => noRef.current?.focus(), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onCancel]);

  const say = SAY[mood];
  const calm = () => setMood("calm");

  return (
    <div data-blocking-popup="" className="fixed inset-0 z-[88] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label={tc("actions.no")}
        tabIndex={-1}
        disabled={busy}
        onClick={onCancel}
        className="absolute inset-0 cursor-pointer border-none bg-[rgba(10,16,34,0.55)] p-0"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="k5-logout-title"
        className="relative box-border flex max-h-full w-[500px] max-w-full flex-col gap-3.5 overflow-y-auto rounded-[32px] border-[3px] border-k5-ink bg-k5-card px-6 pb-7 pt-[26px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)]"
      >
        <p
          aria-live="polite"
          className="relative -mb-1.5 self-center rounded-[18px] border-[3px] px-4 py-2 text-center font-k5-display text-lg font-semibold"
          style={{ background: say.bg, color: say.fg, borderColor: say.fg }}
        >
          {t(`say.${mood}`)}
          <span
            aria-hidden="true"
            className="absolute -bottom-2.5 left-1/2 -ml-[7px] h-3.5 w-3.5 rotate-45 border-b-[3px] border-r-[3px]"
            style={{ background: say.bg, borderColor: say.fg }}
          />
        </p>
        <Ghost mood={mood} />
        <h2 id="k5-logout-title" className="m-0 text-center font-k5-display text-[28px] font-semibold leading-[1.2]">
          {t("title")}
        </h2>
        <p className="mx-auto my-0 max-w-[380px] text-center text-[17px] font-extrabold leading-normal text-k5-mut">
          {t("body")}
        </p>
        <div className="flex flex-wrap justify-center gap-3.5 pt-1.5">
          <button
            ref={noRef}
            type="button"
            disabled={busy}
            onClick={onCancel}
            onPointerEnter={() => setMood("happy")}
            onPointerLeave={calm}
            className={`${BTN} border-k5-line bg-k5-card text-k5-ink shadow-[0_4px_0_var(--k5-line)]`}
          >
            {tc("actions.no")}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            onPointerEnter={() => setMood("sad")}
            onPointerLeave={calm}
            className={`${BTN} border-k5-ac bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]`}
          >
            {busy ? t("loggingOut") : tc("actions.yes")}
          </button>
        </div>
      </div>
    </div>
  );
}
