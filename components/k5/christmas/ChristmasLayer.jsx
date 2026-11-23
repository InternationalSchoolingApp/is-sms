"use client";

import { EyeOff } from "lucide-react";
import { useChristmas } from "@/components/k5/christmas/ChristmasProvider";
import { MusicDisc } from "@/components/k5/christmas/ChristmasArt";

// 42 flakes with fixed (not random) numbers, so the server and the browser draw the same sky: left %, size px, fall seconds,
// start delay, sideways drift px, opacity, blur px (mockup .xmas-sky i).
const FLAKES = Array.from({ length: 42 }, (_, i) => {
  const r = (n) => ((i * 9301 + n * 49297) % 233280) / 233280;
  return {
    x: `${(r(1) * 100).toFixed(1)}%`,
    y: `${(r(2) * 100).toFixed(1)}%`,
    s: `${(4 + r(3) * 24).toFixed(1)}px`,
    d: `${(11 + r(4) * 12).toFixed(0)}s`,
    l: `${(-r(5) * 18).toFixed(1)}s`,
    dx: `${((r(6) - 0.5) * 90).toFixed(0)}px`,
    o: (0.35 + r(7) * 0.45).toFixed(2),
    b: `${(r(8) * 3).toFixed(1)}px`,
  };
});

/**
 * Behind the page on 25 December: the soft glows and the still-falling flakes of the winter sky (the sky colour itself is the
 * page background, app/k5-christmas.css, `[data-xmas="on"]`). While the snow canvas runs its own flakes these are hidden.
 */
export function ChristmasSky() {
  const { festive } = useChristmas();
  if (!festive) return null;
  return (
    <div aria-hidden="true" className="k5-xm-sky">
      <span className="k5-xm-glow g1" />
      <span className="k5-xm-glow g2" />
      <span className="k5-xm-glow g3" />
      {FLAKES.map((f, i) => (
        <i key={i} style={{ "--x": f.x, "--y": f.y, "--s": f.s, "--d": f.d, "--l": f.l, "--dx": f.dx, "--o": f.o, "--b": f.b }} />
      ))}
    </div>
  );
}

/** "Christmas theme is off. Tap Turn on Christmas theme to bring it back." for a few seconds after turning it off. */
export function ChristmasToast() {
  const { toastAt } = useChristmas();
  if (!toastAt) return null;
  return (
    <div role="status" className="k5-xm-toast">
      <span>Christmas theme is off. Tap Turn on Christmas theme to bring it back.</span>
    </div>
  );
}

/**
 * The banner on top of the page on 25 December (mockup .xmas-banner): a tree, "Merry Christmas, {name}!" and a line, the
 * "Music on / off" button and "Turn off theme". While the theme is off for this screen only a small "Turn on Christmas theme" button shows.
 */
export function ChristmasBanner({ firstName }) {
  const { festive, canTurnOn, musicOn, toggleMusic, turnOff, turnOn } = useChristmas();
  if (canTurnOn) {
    return (
      <div className="k5-xm-onrow">
        <button type="button" className="k5-xm-offbtn k5-xm-onbtn" onClick={turnOn} aria-label="Turn on the Christmas theme">
          <span aria-hidden="true">🎄</span>
          Turn on Christmas theme
        </button>
      </div>
    );
  }
  if (!festive) return null;
  return (
    <div role="note" className="k5-xm-banner">
      <span className="k5-xm-tree" aria-hidden="true">
        🎄
      </span>
      <div>
        <b>Merry Christmas{firstName ? `, ${firstName}` : ""}!</b>
        <span>Enjoy the snow and have a magical day! ❄️</span>
      </div>
      <button type="button" className="k5-xm-offbtn" onClick={toggleMusic} aria-pressed={musicOn} aria-label="Christmas music">
        <MusicDisc playing={musicOn} />
        {musicOn ? "Music on" : "Music off"}
      </button>
      <button type="button" className="k5-xm-offbtn" onClick={turnOff} aria-label="Turn off the Christmas theme">
        <EyeOff className="h-[18px] w-[18px]" strokeWidth={2.4} aria-hidden="true" />
        Turn off theme
      </button>
    </div>
  );
}
