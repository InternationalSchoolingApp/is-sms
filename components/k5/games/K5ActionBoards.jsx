"use client";

import { useEffect, useRef, useState } from "react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";
import { newMemory, playPop } from "@/components/k5/games/gameLogic";

const FRAME = "relative min-h-[320px] overflow-hidden rounded-[26px] border-[3px] border-k5-line";
const BALLOONS = [
  ["#FF5A7A", "pink"],
  ["#FFC531", "yellow"],
  ["#2F7BF5", "blue"],
  ["#1F9E5A", "green"],
  ["#9B6BFF", "purple"],
  ["#FF8A3D", "orange"],
];
const START_X = [10, 25, 40, 56, 72, 88];

/** Timeouts that are cleared when the board goes away (a game closed mid-pop must not set state). */
function useTimers() {
  const timers = useRef(new Set());
  useEffect(() => {
    const set = timers.current;
    return () => set.forEach(clearTimeout);
  }, []);
  return (fn, ms) => {
    const id = setTimeout(() => {
      timers.current.delete(id);
      fn();
    }, ms);
    timers.current.add(id);
  };
}

export function BalloonBoard({ onScore }) {
  const { preferences } = useAppearance();
  const later = useTimers();
  const [xs, setXs] = useState(START_X);
  const [popped, setPopped] = useState({});
  const [fx, setFx] = useState(null);

  const pop = (i) => {
    if (popped[i]) return;
    onScore();
    if (preferences.speech !== "off") playPop();
    setPopped((p) => ({ ...p, [i]: true }));
    setFx(xs[i]);
    later(() => setFx(null), 600);
    // The balloon comes back at a new spot after a moment.
    later(() => {
      setPopped((p) => {
        const next = { ...p };
        delete next[i];
        return next;
      });
      setXs((list) => list.map((x, k) => (k === i ? 8 + Math.round(Math.random() * 80) : x)));
    }, 1200);
  };

  return (
    <div role="group" aria-label="Balloon Pop game" className={FRAME + " h-80 bg-k5-bt"}>
      <div className="absolute inset-x-0 bottom-0 h-7 bg-[#8FD47A]" />
      {BALLOONS.map(([color, name], i) =>
        popped[i] ? null : (
          <button
            key={name}
            type="button"
            onClick={() => pop(i)}
            aria-label={"Pop the " + name + " balloon"}
            className="k5-balloon absolute -ml-8 h-24 w-16 cursor-pointer border-none bg-transparent p-0"
            style={{ left: xs[i] + "%", bottom: 30, animationDuration: 6 + (i % 3) * 1.3 + "s", animationDelay: i * 0.9 + "s" }}
          >
            <svg width="64" height="96" viewBox="0 0 64 96" aria-hidden="true">
              <path d="M32 68 Q27 80 34 94" fill="none" stroke="#8A94A8" strokeWidth="2" />
              <ellipse cx="32" cy="32" rx="26" ry="31" fill={color} />
              <path d="M27 62 L37 62 L32 69 Z" fill={color} />
              <ellipse cx="22" cy="20" rx="6" ry="9" fill="#FFFFFF" opacity="0.45" />
            </svg>
          </button>
        ),
      )}
      {fx !== null && (
        <div aria-hidden="true" className="pointer-events-none absolute top-[40%] -ml-[45px] w-[90px] text-center font-k5-display text-[30px] font-bold text-[#C2410C]" style={{ left: fx + "%" }}>
          Pop!
        </div>
      )}
    </div>
  );
}

