"use client";

import { ANSWER, FRAME, useQuiz } from "@/components/k5/games/K5QuizBoards";
import { newOdd, newPattern, newWord } from "@/components/k5/games/middleGameLogic";

/*
 * The Grade 6–8 games that differ from K–5 (Middle.dc.html): Word Unscramble, Number Patterns and Odd One Out, plus the
 * tile pictures of all six (the "Balanced" icons). Memory Match, Pop-Up Pals and Quick Math are the K–5 boards.
 */

const ASK = "text-center text-[15px] font-extrabold text-k5-mut";

export function WordBoard(props) {
  const [q, answer] = useQuiz(newWord, (cur, w) => w === cur.ans, props);
  return (
    <div className={FRAME + " items-center justify-center gap-5 bg-k5-pt p-[18px]"}>
      <div className={ASK}>Which word is hidden here?</div>
      <div dir="ltr" className="text-center font-k5-display text-[40px] font-semibold tracking-[0.08em] text-k5-ink">{q.q}</div>
      <div dir="ltr" className="grid w-full max-w-[460px] grid-cols-2 gap-3">
        {q.opts.map((w) => (
          <button key={w} type="button" onClick={() => answer(w)} className={ANSWER + " !min-h-[60px] !text-xl tracking-[0.04em]"}>
            {w}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PatternBoard(props) {
  const [q, answer] = useQuiz(newPattern, (cur, n) => n === cur.ans, props);
  return (
    <div className={FRAME + " items-center justify-center gap-5 bg-k5-mt p-[18px]"}>
      <div className={ASK}>What comes next?</div>
      <div dir="ltr" className="text-center font-k5-display text-[44px] font-semibold leading-[1.15] text-k5-ink">{q.q}</div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-3.5">
        {q.opts.map((n) => (
          <button key={n} type="button" onClick={() => answer(n)} className={ANSWER + " !min-h-[72px] !text-[30px]"}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export function OddBoard(props) {
  const [q, answer] = useQuiz(newOdd, (cur, n) => n === cur.ans, props);
  return (
    <div className={FRAME + " items-center justify-center gap-5 bg-k5-vt p-[18px]"}>
      <div className="text-center font-k5-display text-[28px] font-semibold text-k5-ink">Which number doesn&apos;t belong?</div>
      <div dir="ltr" className="flex flex-wrap justify-center gap-3.5">
        {q.items.map((n) => (
          <button key={n} type="button" onClick={() => answer(n)} className={ANSWER + " !min-h-24 !min-w-24 !text-[30px]"}>
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

const SVG = { width: 48, height: 48, viewBox: "0 0 48 48", "aria-hidden": true };
const T = { textAnchor: "middle", fontFamily: "Outfit, sans-serif", fontWeight: 700, fontSize: 11 };

/** Tile pictures (mockup, Balanced look). */
export const MIDDLE_ICONS = {
  word: (
    <svg {...SVG}>
      <rect x="3" y="12" width="13" height="16" rx="3" fill="#FF5A7A" />
      <rect x="18" y="8" width="13" height="16" rx="3" fill="#9B6BFF" />
      <rect x="33" y="14" width="12" height="16" rx="3" fill="#3B9BFF" />
      <text x="9.5" y="24.5" {...T} fill="#FFFFFF">W</text>
      <text x="24.5" y="20.5" {...T} fill="#FFFFFF">O</text>
      <text x="39" y="26.5" {...T} fill="#FFFFFF">R</text>
      <path d="M10 36c5 5 23 5 28 0" fill="none" stroke="#8A94A8" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M34 33l4 3-4 3" fill="none" stroke="#8A94A8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  memory: (
    <svg {...SVG}>
      <rect x="6" y="10" width="20" height="28" rx="4" fill="#3B9BFF" transform="rotate(-10 16 24)" />
      <rect x="22" y="10" width="20" height="28" rx="4" fill="#FFFFFF" stroke="#171B2E" strokeWidth="2.5" transform="rotate(8 32 24)" />
      <path d="M32 18l2 4 4.4.6-3.2 3 .8 4.4-4-2.1-4 2.1.8-4.4-3.2-3 4.4-.6z" fill="#FFC531" transform="rotate(8 32 24)" />
    </svg>
  ),
  mole: (
    <svg {...SVG}>
      <ellipse cx="24" cy="40" rx="20" ry="6" fill="#8B5A2B" />
      <g transform="translate(9 8) scale(0.15)">
        <circle cx="100" cy="100" r="96" fill="#3B9BFF" />
        <circle cx="100" cy="108" r="62" fill="#FFFFFF" />
        <ellipse cx="80" cy="100" rx="10" ry="13" fill="#171B2E" />
        <ellipse cx="120" cy="100" rx="10" ry="13" fill="#171B2E" />
        <circle cx="66" cy="122" r="8" fill="#FF9EB5" />
        <circle cx="134" cy="122" r="8" fill="#FF9EB5" />
        <path d="M82 124 Q100 150 118 124 Z" fill="#171B2E" />
      </g>
    </svg>
  ),
  count: (
    <svg {...SVG}>
      <rect x="2" y="16" width="12" height="16" rx="3" fill="#FFC531" />
      <rect x="18" y="16" width="12" height="16" rx="3" fill="#FFC531" />
      <rect x="34" y="16" width="12" height="16" rx="3" fill="none" stroke="#C9930A" strokeWidth="2" strokeDasharray="3 3" />
      <text x="8" y="28" {...T} fill="#171B2E">2</text>
      <text x="24" y="28" {...T} fill="#171B2E">4</text>
      <text x="40" y="28" {...T} fill="#C9930A">?</text>
    </svg>
  ),
  math: (
    <svg {...SVG}>
      <rect x="5" y="5" width="38" height="38" rx="9" fill="#1F9E5A" />
      <path d="M17 24h14M24 17v14" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" />
    </svg>
  ),
  shape: (
    <svg {...SVG}>
      <circle cx="12" cy="13" r="8" fill="#9B6BFF" />
      <circle cx="36" cy="13" r="8" fill="#9B6BFF" />
      <circle cx="12" cy="35" r="8" fill="#9B6BFF" />
      <rect x="28" y="27" width="16" height="16" rx="3" fill="#FFB020" />
    </svg>
  ),
};
