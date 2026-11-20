"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { HIGH_GAMES, MEMORY_PAIRS, newHighMemory, newMental, newOddOne, newSeries } from "@/components/k5/games/highGameLogic";

/**
 * Grade 9–12 "Brain Games" (High.dc.html, the gamesTitle block): four short puzzles for a free day - Number Series,
 * Mental Math, Odd One Out and Memory Grid. They run only in the browser: nothing is sent or saved, and leaving a
 * game stops it. Same lock rules as the K–5 games (`locked`, `past`; see gameAccess in utils/k5Calendar.js).
 * Sizes are rem values on purpose: the Mature type scale (app/k5-mature.css) remaps px sizes, and these are the mockup's own.
 */

// Game names / hints and the lock notes: k5Games.high.*.

const PILL = "flex cursor-pointer items-center rounded-full border-[1.5px] border-k5-line bg-k5-card text-k5-ink";
const BOARD = "relative flex min-h-[17.5rem] flex-col items-center justify-center gap-[1.125rem] rounded-[0.625rem] border border-k5-line bg-k5-card p-5";
const ASK = "text-[0.75rem] font-[500] uppercase tracking-[0.06em] text-k5-mut";
const OPTION = "min-h-[2.875rem] min-w-[4.75rem] cursor-pointer rounded-lg border border-k5-line bg-k5-card px-3.5 text-[1.0625rem] font-[500] tabular-nums text-k5-ink";

const ICON_PROPS = { width: 30, height: 30, viewBox: "0 0 24 24", fill: "none", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, className: "stroke-k5-ac" };
const ICONS = {
  count: (
    <svg {...ICON_PROPS}>
      <path d="M3 17l5-5 4 3 8-8" />
      <path d="M15 7h5v5" />
    </svg>
  ),
  math: (
    <svg {...ICON_PROPS}>
      <path d="M7 4v6M4 7h6M14 7h6M5 15l4 4M9 15l-4 4M14 16h6M14 19h6" />
    </svg>
  ),
  shape: (
    <svg {...ICON_PROPS}>
      <circle cx="7" cy="7" r="3" />
      <circle cx="17" cy="7" r="3" />
      <circle cx="7" cy="17" r="3" />
      <rect x="14" y="14" width="6" height="6" rx="1" className="fill-k5-ac" />
    </svg>
  ),
  memory: (
    <svg {...ICON_PROPS}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" className="fill-k5-ac" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" className="fill-k5-ac" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
    </svg>
  ),
};

function GameTile({ game, locked, onPlay }) {
  const t = useTranslations("k5Games.high");
  return (
    <button
      type="button"
      onClick={locked ? undefined : onPlay}
      aria-disabled={locked || undefined}
      className={"flex min-h-[5.25rem] items-center gap-3.5 rounded-[0.625rem] border border-k5-line bg-k5-card px-4 py-3.5 text-left text-k5-ink " + (locked ? "cursor-not-allowed opacity-50" : "cursor-pointer")}
    >
      <span aria-hidden="true" className="flex h-12 w-12 flex-none items-center justify-center rounded-[0.625rem] bg-k5-act">
        {ICONS[game.id]}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[0.9375rem] font-[500] leading-[1.2]">{t(`games.${game.id}.name`)}</span>
        <span className="text-[0.8125rem] font-[400] leading-[1.35] text-k5-mut">{t(`games.${game.id}.how`)}</span>
      </span>
    </button>
  );
}

/** One question at a time: a right answer scores and moves to a new question after a moment; a wrong one only says so. */
function useQuiz(makeQuestion, { onScore, onFeedback }) {
  const [question, setQuestion] = useState(makeQuestion);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const answer = (value) => {
    const ok = value === question.ans;
    onFeedback(ok);
    if (!ok) return;
    onScore();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuestion(makeQuestion()), 650);
  };
  return [question, answer];
}

