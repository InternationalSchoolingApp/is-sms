"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocale } from "next-intl";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { voiceOf } from "@/constant/appearance";
import { clipFor, playerOf, readyClip, wordAt } from "@/utils/picoVoice";

const noSubscribe = () => () => {};
const hasSpeech = () => "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
// How long the buddy waits for its recorded voice (/api/pico-voice) before it stays quiet. It never uses the browser voice.
const CLIP_WAIT_MS = 60000;

/**
 * Speech for the K–5 buddy. A sentence is spoken in the voice and speed the student picked (Appearance > Buddy's voice,
 * made once by the backend TtsService, see utils/picoVoice.js) and its words light up (`word`). Only ever that recorded voice:
 * the buddy waits for it (/api/pico-voice) and, when it cannot be made, stays quiet - never the browser voice. From a tap (Next, Hear it, Listen):
 * iOS Safari blocks speech before a user gesture. `force` speaks even with the buddy voice turned off. The recorded
 * voice stops when the student types, hides the tab or leaves the page.
 */
export function useSpeech() {
  const { preferences } = useAppearance();
  const locale = useLocale();
  const supported = useSyncExternalStore(noSubscribe, hasSpeech, () => false);
  const [speaking, setSpeaking] = useState(false);
  // The word being said in a recorded clip: {text, n}, for the bubble's word-by-word highlight.
  const [word, setWord] = useState(null);
  const recordedRef = useRef(null);
  const timerRef = useRef(0);
  // Each speak() / stop() gets a new number, so a clip that arrives after the student moved on is not played.
  const turnRef = useRef(0);

  const stopRecorded = useCallback(() => {
    clearInterval(timerRef.current);
    const audio = recordedRef.current;
    recordedRef.current = null;
    if (audio) {
      audio.onended = null;
      audio.onpause = null;
      audio.pause();
    }
    setWord(null);
  }, []);

  const stop = useCallback(() => {
    turnRef.current += 1;
    stopRecorded();
    if (supported) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported, stopRecorded]);

  // Resolves true when the clip started playing, false when the browser refused it (autoplay blocked, no gesture yet).
  const playRecorded = useCallback((text, clip) => {
    const audio = playerOf(clip.url);
    recordedRef.current = audio;
    const done = () => {
      if (recordedRef.current !== audio) return;
      clearInterval(timerRef.current);
      recordedRef.current = null;
      setWord(null);
      setSpeaking(false);
    };
    audio.onended = done;
    audio.onpause = done;
    audio.currentTime = 0;
    setSpeaking(true);
    const started = Promise.resolve(audio.play()).then(
      () => true,
      () => {
        done();
        return false;
      },
    );
    const said = String(text).replace(/\s+/g, " ").trim();
    if (clip.times?.length) {
      let last = -1;
      timerRef.current = setInterval(() => {
        const at = wordAt(clip.times, audio.currentTime);
        if (at !== last) {
          last = at;
          setWord(at < 0 ? null : { text: said, n: at });
        }
      }, 30);
    }
    return started;
  }, []);

  /**
   * voice / voiceSpeed: the look dialog's preview passes the one being tried; otherwise the student's choice.
   * wait: how long to wait for a clip that is not ready yet (the preview waits longer: a new voice takes a few seconds).
   * Returns a Promise of what happened: "started" (the voice is playing), "blocked" (the browser refused it, e.g. autoplay
   * before the student has touched the page), "cancelled" (a newer speak() / stop() took over), "off" (the buddy's voice is
   * off) or "unavailable" (the recorded voice could not be made: nothing is said). Callers that do not care may ignore it.
   * Every speak() is recorded-voice only (a clipOnly option some callers still pass changes nothing).
   */
  const speak = useCallback(
    (text, { force = false, voice = preferences.voice, voiceSpeed = preferences.voiceSpeed, wait = CLIP_WAIT_MS } = {}) => {
      if (!text) return Promise.resolve("off");
      if (!force && preferences.speech !== "on") return Promise.resolve("off");
      turnRef.current += 1;
      const turn = turnRef.current;
      stopRecorded();
      if (supported) window.speechSynthesis.cancel();
      // In the dashboard's language: outside English the same-gender voice of that language (constant/appearance.js).
      const chosen = voiceOf(voice, voiceSpeed, locale);
      // Already known in this browser: play straight from the tap (no wait, and iOS keeps the tap's permission).
      const known = readyClip(text, chosen);
      if (known) {
        return playRecorded(text, known).then((ok) => (turn !== turnRef.current ? "cancelled" : ok ? "started" : "blocked"));
      }
      let waited = null;
      const late = new Promise((resolve) => {
        waited = setTimeout(() => resolve(null), wait);
      });
      setSpeaking(true);
      return Promise.race([clipFor(text, chosen), late]).then(async (clip) => {
        clearTimeout(waited);
        if (turn !== turnRef.current) return "cancelled";
        if (clip) {
          const ok = await playRecorded(text, clip);
          return turn !== turnRef.current ? "cancelled" : ok ? "started" : "blocked";
        }
        setSpeaking(false);
        // No recorded voice: the buddy stays quiet (its bubble still shows the words) - never the browser voice.
        return "unavailable";
      });
    },
    [supported, stopRecorded, playRecorded, preferences.speech, preferences.voice, preferences.voiceSpeed, locale],
  );

  useEffect(
    () => () => {
      stop();
    },
    [stop],
  );

  // The recorded voice stops as soon as the student types in a field, hides the tab or leaves the page.
  useEffect(() => {
    const onType = (event) => {
      if (recordedRef.current && event.target instanceof Element && event.target.matches("input, textarea, select, [contenteditable]")) stop();
    };
    const onHide = () => {
      if (document.visibilityState === "hidden" && recordedRef.current) stop();
    };
    document.addEventListener("focusin", onType);
    document.addEventListener("keydown", onType);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", stop);
    return () => {
      document.removeEventListener("focusin", onType);
      document.removeEventListener("keydown", onType);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", stop);
    };
  }, [stop]);

  return { supported, speaking, speak, stop, word };
}
