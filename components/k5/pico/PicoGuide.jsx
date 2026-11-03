"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { BUDDIES } from "@/constant/appearance";
import { PICO_SAY_EVENT } from "@/components/k5/pico/picoEvents";

const TOUR_KEY = "is-k5-tour:";
const noSubscribe = () => () => {};
function readLocal(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// The 8 tips of the mockup tour; `pin` is the data-pin of the element Pico walks to.
// A tip whose element is not on the page (no live class right now) is skipped.
function tourSteps(firstName, buddyName) {
  return [
    { pin: null, text: `Hi${firstName ? ` ${firstName}` : ""}! I'm ${buddyName}, your calendar buddy. Tap Next and I'll show you around!` },
    { pin: "live", text: "Your class is live right now! Tap the green Join class button to go in." },
    { pin: "mini", text: "This little calendar shows the whole month. A dot under a day means something is planned." },
    { pin: "views", text: "Tap Today, Week or Month to see your plans in different ways." },
    { pin: "look", text: "Tap the palette button to pick your favorite color, night mode, letters and text size!" },
    { pin: "clues", text: "Color clues tell you what each box means. Tap a clue and the matching boxes light up!" },
    { pin: "side", text: "Use the side menu to book classes, see your teacher, join clubs and more. Hold and drag a button to move your favorites to the top!" },
    { pin: "msg", text: "Need help? Tap the green Messages button to talk to us." },
  ];
}
const MOBILE_QUERY = "(max-width: 760px)";
const subscribeMobile = (callback) => {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const isMobileView = () => window.matchMedia(MOBILE_QUERY).matches;
const pinEl = (pin) => (pin && typeof document !== "undefined" ? document.querySelector(`[data-pin="${pin}"]`) : null);
const onPage = (pin) => !pin || Boolean(pinEl(pin));

// Mockup geometry: the buddy box is 140×176; the header ends ~92px down.
const W = 140;
const H = 176;
const M = 8;
const TOP = 92;
// Elements that never scroll (fixed chrome) — no page scroll before walking to them.
const FIXED_PINS = new Set(["side", "msg", "look"]);

/** Where the buddy stands next to `el` (mockup placePin): beside it, else above / below. */
function placeNext(el) {
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const midY = r.top + Math.min(r.height, 240) / 2 - H / 2;
  const right = vw - r.right >= W + 12;
  const left = r.left >= W + 12;
  const onTop = r.top - H + 28 >= TOP;
  const below = vh - r.bottom >= H + 4;
  let cx;
  let y;
  if (r.width > 420 && onTop) [cx, y] = [r.right - W / 2 - 30, r.top - H + 28];
  else if (right) [cx, y] = [r.right + W / 2 + 2, midY];
  else if (left) [cx, y] = [r.left - W / 2 - 2, midY];
  else if (onTop) [cx, y] = [r.right - W / 2 - 20, r.top - H + 28];
  // Below a wide bar (the colour clues) the buddy stands at its right end, like the mockup.
  else if (below) [cx, y] = [r.width > 420 ? r.right - W / 2 - 20 : r.left + W / 2 + 20, r.bottom - 6];
  else [cx, y] = [r.right - W / 2 - 12, r.top + 10];
  return {
    x: Math.round(Math.min(vw - W / 2 - M, Math.max(W / 2 + M, cx))),
    y: Math.round(Math.min(vh - H - 6, Math.max(TOP, y))),
  };
}

/** The resting spot (bottom corner) when a tip has no element. */
function restingSpot(leftHand) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return { x: leftHand ? W / 2 + 16 : vw - W / 2 - 16, y: vh - H - 10, resting: true };
}

/** Walk the buddy to the tip's element (or its resting corner); turns it to face the way it walks. */
function moveBuddy({ pin, leftHand, posRef, setPos, setFaceLeft }, glide) {
  const el = pinEl(pin);
  const next = (el && placeNext(el)) || restingSpot(leftHand);
  const prev = posRef.current;
  if (prev && Math.abs(prev.x - next.x) < 2 && Math.abs(prev.y - next.y) < 2 && prev.resting === next.resting) return;
  if (glide && prev && Math.abs(prev.x - next.x) > 6) setFaceLeft(next.x < prev.x);
  posRef.current = next;
  setPos(next);
}

/** Bubble position relative to the buddy box, with its tail pointing at the buddy. */
function bubbleLayout(pos, leftHand) {
  const vw = window.innerWidth;
  const bw = Math.min(340, vw - 32);
  if (pos.resting) {
    // Mockup: bubble sits above the buddy, towards the middle of the screen.
    return leftHand ? { below: false, left: 28, tail: 30, width: bw } : { below: false, left: W - bw - 12, tail: bw - 54, width: bw };
  }
  const abs = Math.min(vw - bw - 16, Math.max(16, pos.x - bw / 2));
  return {
    below: pos.y < 250,
    left: Math.round(abs - (pos.x - W / 2)),
    tail: Math.round(Math.min(bw - 44, Math.max(20, pos.x - abs - 12))),
    width: bw,
  };
}

/**
 * Pico guide (plan Phase 3, mockup "Pico guide"): an 8-tip tour that runs once on the home
 * page (remembered per user: localStorage is-k5-tour:{userId}) and can be replayed with
 * "Ask Pico". For each tip the buddy walks next to its element, spotlights it, and its
 * speech bubble points at the buddy. Pico only talks after a tap (Next / Hear it), in the
 * student's voice, and never when the buddy voice is turned off.
 */
export function PicoGuide({ userId, firstName }) {
  const { preferences, updatePreference, themeProps } = useAppearance();
  const { speak, stop, speaking, supported } = useSpeech();
  const tourKey = `${TOUR_KEY}${userId}`;
  const seen = useSyncExternalStore(noSubscribe, () => readLocal(tourKey), () => "1");
  const [state, setState] = useState({ open: null, index: 0, say: null });
  const [pos, setPos] = useState(null);
  const [walking, setWalking] = useState(false);
  const [faceLeft, setFaceLeft] = useState(false);
  const posRef = useRef(null);
  const buddy = BUDDIES[preferences.buddy] || BUDDIES.pico;
  const steps = tourSteps(firstName, buddy.name);
  const open = state.open ?? !seen;
  const step = steps[state.index];
  // A page can make the buddy explain something (e.g. a colour clue) between tour tips.
  const tip = state.say || step;
  const pin = tip?.pin ?? null;
  const sayId = state.say?.id ?? null;
  const leftHand = themeProps["data-hand"] === "left";
  const reduced = themeProps["data-motion"] === "reduced";
  const mobile = useSyncExternalStore(subscribeMobile, isMobileView, () => false);

  // Each tip: spotlight + scroll the element into a comfortable spot, then walk there.
  useEffect(() => {
    if (!open) return;
    const el = pinEl(pin);
    if (el) {
      el.classList.add("k5-spot");
      if (!FIXED_PINS.has(pin)) {
        const r = el.getBoundingClientRect();
        if (r.top < 150 || r.top > window.innerHeight * 0.55) {
          window.scrollTo({ top: Math.max(0, window.scrollY + r.top - 260), behavior: reduced ? "auto" : "smooth" });
        }
      }
    }
    const move = { pin, leftHand, posRef, setPos, setFaceLeft };
    const walkOn = setTimeout(() => setWalking(true), 0);
    const first = setTimeout(() => moveBuddy(move, true), 40);
    const settle = setTimeout(() => moveBuddy(move, false), 800);
    const walkOff = setTimeout(() => setWalking(false), 1600);
    return () => {
      el?.classList.remove("k5-spot");
      [walkOn, first, settle, walkOff].forEach(clearTimeout);
    };
  }, [open, pin, sayId, leftHand, reduced]);

  // picoSay(): walk to the element and say the text (it comes from a tap, so speaking is allowed).
  useEffect(() => {
    const onSay = (e) => {
      const { text, pin: target } = e.detail || {};
      if (!text) return;
      setState((s) => ({ ...s, open: true, say: { text, pin: target || null, id: Date.now() } }));
      speak(text);
    };
    window.addEventListener(PICO_SAY_EVENT, onSay);
    return () => window.removeEventListener(PICO_SAY_EVENT, onSay);
  }, [speak]);

  // Stay next to the element while the page scrolls or resizes.
  useEffect(() => {
    if (!open) return;
    const follow = () => moveBuddy({ pin, leftHand, posRef, setPos, setFaceLeft }, false);
    window.addEventListener("scroll", follow, { passive: true });
    window.addEventListener("resize", follow);
    return () => {
      window.removeEventListener("scroll", follow);
      window.removeEventListener("resize", follow);
    };
  }, [open, pin, leftHand]);

  const finish = () => {
    stop();
    try {
      window.localStorage.setItem(tourKey, "done");
    } catch {
      // storage unavailable: the tour may start again next visit
    }
    posRef.current = null;
    setPos(null);
    setState({ open: false, index: 0, say: null });
  };
  const next = () => {
    let i = state.index + 1;
    while (i < steps.length && !onPage(steps[i].pin)) i += 1;
    if (i >= steps.length) return finish();
    setState({ open: true, index: i, say: null });
    speak(steps[i].text);
  };
  const restart = () => {
    setState({ open: true, index: 0, say: null });
    speak(steps[0].text);
  };
  const shown = steps.filter((s) => onPage(s.pin));
  const position = Math.max(1, shown.indexOf(step) + 1);

  if (!open && mobile) {
    // Mobile (mockup .pinclosed): a 62px round buddy button above the bottom tab bar.
    return (
      <button
        type="button"
        onClick={restart}
        aria-label={`Ask ${buddy.name}`}
        className={`fixed bottom-[100px] z-40 flex h-[62px] w-[62px] cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-ink bg-k5-card p-1 shadow-[0_4px_0_var(--k5-ink)] ${leftHand ? "left-3" : "right-3"}`}
      >
        <PicoMascot buddy={preferences.buddy} width={48} full={false} />
      </button>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={restart}
        className={`fixed bottom-4 z-40 flex min-h-[60px] cursor-pointer items-center gap-2.5 rounded-full border-[3px] border-k5-ink bg-k5-card py-1.5 pl-1.5 pr-5 font-k5-display text-xl font-semibold text-k5-ink shadow-[0_5px_0_var(--k5-ink)] ${
          leftHand ? "left-4" : "right-4"
        }`}
      >
        <PicoMascot buddy={preferences.buddy} width={46} full={false} />
        Ask {buddy.name}
      </button>
    );
  }

  const bubbleBody = (
    <>
    <div className="relative flex items-center justify-between gap-2">
      <span className="text-sm font-black uppercase tracking-[0.08em] text-k5-vi">{buddy.name} says</span>
      <div className="flex gap-1.5">
        {supported && (
          <button
            type="button"
            aria-pressed={preferences.speech === "on"}
            aria-label={preferences.speech === "on" ? `Turn ${buddy.name}'s voice off` : `Turn ${buddy.name}'s voice on`}
            onClick={() => {
              if (preferences.speech === "on") stop();
              updatePreference("speech", preferences.speech === "on" ? "off" : "on");
            }}
            className={`flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line ${preferences.speech === "on" ? "bg-k5-act text-k5-acx" : "bg-k5-card text-k5-mut"}`}
          >
            {preferences.speech === "on" ? <Volume2 className="h-5 w-5" aria-hidden="true" /> : <VolumeX className="h-5 w-5" aria-hidden="true" />}
          </button>
        )}
        <button
          type="button"
          onClick={finish}
          aria-label={`Hide ${buddy.name}`}
          className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card text-k5-mut"
        >
          <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
    </div>
    <p aria-live="polite" className="relative m-0 font-k5-display text-[21px] font-medium leading-[1.3] text-k5-ink">
      {tip.text}
    </p>
    <div className="relative flex items-center justify-between gap-2">
      {supported ? (
        <button
          type="button"
          onClick={() => speak(tip.text, { force: true })}
          className="flex min-h-[46px] cursor-pointer items-center gap-1.5 rounded-full border-[3px] border-k5-line bg-k5-card px-3.5 text-[15px] font-black text-k5-acx"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
          Hear it
        </button>
      ) : (
        <span />
      )}
      <span className="text-sm font-extrabold text-k5-mut">
        {position} / {shown.length}
      </span>
      <button
        type="button"
        onClick={next}
        className="flex min-h-[46px] cursor-pointer items-center gap-1.5 rounded-full border-none bg-[#FFC531] pl-[18px] pr-3.5 font-k5-display text-lg font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A]"
      >
        {position >= shown.length ? "All done" : "Next"}
        <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
      </button>
    </div>
    </>
  );

  if (mobile) {
    // Mobile (mockup .pinwrap): no walking — the buddy waits above the tab bar as a round button
    // and the bubble spans the screen above it; the tip's element is still spotlighted.
    return (
      <>
        <div
          role="dialog"
          aria-label={`${buddy.name} says`}
          className="k5-bubble fixed inset-x-3 bottom-[174px] z-40 box-border flex flex-col gap-3 rounded-[26px] border-[3px] border-k5-ink bg-k5-card px-4 py-3.5 shadow-[0_6px_0_var(--k5-ink)]"
        >
          {bubbleBody}
        </div>
        <button
          type="button"
          onClick={() => speak(tip.text, { force: true })}
          aria-label={`${buddy.name}, your calendar buddy. Tap to hear ${buddy.name}.`}
          className={`fixed bottom-[100px] z-40 flex h-[62px] w-[62px] cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-ink bg-k5-card p-1 shadow-[0_4px_0_var(--k5-ink)] ${leftHand ? "left-3" : "right-3"}`}
        >
          <PicoMascot buddy={preferences.buddy} width={48} full={false} talking={speaking} />
        </button>
      </>
    );
  }

  if (!pos) return null;
  const bubble = bubbleLayout(pos, leftHand);

  return (
    <div
      className="fixed z-40"
      style={{
        left: pos.x,
        top: pos.y,
        width: W,
        height: H,
        marginLeft: -W / 2,
        transition: walking && !reduced ? "left 1.4s ease-in-out, top 1.4s ease-in-out" : "none",
      }}
    >
      <div
        role="dialog"
        aria-label={`${buddy.name} says`}
        className="k5-bubble absolute box-border flex flex-col gap-3 rounded-[26px] border-[3px] border-k5-ink bg-k5-card px-[18px] py-4 shadow-[0_6px_0_var(--k5-ink)]"
        style={{ left: bubble.left, width: bubble.width, ...(bubble.below ? { top: H + 10 } : { bottom: H + 10 }) }}
      >
        <span
          aria-hidden="true"
          className="absolute block h-6 w-6 border-b-[3px] border-r-[3px] border-k5-ink bg-k5-card"
          style={{ left: bubble.tail, transform: `rotate(${bubble.below ? 225 : 45}deg)`, ...(bubble.below ? { top: -15 } : { bottom: -15 }) }}
        />
        {bubbleBody}
      </div>
      <button
        type="button"
        onClick={() => speak(tip.text, { force: true })}
        aria-label={`${buddy.name}, your calendar buddy. Tap to hear ${buddy.name}.`}
        className="block h-full w-full cursor-pointer border-none bg-transparent p-0"
        style={{ transform: `scaleX(${faceLeft ? -1 : 1})`, transition: "transform .2s" }}
      >
        <PicoMascot buddy={preferences.buddy} width={W} talking={speaking} walking={walking} />
      </button>
    </div>
  );
}