function SeriesBoard(props) {
  const t = useTranslations("k5Games.high");
  const [q, answer] = useQuiz(newSeries, props);
  return (
    <div className={BOARD}>
      <div className={ASK}>{t("whatNext")}</div>
      <div dir="ltr" className="text-center text-[1.75rem] font-[400] leading-[1.25] tabular-nums text-k5-ink">{q.q}</div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-2.5">
        {q.opts.map((n) => (
          <button key={n} type="button" onClick={() => answer(n)} className={OPTION}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function MentalBoard(props) {
  const t = useTranslations("k5Games.high");
  const [q, answer] = useQuiz(newMental, props);
  return (
    <div className={BOARD}>
      <div className={ASK}>{t("solve")}</div>
      <div dir="ltr" className="text-center text-[1.75rem] font-[400] leading-[1.25] tabular-nums text-k5-ink">{q.pct ? t("percentOf", { p: q.pct[0], n: q.pct[1] }) : q.q}</div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-2.5">
        {q.opts.map((n) => (
          <button key={n} type="button" onClick={() => answer(n)} className={OPTION}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function OddOneBoard(props) {
  const t = useTranslations("k5Games.high");
  const [q, answer] = useQuiz(newOddOne, props);
  return (
    <div className={BOARD}>
      <div className={ASK}>{t("oddOne")}</div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-2.5">
        {q.items.map((n) => (
          <button key={n} type="button" onClick={() => answer(n)} className={OPTION + " !min-h-14 !text-[1.25rem]"}>{n}</button>
        ))}
      </div>
    </div>
  );
}

function MemoryGridBoard({ onScore, onFeedback, onRestart }) {
  const t = useTranslations("k5Games.high");
  const [mem, setMem] = useState(newHighMemory);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const won = Object.keys(mem.done).length === MEMORY_PAIRS;

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
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMem((m) => ({ ...m, open: [], busy: false })), 850);
  };

  return (
    <div className="relative grid w-full max-w-[26.25rem] grid-cols-4 gap-2 self-center rounded-[0.625rem] border border-k5-line bg-k5-card p-4">
      {mem.deck.map((face, i) => {
        const done = Boolean(mem.done[face]);
        const up = done || mem.open.includes(i);
        const look = up
          ? "bg-k5-card text-k5-ink " + (done ? "border-k5-grn opacity-[0.55]" : "border-k5-line")
          : "border-k5-ac bg-k5-ac text-white";
        return (
          <button
            key={i}
            type="button"
            onClick={() => flip(i)}
            aria-label={up ? face : t("hiddenCard")}
            className={"flex aspect-square min-h-14 cursor-pointer items-center justify-center rounded-lg border text-[1.5rem] font-[400] leading-none " + look}
          >
            {up ? face : ""}
          </button>
        );
      })}
      {won && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[0.625rem] bg-[#FFFFFF]/95 p-4 text-center text-[1.125rem] font-[500] text-[#1B2130]">
          {t("allPairs")}
          <button type="button" onClick={onRestart} className="min-h-[2.625rem] cursor-pointer rounded-lg border-none bg-k5-ac px-5 text-[0.875rem] font-[500] text-white">
            {t("startOver")}
          </button>
        </div>
      )}
    </div>
  );
}

export function HighGames({ locked = false, past = false }) {
  const t = useTranslations("k5Games.high");
  const tc = useTranslations("common");
  const [gameId, setGameId] = useState(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [fb, setFb] = useState(null);
  const fbTimer = useRef(null);
  useEffect(() => () => clearTimeout(fbTimer.current), []);

  const game = locked ? null : HIGH_GAMES.find((g) => g.id === gameId);
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
      <section aria-labelledby="high-games-title" className="flex flex-col gap-3">
        <div className="flex flex-col">
          <h3 id="high-games-title" className="m-0 text-[1.25rem] font-[500]">{t("title")}</h3>
          <p className="m-0 text-[0.8125rem] font-[500] text-k5-mut">{t("subtitle")}</p>
        </div>
        {locked && (
          <div role="note" className="flex items-start gap-2.5 rounded-[0.625rem] border-[1.5px] border-k5-yb bg-k5-yt px-3.5 py-3 text-k5-ink">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="mt-px flex-none stroke-k5-yx">
              <rect x="5" y="11" width="14" height="10" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" />
            </svg>
            <span className="flex flex-col gap-0.5">
              <span className="text-[0.875rem] font-[500]">{t("locked")}</span>
              <span className="text-[0.8125rem] font-[400] leading-[1.4]">{past ? t("lockedPast") : t("lockedText")}</span>
            </span>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2.5 max-[560px]:grid-cols-1">
          {HIGH_GAMES.map((g) => (
            <GameTile key={g.id} game={g} locked={locked} onPlay={() => play(g.id)} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section aria-label={t(`games.${game.id}.name`)} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => setGameId(null)} className={PILL + " min-h-[2.5625rem] flex-none gap-1.5 pl-2.5 pr-4 text-[0.875rem] font-[500]"}>
            <ChevronLeft className="h-5 w-5 text-k5-acx" strokeWidth={3} aria-hidden="true" />
            {tc("actions.back")}
          </button>
          <div className="flex min-w-0 flex-col">
            <h3 className="m-0 text-[1.25rem] font-[500]">{t(`games.${game.id}.name`)}</h3>
            <p className="m-0 text-[0.8125rem] font-[500] text-k5-mut">{t(`games.${game.id}.how`)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span aria-live="polite" className="flex items-center gap-1.5 rounded-full bg-k5-act px-3 py-[0.4375rem] text-[0.8125rem] font-[500] tabular-nums text-k5-ink">
            {t("score", { score })}
          </span>
          <button type="button" onClick={() => play(game.id)} className={PILL + " min-h-10 px-4 text-[0.8125rem] font-[700]"}>
            {t("startOver")}
          </button>
        </div>
      </div>

      {game.id === "count" && <SeriesBoard key={round} {...shared} />}
      {game.id === "math" && <MentalBoard key={round} {...shared} />}
      {game.id === "shape" && <OddOneBoard key={round} {...shared} />}
      {game.id === "memory" && <MemoryGridBoard key={round} {...shared} onRestart={() => play("memory")} />}

      {fb !== null && (
        <div aria-live="assertive" className={"self-center rounded-full px-4 py-1.5 text-[0.8125rem] font-[500] text-white " + (fb ? "bg-k5-grn" : "bg-k5-red")}>
          {fb ? t("correct") : t("notQuite")}
        </div>
      )}
    </section>
  );
}
