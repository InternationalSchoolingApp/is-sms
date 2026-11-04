"use client";

import { useEffect, useRef, useState } from "react";
import { newCount, newMath, newShape } from "@/components/k5/games/gameLogic";

const FRAME = "relative flex min-h-[320px] flex-col overflow-hidden rounded-[26px] border-[3px] border-k5-line";
const ANSWER = "min-h-[76px] min-w-[92px] cursor-pointer rounded-[22px] border-none bg-k5-card px-[18px] font-k5-display text-[38px] font-semibold text-k5-ink shadow-[0_6px_0_var(--k5-line)]";

/**
 * One question at a time: a right answer scores, shows "Great job!" and moves to a new question
 * after a moment; a wrong one only shows "Try again!". The pending next question is cleared when
 * the board goes away.
 */
function useQuiz(makeQuestion, isRight, { onScore, onFeedback }) {
  const [question, setQuestion] = useState(makeQuestion);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const answer = (value) => {
    const ok = isRight(question, value);
    onFeedback(ok);
    if (!ok) return;
    onScore();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setQuestion(makeQuestion()), 650);
  };
  return [question, answer];
}

function Options({ values, onPick }) {
  return (
    <div className="flex justify-center gap-3.5">
      {values.map((n) => (
        <button key={n} type="button" onClick={() => onPick(n)} className={ANSWER}>
          {n}
        </button>
      ))}
    </div>
  );
}

export function CountBoard(props) {
  const [q, answer] = useQuiz(newCount, (cur, n) => n === cur.n, props);
  return (
    <div className={FRAME + " bg-[#1E2F57]"}>
      <div role="img" aria-label="How many stars do you see?" className="relative h-[200px]">
        {q.stars.map((s, i) => (
          <svg key={i} width="44" height="44" viewBox="0 0 24 24" aria-hidden="true" className="absolute" style={{ left: s.x, top: s.y }}>
            <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="#FFC531" stroke="#FFE38A" strokeWidth="1" />
          </svg>
        ))}
      </div>
      <div className="p-3.5">
        <Options values={q.opts} onPick={answer} />
      </div>
    </div>
  );
}

export function MathBoard(props) {
  const [q, answer] = useQuiz(newMath, (cur, n) => n === cur.a + cur.b, props);
  return (
    <div className={FRAME + " items-center justify-center gap-[22px] bg-k5-gt p-[18px]"}>
      <div dir="ltr" className="font-k5-display text-[64px] font-semibold leading-none text-k5-ink">
        {q.a + " + " + q.b + " = ?"}
      </div>
      <Options values={q.opts} onPick={answer} />
    </div>
  );
}

const SHAPE_NAMES = { circle: "circle", square: "square", triangle: "triangle", star: "star", heart: "heart" };
const SHAPE_PATHS = {
  circle: <circle cx="50" cy="50" r="40" />,
  square: <rect x="12" y="12" width="76" height="76" rx="8" />,
  triangle: <path d="M50 8L92 88H8z" />,
  star: <path d="M50 6l12.4 26 28.6 3.6-21 19.6 5.4 28.2L50 69.6 24.6 83.4 30 55.2 9 35.6l28.6-3.6z" />,
  heart: <path d="M50 88S10 62 10 34a22 22 0 0 1 40-12 22 22 0 0 1 40 12c0 28-40 54-40 54z" />,
};

export function ShapeBoard(props) {
  const [q, answer] = useQuiz(newShape, (cur, kind) => kind === cur.target, props);
  return (
    <div className={FRAME + " items-center justify-center gap-[18px] bg-k5-vt p-[18px]"}>
      <div className="text-center font-k5-display text-[34px] font-semibold text-k5-ink">{"Tap the " + SHAPE_NAMES[q.target] + "!"}</div>
      <div className="flex flex-wrap justify-center gap-3.5">
        {q.items.map((it) => (
          <button
            key={it.kind}
            type="button"
            onClick={() => answer(it.kind)}
            aria-label={SHAPE_NAMES[it.kind]}
            className="flex h-28 w-28 cursor-pointer items-center justify-center rounded-3xl border-none bg-k5-card shadow-[0_6px_0_var(--k5-line)]"
          >
            <svg width="88" height="88" viewBox="0 0 100 100" aria-hidden="true" fill={it.color}>
              {SHAPE_PATHS[it.kind]}
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}
