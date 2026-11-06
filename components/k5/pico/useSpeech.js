"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { VOICES } from "@/constant/appearance";

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
      utterance.lang = preset.gb ? "en-GB" : "en-US";
      if (preset.gb) {
        const gb = pickGbVoice();
        if (gb) utterance.voice = gb;
      }
      utterance.pitch = preset.pitch;
      utterance.rate = preset.rate;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      synth.speak(utterance);
    },
    [supported, preferences.speech, preferences.voice],
  );

  // Emma's recorded hello (tap in the look dialog). Always a tap, so browsers allow the audio.
  const clipRef = useRef(null);
  const playClip = useCallback(() => {
    try {
      if (supported) window.speechSynthesis.cancel();
      clipRef.current?.pause();
      const audio = new Audio("/k5/emma-hello.mp4");
      clipRef.current = audio;
      audio.onplay = () => setSpeaking(true);
      audio.onended = () => setSpeaking(false);
      audio.onerror = () => setSpeaking(false);
      audio.play()?.catch(() => setSpeaking(false));
    } catch {
      setSpeaking(false);
    }
  }, [supported]);

  useEffect(
    () => () => {
      stop();
      clipRef.current?.pause();
    },
    [stop],
  );

  return { supported, speaking, speak, stop, playClip };
}
