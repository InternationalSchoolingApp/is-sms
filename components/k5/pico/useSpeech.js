"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { VOICES } from "@/constant/appearance";

const noSubscribe = () => () => {};
const hasSpeech = () => "speechSynthesis" in window && typeof window.SpeechSynthesisUtterance !== "undefined";

/**
 * Web Speech for the K–5 buddy, with the student's voice preset (pitch / rate). Only ever
 * called from a tap (Next, Hear it, Listen): iOS Safari blocks speech before a user gesture.
 * `force` speaks even with the buddy voice turned off (the student asked to hear it).
 */
export function useSpeech() {
  const { preferences } = useAppearance();
  const supported = useSyncExternalStore(noSubscribe, hasSpeech, () => false);
  const [speaking, setSpeaking] = useState(false);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  const speak = useCallback(
    (text, { force = false, voice = preferences.voice } = {}) => {
      if (!supported || !text || (!force && preferences.speech !== "on")) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const preset = VOICES[voice] || VOICES.cheerful;
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.pitch = preset.pitch;
      utterance.rate = preset.rate;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.speak(utterance);
    },
    [supported, preferences.speech, preferences.voice],
  );

  useEffect(() => stop, [stop]);

  return { supported, speaking, speak, stop };
}
