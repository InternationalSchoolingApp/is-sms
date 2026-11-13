"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { voiceOf } from "@/constant/appearance";
import { clipFor, playerOf, readyClip, wordAt } from "@/utils/picoVoice";

const noSubscribe = () => () => {};
// British female voices, in the mockup order of preference (Emma).
const GB_NAMES = ["emma", "libby", "sonia", "serena", "kate", "stephanie", "martha", "fiona", "google uk english female"];
function pickGbVoice() {
  const voices = window.speechSynthesis.getVoices();
  for (const name of GB_NAMES) {
    const hit = voices.find((v) => v.lang?.toLowerCase().startsWith("en-gb") && v.name.toLowerCase().includes(name));
    if (hit) return hit;
  }
  return voices.find((v) => v.lang?.toLowerCase().startsWith("en-gb")) || null;
}

/**
 * The browser voice standing in for the buddy's voice: the same language when this device has it, else the closest
 * English one (a Hindi voice falls back to Indian English, as many computers have no Hindi voice and stay silent).
 * {lang, voice}; voice null = the browser's default for that lang.
 */
function browserVoiceFor(language) {
  const voices = window.speechSynthesis.getVoices();
  const has = (prefix) => voices.find((v) => v.lang?.toLowerCase().replace("_", "-").startsWith(prefix)) || null;
  if (language === "en-gb") return { lang: "en-GB", voice: pickGbVoice() };
  if (language === "hi") {
    const hindi = has("hi");
    if (hindi) return { lang: hindi.lang, voice: hindi };
    const indian = voices.find((v) => /en[-_]in/i.test(v.lang) && /heera|female/i.test(v.name)) || has("en-in");
    return indian ? { lang: indian.lang, voice: indian } : { lang: "en-US", voice: null };
  }
  return { lang: "en-US", voice: null };
}

const hasSpeech = () => "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";
// How long a tap waits for a sentence that is not ready yet before the browser voice says it instead.
const CLIP_WAIT_MS = 2500;

/**
 * Speech for the K–5 buddy. A sentence is spoken in the voice and speed the student picked (Appearance > Buddy's voice,
 * made once by the backend TtsService, see utils/picoVoice.js) and its words light up (`word`); when that voice is not
 * ready in time the browser voice says it instead, in the same accent and speed. Only ever called from a tap (Next, Hear it, Listen):
 * iOS Safari blocks speech before a user gesture. `force` speaks even with the buddy voice turned off. The recorded
 * voice stops when the student types, hides the tab or leaves the page.
 */
export function useSpeech() {
  const { preferences } = useAppearance();
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
    audio.play()?.catch(done);
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
  }, []);

  // Stand-in while the recorded voice is not ready: the browser's voice in the same accent and speed.
  const speakBrowser = useCallback(
    (text, chosen) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      const stand = browserVoiceFor(chosen.language);
      utterance.lang = stand.lang;
      if (stand.voice) utterance.voice = stand.voice;
      utterance.rate = chosen.speed;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.speak(utterance);
    },
    [supported],
  );

  /**
   * voice / voiceSpeed: the look dialog's preview passes the one being tried; otherwise the student's choice.
   * wait: how long to wait for a clip that is not ready yet (the preview waits longer: a new voice takes a few seconds).
   */
  const speak = useCallback(
    (text, { force = false, voice = preferences.voice, voiceSpeed = preferences.voiceSpeed, wait = CLIP_WAIT_MS } = {}) => {
      if (!text || (!force && preferences.speech !== "on")) return;
      turnRef.current += 1;
      const turn = turnRef.current;
      stopRecorded();
      if (supported) window.speechSynthesis.cancel();
      const chosen = voiceOf(voice, voiceSpeed);
      // Already known in this browser: play straight from the tap (no wait, and iOS keeps the tap's permission).
      const known = readyClip(text, chosen);
      if (known) {
        playRecorded(text, known);
        return;
      }
      let waited = null;
      const late = new Promise((resolve) => {
        waited = setTimeout(() => resolve(null), wait);
      });
      setSpeaking(true);
      Promise.race([clipFor(text, chosen), late]).then((clip) => {
        clearTimeout(waited);
        if (turn !== turnRef.current) return;
        if (clip) playRecorded(text, clip);
        else {
          setSpeaking(false);
          speakBrowser(text, chosen);
        }
      });
    },
    [supported, stopRecorded, playRecorded, speakBrowser, preferences.speech, preferences.voice, preferences.voiceSpeed],
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
