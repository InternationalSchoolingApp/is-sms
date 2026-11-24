"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronRight, Volume2, VolumeX, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { labelKey } from "@/i18n/labels";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { useSpeech } from "@/components/k5/pico/useSpeech";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useChristmas } from "@/components/k5/christmas/ChristmasProvider";
import { BUDDIES, voiceOf } from "@/constant/appearance";
import { PICO_SAY_EVENT, usePicoLive } from "@/components/k5/pico/picoEvents";
import { HOME_MODULE, isClubModule, isLanguageClub, picoModuleFor, picoWelcomeText } from "@/constant/picoModules";
import { TOUR_GET_APP_KEY, hasPicoModuleCookie, hasPicoWelcomeCookie, setPicoModuleCookie, setPicoWelcomeCookie } from "@/utils/picoCookies";
import { preparePicoClips } from "@/utils/picoVoice";

const noSubscribe = () => () => {};

// A dialog the student has to deal with first (profile, training, password...): the first welcome waits until it is gone.
const OTHER_POPUPS = '[data-blocking-popup], [data-slot="dialog-content"], dialog[open]';
// A welcome that was cancelled by something other than the student (React Strict Mode, a route change) is tried again, a few times.
const WELCOME_TRIES = 3;
// Pages whose very first visit is a 2-step welcome tour (welcome + the page's own explanation), like the dashboard's tour.
const WELCOME_TOUR_PAGES = new Set(["re-enrollment"]);

// The tips of the home tour (the mockup's 8 plus inbox, LMS, announcements, news, diary, sibling, profile); `pin` is the
// data-pin of the element the buddy spotlights. A tip whose element is not on the page (no live class right now, no
// sibling card, the header buttons on a phone) is skipped.
// `liveName` is the title of the class that is live right now (real data), when there is one.
// `welcome`: the very first tour of this student - the buddy also welcomes them to the school (text: constant/picoModules.js).
// t = useTranslations("pico"): the tips are pico.tour.<pin> in the dashboard language.
// balanced: the Balanced (Middle) look draws the rail buttons in one soft blue, so the "Talk to us" tip drops the word "green".
function tourSteps(firstName, buddyName, liveName, welcome, schoolName, t, balanced = false) {
  return [
    {
      pin: null,
      text: welcome
        ? picoWelcomeText({ firstName, schoolName, buddyName, tour: true, t })
        : firstName
          ? t("tour.hiName", { name: firstName, buddy: buddyName })
          : t("tour.hi", { buddy: buddyName }),
    },
    { pin: "calendar", text: t("tour.calendar") },
    { pin: "live", text: liveName ? t("tour.liveName", { name: liveName }) : t("tour.live") },
    { pin: "mini", text: t("tour.mini") },
    { pin: "views", text: t("tour.views") },
    { pin: "prevnext", text: t("tour.prevnext") },
    { pin: "clues", text: t("tour.clues") },
    { pin: "side", text: t("tour.side") },
    { pin: "hero", text: t("tour.hero") },
    { pin: "goal", text: t("tour.goal") },
    { pin: "performance", text: t("tour.performance") },
    { pin: "assignments", text: t("tour.assignments") },
    { pin: "inbox", text: t("tour.inbox") },
    { pin: "look", text: t("tour.look") },
    { pin: "getApp", text: t("tour.getApp") },
    { pin: "lms", text: t("tour.lms") },
    { pin: "profile", text: t("tour.profile") },
    // The Balanced (Middle) look draws every rail button in the same soft blue, so only Playful and Mature call it green.
    { pin: "msg", text: balanced ? t("tour.msgBalanced") : t("tour.msg") },
    { pin: "announcements", text: t("tour.announcements") },
    { pin: "news", text: t("tour.news") },
    { pin: "diary", text: t("tour.diary") },
  ];
}