export function MemoryBoard({ onScore, onFeedback, onRestart }) {
  const later = useTimers();
  const [mem, setMem] = useState(newMemory);
  const won = Object.keys(mem.done).length === 6;

  const flip = (i) => {
    if (mem.busy || mem.open.includes(i) || mem.done[mem.deck[i]]) return;
    const open = [...mem.open, i];
    if (open.length < 2) {
      setMem({ ...mem, open });
      return;
    }
    if (mem.deck[open[0]] === mem.deck[open[1]]) {
      setMem({ ...mem, open: [], done: { ...mem.done, [mem.deck[i]]: true } });
      onScore();
      onFeedback(true);
      return;
    }
    setMem({ ...mem, open, busy: true });
    later(() => setMem((m) => ({ ...m, open: [], busy: false })), 850);
  };

  return (
    <div className={FRAME + " grid grid-cols-4 gap-2.5 bg-k5-bt p-3.5"}>
      {mem.deck.map((face, i) => {
        const done = Boolean(mem.done[face]);
        const up = done || mem.open.includes(i);
        const look = up
          ? "bg-white " + (done ? "border-k5-grn opacity-60" : "border-k5-line") + " shadow-[0_4px_0_var(--k5-line)]"
          : "border-k5-acd bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]";
        return (
          <button
            key={i}
            type="button"
            onClick={() => flip(i)}
            aria-label={up ? face : "Hidden card"}
            className={"flex min-h-[82px] cursor-pointer items-center justify-center rounded-[18px] border-[3px] font-k5-display text-[40px] font-semibold leading-none " + look}
          >
            {up ? face : "?"}
          </button>
        );
      })}
      {won && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-white/90 p-4 text-center font-k5-display text-[28px] font-semibold text-[#1C2640]">
          {"\u{1F389} You found all the pairs!"}
          <button type="button" onClick={onRestart} className="min-h-[54px] cursor-pointer rounded-full border-none bg-[#FFC531] px-[26px] font-k5-display text-xl font-semibold text-[#1C2640] shadow-[0_5px_0_#C9930A]">
            Start over
          </button>
        </div>
      )}
    </div>
  );
}

const MOLE_SECONDS = 20;

export function MoleBoard({ onScore, onResetScore, caught }) {
  const { preferences } = useAppearance();
  const [mole, setMole] = useState({ on: false, hole: -1, left: MOLE_SECONDS, end: false });
  const hop = useRef(null);
  const clock = useRef(null);

  const stop = () => {
    clearInterval(hop.current);
    clearInterval(clock.current);
  };
  useEffect(() => stop, []);

  const start = () => {
    stop();
    onResetScore();
    setMole({ on: true, hole: Math.floor(Math.random() * 9), left: MOLE_SECONDS, end: false });
    hop.current = setInterval(() => {
      setMole((m) => {
        if (!m.on) return m;
        let hole = Math.floor(Math.random() * 9);
        if (hole === m.hole) hole = (hole + 4) % 9;
        return { ...m, hole };
      });
    }, 900);
    clock.current = setInterval(() => {
      setMole((m) => {
        if (!m.on) return m;
        if (m.left <= 1) {
          stop();
          return { on: false, hole: -1, left: 0, end: true };
        }
        return { ...m, left: m.left - 1 };
      });
    }, 1000);
  };

  const whack = (i) => {
    if (!mole.on || mole.hole !== i) return;
    setMole({ ...mole, hole: -1 });
    onScore();
  };

  return (
    <div className={FRAME + " flex flex-col gap-2.5 bg-[#BFE6A8] p-3.5"}>
      <div className="flex items-center justify-center gap-2.5 font-k5-display text-xl font-semibold text-[#1C2640]">{"\u23F1 Time: " + mole.left}</div>
      <div className="grid flex-1 grid-cols-3 gap-2.5">
        {Array.from({ length: 9 }, (_, i) => (
          <button key={i} type="button" onClick={() => whack(i)} aria-label={"Hole " + (i + 1)} className="relative min-h-[74px] cursor-pointer overflow-hidden border-none bg-transparent p-0">
            <span className="absolute inset-x-[10%] bottom-1 block h-[26px] rounded-full bg-[#6B4423]" />
            {mole.on && mole.hole === i && (
              <span aria-hidden="true" className="absolute bottom-2.5 left-1/2 -ml-[30px]">
                <PicoMascot buddy={preferences.buddy} width={60} full={false} />
              </span>
            )}
          </button>
        ))}
      </div>
      {!mole.on && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-white/75 p-4 text-center">
          <span className="font-k5-display text-2xl font-semibold text-[#1C2640]">{mole.end ? "Time\u2019s up! You caught " + caught + "!" : "Tap the friend before it hides!"}</span>
          <button type="button" onClick={start} className="min-h-[58px] cursor-pointer rounded-full border-none bg-k5-grn px-[30px] font-k5-display text-[22px] font-semibold text-white shadow-[0_5px_0_var(--k5-grnD)]">
            {mole.end ? "Play again" : "Start"}
          </button>
        </div>
      )}
    </div>
  );
}
