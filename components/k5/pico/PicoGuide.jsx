"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { INBOX_TIP } from "@/utils/inbox";
import { usePathname } from "next/navigation";
import { ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { BUDDIES, voiceOf } from "@/constant/appearance";
import { PICO_SAY_EVENT, usePicoLive } from "@/components/k5/pico/picoEvents";
import { CLUBS } from "@/constant/Clubs";
import { preparePicoClips } from "@/utils/picoVoice";

const TOUR_KEY = "is-k5-tour:";
const noSubscribe = () => () => {};
function readLocal(key) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

// The 8 tips of the mockup tour; `pin` is the data-pin of the element the buddy spotlights.
// A tip whose element is not on the page (no live class right now) is skipped.
// `liveName` is the title of the class that is live right now (real data), when there is one.
function tourSteps(firstName, buddyName, liveName) {
  return [
    { pin: null, text: `Hi${firstName ? ` ${firstName}` : ""}! I'm ${buddyName}, your calendar buddy. Tap Next and I'll show you around!` },
    { pin: "live", text: `${liveName ? `Your ${liveName} class` : "Your class"} is live right now! Tap the green Join class button to go in.` },
    { pin: "mini", text: "This little calendar shows the whole month. A dot under a day means something is planned." },
    { pin: "views", text: "Tap Today, Week or Month to see your plans in different ways." },
    { pin: "look", text: "Tap the palette button to pick your favorite color, night mode, letters and text size!" },
    { pin: "clues", text: "Color clues tell you what each box means. Tap a clue and I'll explain it!" },
    { pin: "side", text: "Use the side menu to book classes, see your teacher, join clubs and more. Hold and drag a button to move your favorites to the top!" },
    { pin: "msg", text: "Need help? Tap the green Talk to us button to chat with us!" },
  ];
}
// One tip per page (mockup tips("teacher") ...): the buddy opens with it when the student arrives there.
// Key = the last part of the page address. Home keeps the 8-tip tour; Book a Class has its own guide.
const PAGE_TIPS = {
  "syllabus-assigned-teacher": "These are your courses! Tap See course calendar to see every lesson and when it is due.",
  "student-transcript": "Tap the dots button to see your transcript.",
  "student-handbook": "This book tells you all about your school!",
  "student-login-details": "Here you can see every time you logged in!",
  "academic-year-extention": "Tap a course to see how you can extend it.",
  "student-video-library": "Watch your lessons in order, one by one!",
  "my-certificates": "Need a certificate? Tap Request a certificate and the school will make it for you.",
  "student-progress-report": "Here’s how you’re doing in every course!",
  "progress-detail": "Tap View to open a full report for that week!",
  "my-profile": "This page is all about you! Keep your details up to date.",
  inbox: INBOX_TIP,
  "inbox-compose": INBOX_TIP,
  "student-addon": "Want more classes? Pick a plan, then ask a grown-up to buy it!",
  cart: "Want more classes? Pick a plan, then ask a grown-up to buy it!",
  // Every club page (Language, Social and E-Sports clubs).
  // No spotlight on the side menu here: the buddy only says it.
  ...Object.fromEntries(Object.keys(CLUBS).map((pageLink) => [pageLink, "Pick a club from the menu and join the fun!"])),
};
const MOBILE_QUERY = "(max-width: 760px)";
const subscribeMobile = (callback) => {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
};
const isMobileView = () => window.matchMedia(MOBILE_QUERY).matches;
const pinEl = (pin) => (pin && typeof document !== "undefined" ? document.querySelector(`[data-pin="${pin}"]`) : null);
const onPage = (pin) => !pin || Boolean(pinEl(pin));

// Elements that never scroll (fixed chrome) — no page scroll before spotlighting them.
const FIXED_PINS = new Set(["side", "msg", "look"]);

// A dialog (look, Get the App, live popup, joining a class...) or the opened side menu is on top:
// the spotlight steps aside until it is gone.
const coveredByDialog = () =>
  Boolean(document.querySelector('#k5-sidenav[data-open="true"]')) ||
  // Only real modals count: the buddy bubble and the (non-modal) cookie banner do not hide the spotlight.
  [...document.querySelectorAll('[role="alertdialog"],[role="dialog"][aria-modal="true"],[role="dialog"][data-open],[role="dialog"][data-state="open"]')].some((d) => !d.classList.contains("k5-bubble") && d.getBoundingClientRect().width > 0);

/**
 * Mockup .spothole: the page dims and only the tip's element shines inside a yellow ring
 * (8px around it, 26px corners), sliding smoothly from one tip to the next.
 */
function SpotHole({ pin, active }) {
  const [box, setBox] = useState(null);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      const el = active ? pinEl(pin) : null;
      const r = el && !coveredByDialog() ? el.getBoundingClientRect() : null;
      const next = r && (r.width || r.height) ? { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } : null;
      setBox((prev) => (prev && next && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h ? prev : next));
    };
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    const timer = setInterval(measure, 300);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [active, pin]);
  if (!active || !box) return null;
  return (
    <div
      aria-hidden="true"
      className="k5-spothole pointer-events-none fixed z-[38] rounded-[26px]"
      style={{ left: box.x - 8, top: box.y - 8, width: box.w + 16, height: box.h + 16, boxShadow: "0 0 0 4px #FFC531, 0 0 0 200vmax rgba(10, 16, 34, 0.55)" }}
    />
  );
}

