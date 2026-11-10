"use client";

import { useEffect, useState } from "react";
import { Square, Volume2 } from "lucide-react";
import { useSpeech } from "@/components/k5/pico/useSpeech";

/**
 * Select-to-speak (mockup "Listen in"): select any text on the page and a Listen button
 * reads it aloud in the buddy's voice. Hidden where the browser has no speech synthesis.
 */
export function SelectToSpeak() {
  const { supported, speaking, speak, stop } = useSpeech();
  const [text, setText] = useState("");

  useEffect(() => {
    if (!supported) return;
    const onSelection = () => {
      const selection = window.getSelection();
      const selected = selection?.toString().trim() || "";
      const main = document.querySelector(".theme-k5 main");
      const inside = selection?.anchorNode && main?.contains(selection.anchorNode);
      setText(selected.length > 1 && inside ? selected.slice(0, 600) : "");
    };
    document.addEventListener("selectionchange", onSelection);
    return () => document.removeEventListener("selectionchange", onSelection);
  }, [supported]);

  if (!supported || (!text && !speaking)) return null;
  return (
    <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
      <button
        type="button"
        // Keep the selection when the button is pressed.
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => (speaking ? stop() : speak(text, { force: true }))}
        className="flex min-h-[52px] cursor-pointer items-center gap-2 rounded-full border-none bg-k5-ac px-6 font-k5-display text-lg font-semibold text-white shadow-[0_5px_0_var(--k5-acd)]"
      >
        {speaking ? <Square className="h-5 w-5" aria-hidden="true" /> : <Volume2 className="h-5 w-5" aria-hidden="true" />}
        {speaking ? "Stop" : "Listen"}
      </button>
    </div>
  );
}