/**
 * A module's line (constant/picoModules.js) in the dashboard language: pico.modules.<key> / pico.clubTips.<key> with
 * key = labelKey(pageLink); a club without its own line gets pico.clubFallback. Anything unknown keeps the English text.
 */
function translatedModule(module, segment, home, t) {
  if (!module) return module;
  if (home) return { ...module, text: t("modules.home") };
  const key = labelKey(segment);
  if (key && t.has(`modules.${key}`)) return { ...module, text: t(`modules.${key}`) };
  if (isClubModule(segment)) return { ...module, text: key && t.has(`clubTips.${key}`) ? t(`clubTips.${key}`) : t("clubFallback") };
  return module;
}
// My Classes and Activities: once the page has loaded the buddy walks through it - the plan, the class that is live (only when there
// is one: a tip whose element is not on the page is skipped), the month calendar, the courses, the Today / Week / Month switch and the
// colour clues. The same tour plays on a tap on the buddy. t = useTranslations("pico").
function classesTourSteps(t, liveName, dayEmpty = false, holidayName = "") {
  // The plan tip must not promise classes on a day that has none (a free day or a holiday).
  const planText = dayEmpty
    ? holidayName
      ? t("classesTour.planHoliday", { name: holidayName })
      : t("classesTour.planFree")
    : t("classesTour.plan");
  return [
    { pin: "calendar", text: planText },
    { pin: "live", text: liveName ? t("tour.liveName", { name: liveName }) : t("tour.live") },
    { pin: "mini", text: t("classesTour.mini") },
    { pin: "courses", text: t("classesTour.courses") },
    { pin: "views", text: t("tour.views") },
    { pin: "clues", text: t("tour.clues") },
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
// The header buttons and the side menu are not on screen on a phone (the buttons move into the "More" menu, the menu is a drawer): a tip about one is skipped, not shown without its spotlight.
const SKIP_WHEN_HIDDEN = new Set(["lms", "inbox", "profile", "getApp", "mini", "look", "side"]);
const onPage = (pin) => {
  if (!pin) return true;
  const el = pinEl(pin);
  if (!el) return false;
  if (SKIP_WHEN_HIDDEN.has(pin)) {
    const r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }
  return true;
};

// Elements that never scroll (fixed chrome) — no page scroll before spotlighting them.
const FIXED_PINS = new Set(["side", "msg", "look", "getApp", "lms", "inbox", "profile", "announcements", "news", "diary"]);

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
 * corner (right, or left for left-handed students) and bobs. Three behaviours that work together but do not depend on each other:
 *  1. The first welcome: once per student per BROWSER (cookie pico_welcome_completed_{userId}, utils/picoCookies.js), for a
 *     student who has completed enrollment (the dashboard is only reached by one, and the shell passes `welcomeEligible`),
 *     said once the dashboard is really on screen. On the home page it opens the 8-tip tour. If the browser refuses to
 *     speak (autoplay before any touch) the cookie is NOT set: the welcome is said at the student's first tap or key press.
 *  2. A module explanation by itself: arriving on a page, the buddy explains it once the page has finished loading
 *     (usePicoContentReady); the text is in constant/picoModules.js.
 *  3. A tap on the buddy explains the page the student is on (waiting for it to finish loading first).
 * Everything is said through one speech queue (useSpeech): a new sentence cancels the old one, so two never overlap and a
 * sentence from a page the student already left is never said. "Hear it" speaks in the student's voice (and turns the
 * voice back on), the red X hides the bubble only - the buddy stays and a tap brings it back. Below 760px the bubble
 * opens above the buddy on tap.
 */
export function PicoGuide({ userId, firstName, schoolName, home = true, welcomeEligible = false }) {
  const t = useTranslations("pico");
  const { preferences, updatePreference, themeProps } = useAppearance();
  const { speak, stop, speaking, supported, word } = useSpeech();
  // The welcome cookie (server snapshot "seen": nothing is decided before the browser is here).
  const cookieSeen = useSyncExternalStore(noSubscribe, () => hasPicoWelcomeCookie(userId), () => true);
  const [welcomedNow, setWelcomedNow] = useState(false);
  const welcomeDue = welcomeEligible && !cookieSeen && !welcomedNow;
  const seen = !welcomeEligible || cookieSeen || welcomedNow;
  // Decided once the buddy knows it owes the welcome (kept in state so the words do not change when it is marked as done).
  const [welcome, setWelcome] = useState(false);
  if (welcomeDue && !welcome) setWelcome(true);
  const [state, setState] = useState({ open: null, index: 0, say: null, skipLive: false, pageTip: false });
  const live = usePicoLive();
  // 25 December: Pico wears a Santa hat.
  const { festive } = useChristmas();
  // The student's look (the one picked in the Look dialog, else their grade's): Middle = Balanced, High = Mature.
  const { isMiddle, isHigh } = useDashboardContext();
  const pathname = usePathname();
  // The Book a Class page has its own buddy guide: here the buddy stays, its bubble never opens.
  const onBook = pathname.includes("book-a-session");
  const [tipOn, setTipOn] = useState(false);
  const buddy = BUDDIES[preferences.buddy] || BUDDIES.pico;
  const pageSegment = pathname.split("/").filter(Boolean).pop();
  // A student's first visit to one of these pages is a short tour of its own: the welcome, then what the page is for (2 steps).
  const tourPage = !home && welcome && WELCOME_TOUR_PAGES.has(pageSegment) ? translatedModule(picoModuleFor(pageSegment), pageSegment, false, t) : null;
  const classesTour = !home && pageSegment === "my-classes";
  const steps = tourPage
    ? [
        { pin: null, text: picoWelcomeText({ firstName, schoolName, buddyName: buddy.name, tour: false, t }) },
        { pin: null, text: tourPage.text },
      ]
    : classesTour
      ? classesTourSteps(t, live.name, live.dayEmpty, live.holidayName)
      : tourSteps(firstName, buddy.name, live.name, welcome, schoolName, t, isMiddle && !isHigh);
  const mobile = useSyncExternalStore(subscribeMobile, isMobileView, () => false);
  // No dialog is open on this page (checked by the effect below, only while the buddy has something to say by itself).
  // Kept as "the page it was seen clear on", so a new page is never taken as clear before it has been looked at.
  const [clearAt, setClearAt] = useState(null);
  const clear = clearAt === pageSegment;
  // The first tour opens by itself once the plan is known and no dialog is open; the buddy stays quiet while the "LIVE NOW" popup waits.
  const autoOpen = home && !seen && live.ready && clear;
  // Desktop: open for the first tour and after a tap; mobile: while tapped open (and after the buddy speaks up).
  const wanted = mobile ? tipOn : (state.open ?? autoOpen);
  const open = wanted && !live.pending && !onBook;
  const step = steps[state.index];
  // A page can make the buddy explain something (e.g. a colour clue) between tour tips.
  const tip = state.say || step;
  const pin = tip?.pin ?? null;
  const leftHand = themeProps["data-hand"] === "left";
  const reduced = themeProps["data-motion"] === "reduced";

  // ---- What the student is looking at, and whether it has finished loading ----
  const moduleNow = translatedModule(home ? HOME_MODULE : picoModuleFor(pageSegment), pageSegment, home, t);
  const noModuleText = t("noModule");
  // Real content on screen: the home plan has loaded, or the page said so (usePicoContentReady); the left menu has its items.
  // My Classes is the planner itself: its plan has loaded when the planner says so (live.ready), like the home page used to.
  const moduleReady = live.menuReady && (home || classesTour ? live.ready : live.contentReady);

  // ---- 1. The first welcome ----
  const [welcomeSkip, setWelcomeSkip] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const welcomeRun = useRef(false);
  const userActed = useRef(false);
  const retryOff = useRef(null);
  // The page the welcome was said on does not also explain itself (one voice at a time).
  if (welcomeSkip && welcomeSkip !== pageSegment) setWelcomeSkip(null);

  // On a club page the first hello is about that club (its own line from constant/picoModules.js), not the general welcome;
  // a Language Club line already starts with a hello (Bonjour!...), so it gets no "Hello {name}!" in front.
  const clubWelcome = !home && isClubModule(pageSegment);
  const welcomeText = home
    ? steps[0].text
    : clubWelcome
      ? isLanguageClub(pageSegment)
        ? moduleNow.text
        : t("clubHello", { hello: firstName ? t("welcome.helloName", { name: firstName }) : t("welcome.hello"), text: moduleNow.text })
      : picoWelcomeText({ firstName, schoolName, buddyName: buddy.name, tour: false, t });
  const welcomeReady = welcomeDue && moduleReady && !live.pending && !onBook;

  const finishWelcome = () => {
    retryOff.current?.();
    setPicoWelcomeCookie(userId);
    // The club's own line was the welcome, so the club page does not say it again by itself next time.
    if (clubWelcome || tourPage) setPicoModuleCookie(userId, pageSegment);
    setWelcomedNow(true);
  };

  const startWelcome = () => {
    if (welcomeRun.current) return;
    welcomeRun.current = true;
    const text = welcomeText;
    // The bubble shows the welcome (on the home page it is the tour's first tip).
    if (home) setState((s) => ({ ...s, open: true, index: 0, say: null }));
    else if (tourPage) setState((s) => ({ ...s, open: true, index: 0, say: null, pageTip: false, pageTour: true }));
    else setState((s) => ({ ...s, open: true, index: 0, say: { text, pin: null, id: "welcome" }, pageTip: true }));
    setTipOn(true);
    setWelcomeSkip(pageSegment);
    // Voice off (or no speech in this browser): the welcome is the bubble, and it is on screen.
    if (preferences.speech !== "on" || !supported) {
      finishWelcome();
      return;
    }
    // By itself: only in the recorded voice, once /api/pico-voice has it (never the browser voice).
    speak(text, { clipOnly: true }).then((result) => {
      // "unavailable": the recorded voice could not be made - the bubble showed the welcome, so it counts as delivered.
      if (result === "started" || result === "unavailable") {
        finishWelcome();
      } else if (result === "blocked") {
        // The browser refused to speak before the student touched the page: nothing is marked; the welcome is said at the
        // first tap or key press, and only then is it marked.
        if (retryOff.current) return;
        const retry = () => {
          retryOff.current?.();
          if (userActed.current) return;
          speak(text, { force: true, clipOnly: true }).then((again) => {
            // "cancelled": the student's own tap (Next, Hear it, X) took the voice over - they have the welcome, so it is done.
            if (again === "started" || again === "cancelled") finishWelcome();
          });
        };
        const events = ["pointerdown", "keydown"];
        events.forEach((name) => document.addEventListener(name, retry, { capture: true, once: true }));
        retryOff.current = () => {
          events.forEach((name) => document.removeEventListener(name, retry, { capture: true }));
          retryOff.current = null;
        };
      } else if (result === "cancelled" && !userActed.current) {
        // Cancelled by something other than the student (React Strict Mode's remount, a route change): try again.
        welcomeRun.current = false;
        setAttempt((n) => n + 1);
      }
    });
  };

  useEffect(() => {
    if (!(welcomeReady && clear) || welcomeRun.current || attempt >= WELCOME_TRIES) return;
    // In a timer: the effect only schedules it, so React Strict Mode's extra mount/unmount never starts the welcome twice.
    const timer = setTimeout(startWelcome, 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [welcomeReady, clear, attempt]);

  useEffect(() => () => retryOff.current?.(), []);
  // Leaving a page ends the sentence about it (the new page then says its own once it has loaded).
  useEffect(() => () => stop(), [pathname, stop]);

  // ---- 2. A module explains itself - the FIRST time this user opens it in this browser - once its page has loaded ----
  const pageModule = home ? null : moduleNow;
  const pageTip = classesTour ? { text: steps[0].text, pin: steps[0].pin } : pageModule ? { text: pageModule.text, pin: null } : null;
  const [tipFor, setTipFor] = useState(null);
  // Every module has its own cookie (utils/picoCookies.js): a module that was explained by itself before - on this visit
  // (doneModules) or an earlier one - never explains itself again. The page showing its explanation right now keeps it
  // while it is spoken (the cookie is set as the voice starts). A tap on the buddy ignores all of this.
  const [doneModules, setDoneModules] = useState(() => new Set());
  const moduleHeard = doneModules.has(pageSegment) || hasPicoModuleCookie(userId, pageSegment);
  // One key per page; null while the page loads, while the welcome is still owed, on the page the welcome has just been
  // said on, and for a module that has already been explained.
  // A page explains itself only once no dialog is open (a dialog it already started under does not stop it).
  const tipWaiting = Boolean(pageTip) && moduleReady && !welcomeDue && welcomeSkip !== pageSegment;
  const tipKey = tipWaiting && ((!moduleHeard && clear) || tipFor === pageSegment) ? pageSegment : null;

  // Anything the buddy says by itself (the welcome / the tour, a page's explanation) waits for every dialog of the dashboard
  // (profile, training, password, app install, live class...) to be closed, and starts as soon as the last one is gone.
  const watchDialogs = welcomeReady || (tipWaiting && !moduleHeard);
  useEffect(() => {
    if (!watchDialogs) return undefined;
    const check = () => setClearAt(document.querySelector(OTHER_POPUPS) ? null : pageSegment);
    const first = setTimeout(check, 300);
    const timer = setInterval(check, 700);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [watchDialogs, pageSegment]);
  // A sentence that belonged to another page (the Book a Class buddy strip, a module's explanation) never carries over to the
  // page the student has moved to: it would be shown and said there. The new page then says its own (or nothing, once heard).
  const [sayPath, setSayPath] = useState(pathname);
  if (pathname !== sayPath) {
    setSayPath(pathname);
    setState((s) => (s.pageTip || s.pageTour ? { ...s, open: false, say: null, pageTip: false, pageTour: false } : s));
    setTipOn(false);
  }
  if (tipKey !== tipFor) {
    // Adjusted while rendering (React's way to reset state when an input changes), not in an effect.
    setTipFor(tipKey);
    if (tipKey && pageTip) {
      if (classesTour) setState((s) => ({ ...s, open: true, index: 0, say: null, skipLive: false, pageTip: false, pageTour: true }));
      else setState((s) => ({ ...s, open: true, index: 0, say: { text: pageTip.text, pin: pageTip.pin, id: `page-${pageSegment}` }, skipLive: false, pageTip: true }));
      setTipOn(true);
    } else {
      setState((s) => (s.pageTip ? { ...s, open: false, say: null, pageTip: false } : s));
      setTipOn(false);
    }
  }
  // The buddy's voice for this page is got ready once the page is idle: the page's text, and on the home page the tour
  // tips, so the student's tap (Next, Hear it) plays at once. In the voice and speed the student picked.
  const voiceTexts = [pageTip?.text, moduleNow?.text, ...(home || tourPage || classesTour ? steps.map((t) => t.text) : [])].filter(Boolean).join("|");
  const { voice: voicePick, voiceSpeed } = preferences;
  const locale = useLocale();
  useEffect(() => preparePicoClips(voiceTexts.split("|"), voiceOf(voicePick, voiceSpeed, locale)), [voiceTexts, voicePick, voiceSpeed, locale]);
  // An open bubble's text is a say captured when it opened, so a language switch (cookie + router.refresh, the component
  // stays mounted) would leave it in the old language - the tour tips (say: null) already re-derive from `t`, but the
  // welcome and the module/tap explanation do not. Re-translate those persistent ones here; a one-off say (a colour clue,
  // a plan nudge from picoSay) is closed instead, so the student never sees stale-language text. Adjusted while rendering
  // (prevLocale makes it run once per switch), the way the other state resets in this file are (see sayPath above).
  const [prevLocale, setPrevLocale] = useState(locale);
  if (prevLocale !== locale) {
    setPrevLocale(locale);
    setState((s) => {
      if (!s.say) return s;
      const id = s.say.id;
      if (id === "welcome") return { ...s, say: { ...s.say, text: welcomeText } };
      if (typeof id === "string" && (id.startsWith("page-") || id.startsWith("manual-")))
        return { ...s, say: { ...s.say, text: moduleNow?.text || noModuleText } };
      return { ...s, open: false, say: null, pageTip: false };
    });
  }
  // The explanation is also said out loud - once per arrival. Its cookie is set only when the voice really starts (or, with
  // the buddy's voice off, when the bubble is on screen); a browser that refuses to speak before any touch is retried at the
  // student's first tap or key press on that same page, and nothing is marked until then.
  const moduleRetryOff = useRef(null);
  const currentTip = useRef(null);
  useEffect(() => {
    currentTip.current = tipKey;
  }, [tipKey]);
  useEffect(() => {
    if (!tipKey || !pageTip) return;
    const key = tipKey;
    const text = pageTip.text;
    const delivered = () => {
      moduleRetryOff.current?.();
      setPicoModuleCookie(userId, key);
      setDoneModules((set) => new Set(set).add(key));
    };
    speak(text, { clipOnly: true }).then((result) => {
      if (currentTip.current !== key) return;
      if (result === "started" || result === "off" || result === "unavailable") {
        delivered();
      } else if (result === "blocked" && !moduleRetryOff.current) {
        // The browser refuses sound before the student has touched the page (e.g. right after login). The first real tap, click
        // or key press on this page says it. Every event that counts as a user gesture is listened to (a touch screen only
        // counts on pointerup / touchend), and a try that is still refused (not a gesture) keeps waiting for the next one.
        const events = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
        const stopWaiting = () => {
          events.forEach((name) => document.removeEventListener(name, retry, { capture: true }));
          moduleRetryOff.current = null;
        };
        let trying = false;
        const retry = () => {
          if (currentTip.current !== key) {
            stopWaiting();
            return;
          }
          if (trying) return; // one tap fires several events: the sentence is started once
          trying = true;
          speak(text, { force: true, clipOnly: true }).then((again) => {
            // "cancelled": the student's own tap (Hear it, the buddy) took the voice over, so they have heard it - no second try.
            if ((again === "started" || again === "cancelled") && currentTip.current === key) delivered();
            else trying = false;
          });
        };
        events.forEach((name) => document.addEventListener(name, retry, { capture: true }));
        moduleRetryOff.current = stopWaiting;
      }
    });
    return () => moduleRetryOff.current?.();
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
      // On a phone the bubble covers the lower half, so the element is lifted close to the header.
      let want = mobile ? 120 : 260;
      let lifted = false;
      // A tall element on a short screen (the mini calendar on a tablet) would end up behind the bubble: when it sits where the bubble
      // is, lift it higher so its bottom stays above the bubble (never above the sticky header).
      const bubble = !mobile ? document.querySelector(".k5-bubble") : null;
      if (bubble?.parentElement) {
        const wrap = bubble.parentElement.getBoundingClientRect();
        const bubbleW = Math.min(340, window.innerWidth - 32);
        const bubbleLeft = leftHand ? wrap.right + 14 : wrap.left - 14 - bubbleW;
        const bubbleTop = wrap.bottom - bubble.offsetHeight;
        if (r.left < bubbleLeft + bubbleW && r.right > bubbleLeft) {
          const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 104;
          const fit = Math.max(headerBottom + 12, bubbleTop - 16 - r.height);
          if (fit < want) {
            want = fit;
            lifted = true;
          }
        }
      }
      // On a phone the bubble sits over the lower part of the screen: an element whose top would be behind it is scrolled up.
      const phoneBubble = mobile ? document.querySelector(".k5-bubble") : null;
      const lowest = phoneBubble ? Math.min(window.innerHeight * 0.55, phoneBubble.getBoundingClientRect().top - 60) : window.innerHeight * 0.55;
      if (r.top < 150 || r.top > lowest || (lifted && Math.abs(r.top - want) > 24)) {
        window.scrollTo({ top: Math.max(0, window.scrollY + r.top - want), behavior: reduced ? "auto" : "smooth" });
      }
    }
  }, [open, pin, state.say?.id, reduced, mobile, leftHand]);

  // Is the tour itself on screen right now? A say that arrives while it is (a colour clue) belongs to the tour; one that
  // arrives when it is not (Get the App, a joined club) is a message of its own: "1 / 1" and "All done", not "1 / 10".
  const midTourRef = useRef(false);
  useEffect(() => {
    midTourRef.current = open && !state.pageTip;
  }, [open, state.pageTip]);

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
        pageTip: intro || midTourRef.current ? s.pageTip : true,
        say: { text, pin: target || null, id: Date.now(), above: Boolean(above) },
      }));
      setTipOn(true);
      // A page asked the buddy to talk (often by itself, e.g. the Book a Class strip): only in the recorded voice.
      speak(text, { clipOnly: true });
    };
    window.addEventListener(PICO_SAY_EVENT, onSay);
    return () => window.removeEventListener(PICO_SAY_EVENT, onSay);
  }, [speak]);

  // ---- 3. A tap explains the page the student is on ----
  const [manualWait, setManualWait] = useState(false);
  const [manualSay, setManualSay] = useState(null);
  const explainNow = (text, { fromTap }) => {
    setState((s) => ({ ...s, open: true, index: 0, say: { text, pin: null, id: `manual-${Date.now()}` }, pageTip: true }));
    setTipOn(true);
    if (fromTap) {
      if (preferences.speech !== "on") updatePreference("speech", "on");
      speak(text, { force: true });
    } else {
      setManualSay({ text });
    }
  };
  // My Classes: an explanation is its tour, from the first tip.
  const startClassesTour = ({ fromTap }) => {
    setState((s) => ({ ...s, open: true, index: 0, say: null, skipLive: false, pageTip: false, pageTour: true }));
    setTipOn(true);
    if (fromTap) {
      if (preferences.speech !== "on") updatePreference("speech", "on");
      speak(steps[0].text, { force: true });
    } else {
      setManualSay({ text: steps[0].text });
    }
  };
  // A tap while the page is still loading: the buddy says so, and explains as soon as the page is ready.
  if (manualWait && moduleReady) {
    setManualWait(false);
    if (classesTour) startClassesTour({ fromTap: false });
    else explainNow(moduleNow?.text || noModuleText, { fromTap: false });
  }
  useEffect(() => {
    if (!manualSay) return;
    if (preferences.speech !== "on") updatePreference("speech", "on");
    speak(manualSay.text, { force: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualSay]);

  if (preferences.buddyEnabled === "off") return null;

  // The student answered the welcome bubble (Next, Hear it, X, a tap on the buddy) while its voice was still owed (e.g. the
  // browser blocked it after login): the welcome has been delivered, so it is marked now and not said again on the next visit.
  const welcomeAnswered = () => {
    if (welcomeRun.current && welcomeDue) finishWelcome();
  };
  // Red X: closes the bubble only. The buddy stays; a tap brings the same tip back.
  const hide = () => {
    welcomeAnswered();
    userActed.current = true;
    retryOff.current?.();
    stop();
    setManualWait(false);
    setTipOn(false);
    setState((s) => ({ ...s, open: false }));
  };
  const finish = () => {
    welcomeAnswered();
    userActed.current = true;
    retryOff.current?.();
    stop();
    setManualWait(false);
    setTipOn(false);
    setState({ open: false, index: 0, say: null, skipLive: false, pageTip: false });
  };
  const next = () => {
    welcomeAnswered();
    userActed.current = true;
    if (state.pageTip) return finish();
    let i = state.index + 1;
    // After joining the live class, the "class is live" tip is skipped.
    while (i < steps.length && (!onPage(steps[i].pin) || (state.skipLive && steps[i].pin === "live"))) i += 1;
    if (i >= steps.length) return finish();
    setState((s) => ({ ...s, open: true, index: i, say: null }));
    speak(steps[i].text);
    // The buddy has now told about the app: a click on Get the App no longer makes it say it again (K5Header openApp).
    if (steps[i].pin === "getApp") setPicoModuleCookie(userId, TOUR_GET_APP_KEY);
  };
  // Mockup hear / pinTap: asking the buddy to talk also turns its voice back on.
  const hear = () => {
    welcomeAnswered();
    userActed.current = true;
    if (preferences.speech !== "on") updatePreference("speech", "on");
    speak(tip.text, { force: true });
  };
  // A tap explains the page the student is on (the dashboard on the home page). The home tour that is already open
  // keeps speaking its tip. A page still loading is waited for. A page Pico has no text for gets a short fallback.
  const tap = () => {
    welcomeAnswered();
    userActed.current = true;
    if (onBook) return;
    if (mobile && tipOn) {
      setTipOn(false);
      stop();
      return;
    }
    if (open && (home || (classesTour && state.pageTour)) && !state.say) return hear();
    if (!moduleReady) {
      setManualWait(true);
      setState((s) => ({ ...s, open: true, index: 0, say: { text: t("oneMoment"), pin: null, id: `wait-${Date.now()}` }, pageTip: true }));
      setTipOn(true);
      return;
    }
    if (classesTour) return startClassesTour({ fromTap: true });
    explainNow(moduleNow?.text || noModuleText, { fromTap: true });
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
          aria-label={t("says", { name: buddy.name })}
          className={`k5-bubble k5-zoom-in origin-bottom absolute bottom-0 box-border flex w-[340px] max-w-[calc(100vw-32px)] flex-col gap-2.5 rounded-[26px] border-[3px] border-k5-ink bg-k5-card px-[18px] py-4 shadow-[0_6px_0_var(--k5-ink)] max-[760px]:fixed max-[760px]:inset-x-3 max-[760px]:bottom-[224px] max-[760px]:w-auto max-[760px]:max-w-none ${
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
            <span className="text-sm font-black uppercase tracking-[0.08em] text-k5-vi">{t("says", { name: buddy.name })}</span>
            <div className="flex gap-1.5">
              {supported && (
                <button
                  type="button"
                  aria-pressed={preferences.speech === "on"}
                  aria-label={preferences.speech === "on" ? t("voiceOff", { name: buddy.name }) : t("voiceOn", { name: buddy.name })}
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
                aria-label={t("hide", { name: buddy.name })}
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
                {t("hearIt")}
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
              {position >= shown.length ? t("allDone") : t("next")}
              <ChevronRight className="h-5 w-5" strokeWidth={3} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={tap}
        aria-label={t("buddyLabel", { name: buddy.name })}
        className="k5-lift k5-pin-bob flex h-full w-full cursor-pointer items-end justify-center border-none bg-transparent p-0 max-[760px]:[&_svg]:!h-[60px] max-[760px]:[&_svg]:!w-12"
      >
        <PicoMascot buddy={preferences.buddy} width={66} talking={speaking} santa={festive} />
      </button>
    </div>
    </>
  );
}