/**
 * The buddy (plan Phase 3, mockup "pinwrap"): a small companion that always stands in the bottom
 * corner (right, or left for left-handed students) and bobs. Tapping it opens a speech bubble
 * beside it with an 8-tip tour that runs once on the home page (remembered per user:
 * localStorage is-k5-tour:{userId}); each tip spotlights its element. "Hear it" / tapping the
 * buddy speaks in the student's voice (and turns the voice back on), the red X hides the bubble
 * only — the buddy stays and a tap brings it back. Below 760px the bubble opens above the buddy on tap.
 */
export function PicoGuide({ userId, firstName, home = true }) {
  const { preferences, updatePreference, themeProps } = useAppearance();
  const { speak, stop, speaking, supported, word } = useSpeech();
  const tourKey = `${TOUR_KEY}${userId}`;
  const seen = useSyncExternalStore(noSubscribe, () => readLocal(tourKey), () => "1");
  const [state, setState] = useState({ open: null, index: 0, say: null, skipLive: false, pageTip: false });
  const live = usePicoLive();
  const pathname = usePathname();
  // The Book a Class page has its own buddy guide: here the buddy stays, its bubble never opens.
  const onBook = pathname.includes("book-a-session");
  const [tipOn, setTipOn] = useState(false);
  const buddy = BUDDIES[preferences.buddy] || BUDDIES.pico;
  const steps = tourSteps(firstName, buddy.name, live.name);
  const mobile = useSyncExternalStore(subscribeMobile, isMobileView, () => false);
  // The first tour opens by itself once the plan is known; the buddy stays quiet while the "LIVE NOW" popup waits.
  const autoOpen = home && !seen && live.ready;
  // Desktop: open for the first tour and after a tap; mobile: while tapped open (and after the buddy speaks up).
  const wanted = mobile ? tipOn : (state.open ?? autoOpen);
  const open = wanted && !live.pending && !onBook;
  const step = steps[state.index];
  // A page can make the buddy explain something (e.g. a colour clue) between tour tips.
  const tip = state.say || step;
  const pin = tip?.pin ?? null;
  const leftHand = themeProps["data-hand"] === "left";
  const reduced = themeProps["data-motion"] === "reduced";

  // Arriving on a page that has a tip: the buddy opens with it. Leaving it closes that tip again.
  const pageSegment = pathname.split("/").filter(Boolean).pop();
  const tipDef = PAGE_TIPS[pageSegment];
  const pageTip = tipDef ? (typeof tipDef === "string" ? { text: tipDef, pin: null } : tipDef) : null;
  // One key per page, so moving between two pages with the same tip (two clubs) opens it again.
  // ...and only once the menu and the page's content are really there (no tip, no spotlight over a loading page).
  const tipKey = pageTip && live.menuReady && live.contentReady ? pageSegment : null;
  const [tipFor, setTipFor] = useState(null);
  if (tipKey !== tipFor) {
    // Adjusted while rendering (React's way to reset state when an input changes), not in an effect.
    setTipFor(tipKey);
    if (pageTip) {
      setState((s) => ({ ...s, open: true, index: 0, say: { text: pageTip.text, pin: pageTip.pin, id: `page-${pageSegment}` }, skipLive: false, pageTip: true }));
      setTipOn(true);
    } else {
      setState((s) => (s.pageTip ? { ...s, open: false, say: null, pageTip: false } : s));
      setTipOn(false);
    }
  }
  // The buddy's voice for this page is got ready once the page is idle: the page's tip, and on the home page the tour
  // tips, so the student's tap (Next, Hear it) plays at once.
  const voiceTexts = [pageTip?.text, ...(home ? steps.map((s) => s.text) : [])].filter(Boolean).join("|");
  // preparePicoClips waits for the page to finish loading and the browser to be idle, so the page always comes first.
  // In the voice and speed the student picked (a new pick gets its own clips).
  const { voice: voicePick, voiceSpeed } = preferences;
  useEffect(() => preparePicoClips(voiceTexts.split("|"), voiceOf(voicePick, voiceSpeed)), [voiceTexts, voicePick, voiceSpeed]);
  // The buddy also says it out loud (the student just tapped to get here, so speaking is allowed).
  useEffect(() => {
    if (pageTip) speak(pageTip.text);
    // Once per arrival, not whenever the voice settings change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipKey]);

  // Each tip: spotlight its element and scroll it into a comfortable spot.
  useEffect(() => {
    if (!open) return;
    const el = pinEl(pin);
    if (!el) return;
    if (!FIXED_PINS.has(pin)) {
      const r = el.getBoundingClientRect();
      if (r.top < 150 || r.top > window.innerHeight * 0.55) {
        // On a phone the bubble covers the lower half, so the element is lifted close to the header.
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - (mobile ? 120 : 260)), behavior: reduced ? "auto" : "smooth" });
      }
    }
  }, [open, pin, state.say?.id, reduced, mobile]);

  // picoSay(): the buddy opens and says the text (it comes from a tap, so speaking is allowed).
  useEffect(() => {
    const onSay = (e) => {
      const { text, pin: target, intro, skipLive, above } = e.detail || {};
      if (!text) return;
      setState((s) => ({
        ...s,
        open: true,
        index: intro ? 0 : s.index,
        skipLive: intro ? Boolean(skipLive) : s.skipLive,
        say: { text, pin: target || null, id: Date.now(), above: Boolean(above) },
      }));
      setTipOn(true);
      speak(text);
    };
    window.addEventListener(PICO_SAY_EVENT, onSay);
    return () => window.removeEventListener(PICO_SAY_EVENT, onSay);
  }, [speak]);

  if (preferences.buddyEnabled === "off") return null;

  const markSeen = () => {
    try {
      window.localStorage.setItem(tourKey, "done");
    } catch {
      // storage unavailable: the tour may open again next visit
    }
  };
  // Red X: closes the bubble only. The buddy stays; a tap brings the same tip back.
  const hide = () => {
    stop();
    markSeen();
    setTipOn(false);
    setState((s) => ({ ...s, open: false }));
  };
  const finish = () => {
    stop();
    markSeen();
    setTipOn(false);
    setState({ open: false, index: 0, say: null, skipLive: false, pageTip: false });
  };
  const next = () => {
    if (state.pageTip) return finish();
    let i = state.index + 1;
    // After joining the live class, the "class is live" tip is skipped.
    while (i < steps.length && (!onPage(steps[i].pin) || (state.skipLive && steps[i].pin === "live"))) i += 1;
    if (i >= steps.length) return finish();
    setState((s) => ({ ...s, open: true, index: i, say: null }));
    speak(steps[i].text);
  };
  // Mockup hear / pinTap: asking the buddy to talk also turns its voice back on.
  const hear = () => {
    if (preferences.speech !== "on") updatePreference("speech", "on");
    speak(tip.text, { force: true });
  };
  // Mockup pinTap: closed bubble opens again; an open one speaks. On a phone a tap toggles the bubble.
  const tap = () => {
    if (onBook) return;
    if (mobile) {
      if (tipOn) {
        setTipOn(false);
        stop();
      } else {
        setTipOn(true);
        if (preferences.speech === "on") speak(tip.text);
      }
      return;
    }
    if (!open) {
      setState((s) => ({ ...s, open: true }));
      return;
    }
    hear();
  };
  const shown = state.pageTip ? [step] : steps.filter((s) => onPage(s.pin) && !(state.skipLive && s.pin === "live"));
  const position = Math.max(1, shown.indexOf(step) + 1);

  return (
    <>
    <SpotHole pin={pin} active={open} />
    <div
      className={`fixed bottom-[112px] ${state.say?.above ? "z-[60]" : "z-40"} h-[86px] w-[88px] max-[760px]:bottom-[150px] max-[760px]:h-[62px] max-[760px]:w-[58px] ${
        leftHand ? "left-4 max-[760px]:left-3.5" : "right-4 max-[760px]:right-3.5"
      }`}
    >
      {open && (
        <div
          role="dialog"
          aria-label={`${buddy.name} says`}
          className={`k5-bubble absolute bottom-0 box-border flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2.5 rounded-[26px] border-[3px] border-k5-ink bg-k5-card px-[18px] py-4 shadow-[0_6px_0_var(--k5-ink)] max-[760px]:fixed max-[760px]:inset-x-3 max-[760px]:bottom-[224px] max-[760px]:w-auto max-[760px]:max-w-none ${
            leftHand ? "left-[calc(100%+14px)]" : "right-[calc(100%+14px)]"
          } max-[760px]:left-3 max-[760px]:right-3`}
        >
          <span
            aria-hidden="true"
            className={`absolute bottom-[30px] block h-6 w-6 border-b-[3px] border-r-[3px] border-k5-ink bg-k5-card max-[760px]:hidden ${
              leftHand ? "-left-[15px] rotate-[135deg]" : "-right-[15px] -rotate-45"
            }`}
          />
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
                onClick={hide}
                aria-label={`Hide ${buddy.name}`}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-[3px] border-[#D7263D] bg-[#D7263D] text-white shadow-[0_3px_0_#9E1B2C]"
              >
                <X className="h-4 w-4" strokeWidth={3.5} aria-hidden="true" />
              </button>
            </div>
          </div>
          <p aria-live="polite" className="relative m-0 font-k5-display text-[21px] font-medium leading-[1.3] text-k5-ink">
            {word && word.text === tip.text.replace(/\s+/g, " ").trim()
              ? // Recorded voice: the word being said lights up (LoginHighlight.jsp spokenHtml / follow).
                tip.text
                  .trim()
                  .split(/\s+/)
                  .map((w, i, all) => (
                    <span key={i} className={i === word.n ? "rounded bg-[#FFC531] text-[#3A2A00]" : undefined}>
                      {w}
                      {i < all.length - 1 ? " " : ""}
                    </span>
                  ))
              : tip.text}
          </p>
          <div className="relative flex items-center justify-between gap-2">
            {supported ? (
              <button
                type="button"
                onClick={hear}
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
        </div>
      )}
      <button
        type="button"
        onClick={tap}
        aria-label={`${buddy.name}, your calendar buddy. Tap to hear ${buddy.name}.`}
        className="k5-pin-bob flex h-full w-full cursor-pointer items-end justify-center border-none bg-transparent p-0 max-[760px]:[&_svg]:!h-[60px] max-[760px]:[&_svg]:!w-12"
      >
        <PicoMascot buddy={preferences.buddy} width={66} talking={speaking} />
      </button>
    </div>
    </>
  );
}
