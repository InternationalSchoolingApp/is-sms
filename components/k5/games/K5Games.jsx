"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Lock, Star } from "lucide-react";
import { useAppearance } from "@/components/appearance/AppearanceProvider";
import { BalloonBoard, MemoryBoard, MoleBoard } from "@/components/k5/games/K5ActionBoards";
import { CountBoard, MathBoard, ShapeBoard } from "@/components/k5/games/K5QuizBoards";
import { GAMES } from "@/components/k5/games/gameLogic";
import { PicoMascot } from "@/components/k5/pico/PicoMascot";

const PILL = "min-h-12 cursor-pointer rounded-full border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink";

function GameTile({ game, onPlay, locked }) {
  const { preferences } = useAppearance();
  return (
    <button
      type="button"
      onClick={locked ? undefined : onPlay}
      aria-disabled={locked || undefined}
      className={"flex min-h-[170px] flex-col items-center gap-2 rounded-3xl border-[3px] px-2.5 py-3.5 text-center text-k5-ink " + (locked ? "cursor-not-allowed opacity-50 " : "cursor-pointer ") + game.border + " " + game.bg + " " + game.rim}
    >
      <span aria-hidden="true" className="flex h-[72px] w-[72px] flex-none items-center justify-center rounded-[22px] bg-k5-card text-[44px] leading-none">
        {game.emoji || <PicoMascot buddy={preferences.buddy} width={48} full={false} />}
      </span>
      <span className="font-k5-display text-xl font-semibold leading-tight">{game.name}</span>
      <span className="text-sm font-extrabold text-k5-mut">{game.how}</span>
    </button>
  );
}

/**
 * "Pick a game!" for a free day (mockup: shown under the no-classes card). Six little games
 * that run only in the browser: nothing is sent or saved, and leaving a game stops it.
 * `locked` (a class is live right now): the tiles are dimmed, a "Games are locked" note explains it, and a
 * running game goes back to the picker (the live-class dialog opens over it, see StudentHomeK5).
 */
export function K5Games({ locked = false }) {
  const [gameId, setGameId] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [fb, setFb] = useState(null);
  const fbTimer = useRef(null);
  useEffect(() => () => clearTimeout(fbTimer.current), []);

  const game = locked ? null : GAMES.find((g) => g.id === gameId);
  const play = (id) => {
    setGameId(id);
    setScore(0);
    setFb(null);
    setRound((r) => r + 1);
  };
  const feedback = (ok) => {
    clearTimeout(fbTimer.current);
    setFb(ok);
    fbTimer.current = setTimeout(() => setFb(null), 900);
  };
  const shared = { onScore: () => setScore((s) => s + 1), onFeedback: feedback };

  if (!game) {
    return (
      <section aria-labelledby="k5-games-title" className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h3 id="k5-games-title" className="m-0 font-k5-display text-2xl font-semibold">Pick a game!</h3>
          <p className="m-0 text-[15px] font-extrabold text-k5-mut">Tap a game to play</p>
        </div>
        {locked && (
          <div role="note" className="flex items-center gap-3 rounded-[18px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-k5-yx">
            <span aria-hidden="true" className="flex h-10 w-10 flex-none items-center justify-center rounded-[18px] bg-k5-card">
              <Lock className="h-[22px] w-[22px]" strokeWidth={2.2} />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-k5-display text-lg font-semibold">Games are locked</span>
              <span className="text-[15px] font-bold leading-snug">Your class is live right now! Join it first. The games open again when your class is over.</span>
            </span>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3 max-[560px]:grid-cols-2">
          {GAMES.map((g) => (
            <GameTile key={g.id} game={g} locked={locked} onPlay={() => play(g.id)} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={game.name} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => setGameId(null)} className={PILL + " flex flex-none items-center gap-1.5 pl-2.5"}>
            <ChevronLeft className="h-5 w-5 text-k5-acx" strokeWidth={3} aria-hidden="true" />
            Back
          </button>
          <div className="flex min-w-0 flex-col">
            <h3 className="m-0 font-k5-display text-2xl font-semibold">{game.name}</h3>
            <p className="m-0 text-[15px] font-extrabold text-k5-mut">{game.how}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span aria-live="polite" aria-label={"Score " + score} className="flex items-center gap-1.5 rounded-full bg-k5-yt px-3.5 py-2 text-[17px] font-black text-k5-yx">
            <Star className="h-5 w-5 fill-[#FFC531] text-k5-yi" aria-hidden="true" />
            {score}
          </span>
          <button type="button" onClick={() => play(game.id)} className={PILL + " text-[15px]"}>
            Start over
          </button>
        </div>
      </div>

      {game.id === "balloon" && <BalloonBoard key={round} onScore={shared.onScore} />}
      {game.id === "memory" && <MemoryBoard key={round} {...shared} onRestart={() => play("memory")} />}
      {game.id === "mole" && <MoleBoard key={round} onScore={shared.onScore} onResetScore={() => setScore(0)} caught={score} />}
      {game.id === "count" && <CountBoard key={round} {...shared} />}
      {game.id === "math" && <MathBoard key={round} {...shared} />}
      {game.id === "shape" && <ShapeBoard key={round} {...shared} />}

      {fb !== null && (
        <div aria-live="assertive" className={"self-center rounded-full px-[22px] py-2 font-k5-display text-[22px] font-semibold text-white " + (fb ? "bg-k5-grn" : "bg-[#C2410C]")}>
          {fb ? "Great job!" : "Try again!"}
        </div>
      )}
    </section>
  );
}
