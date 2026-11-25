// Pure helpers for the Grade 6–8 free-day games (Middle.dc.html newWord / newCount (number patterns) / newShape (odd one out)
// / opts4). Memory Match, Pop-Up Pals and Quick Math are the same as in K–5 (gameLogic.js). No data leaves the browser and
// nothing is saved.
import { GAMES, shuffle } from "@/components/k5/games/gameLogic";

const byId = (id) => GAMES.find((g) => g.id === id);

// The mockup's order and names. The colours come from the K–5 tiles (same palette), only Word has its own (it takes
// the place of Balloon Pop).
export const MIDDLE_GAMES = [
  { id: "word", name: "Word Unscramble", how: "Unscramble the science or maths word.", border: "border-k5-pi", bg: "bg-k5-pt", rim: "shadow-[0_5px_0_var(--k5-pI)]" },
  { ...byId("memory") },
  { ...byId("mole") },
  { ...byId("count"), name: "Number Patterns", how: "Spot the rule. What number comes next?" },
  { ...byId("math") },
  { ...byId("shape"), name: "Odd One Out", how: "One number doesn't follow the rule. Find it!" },
].map((g) => ({ ...g, emoji: null }));

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (list, n) => shuffle(list).slice(0, n);

/** Four answer buttons: the right one and three near misses, in a random order. */
function opts4(answer) {
  const set = [answer];
  const off = [-10, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 10];
  let guard = 0;
  while (set.length < 4 && guard++ < 100) {
    const n = answer + off[Math.floor(Math.random() * off.length)];
    if (n > 0 && !set.includes(n)) set.push(n);
  }
  return shuffle(set);
}

const WORDS = [
  "PLANET", "ENERGY", "MAGNET", "FOSSIL", "GALAXY", "OXYGEN", "CIRCUIT", "VOLCANO", "GRAVITY", "CLIMATE",
  "PROTEIN", "DECIMAL", "HABITAT", "NUCLEUS", "EQUATION", "FRACTION", "MOLECULE", "ALGEBRA", "DIAMETER", "ORGANISM",
];

/** Word Unscramble: a science or maths word with its letters shuffled, and four words to choose from. */
export function newWord() {
  const ans = WORDS[Math.floor(Math.random() * WORDS.length)];
  let scrambled = ans;
  let guard = 0;
  while (scrambled === ans && guard++ < 20) scrambled = shuffle(ans.split("")).join("");
  const others = shuffle(WORDS.filter((w) => w !== ans && Math.abs(w.length - ans.length) <= 1)).slice(0, 3);
  return { q: scrambled.split("").join(" "), ans, opts: shuffle([ans, ...others]) };
}

/** Number Patterns: four terms of an arithmetic / doubling / square / Fibonacci-like / growing-step pattern, the fifth is the answer. */
export function newPattern() {
  const k = rnd(0, 4);
  let t = [];
  if (k === 0) {
    const a = rnd(2, 20);
    const d = rnd(3, 9);
    for (let i = 0; i < 5; i++) t.push(a + d * i);
  } else if (k === 1) {
    const a = rnd(2, 6);
    for (let i = 0; i < 5; i++) t.push(a * Math.pow(2, i));
  } else if (k === 2) {
    const b = rnd(1, 6);
    for (let i = 0; i < 5; i++) t.push((b + i) * (b + i));
  } else if (k === 3) {
    t = [rnd(1, 4), rnd(2, 6)];
    while (t.length < 5) t.push(t[t.length - 1] + t[t.length - 2]);
  } else {
    const a = rnd(1, 9);
    t = [a];
    for (let i = 1; i < 5; i++) t.push(t[i - 1] + i + 1);
  }
  const ans = t[4];
  return { q: t.slice(0, 4).join(",  ") + ",  ?", ans, opts: opts4(ans) };
}

/** Odd One Out: four numbers that follow a rule (primes, squares, multiples, twelve-times-table-like) and one that does not. */
export function newOdd() {
  const k = rnd(0, 3);
  let good = [];
  let bad = 0;
  if (k === 0) {
    good = pick([2, 3, 5, 7, 11, 13, 17, 19, 23, 29], 4);
    bad = pick([9, 15, 21, 25, 27, 33], 1)[0];
  } else if (k === 1) {
    good = pick([4, 9, 16, 25, 36, 49, 64, 81, 100], 4);
    bad = pick([12, 18, 20, 30, 40, 50], 1)[0];
  } else if (k === 2) {
    const m = rnd(3, 9);
    good = pick([2, 3, 4, 5, 6, 7, 8, 9].map((x) => x * m), 4);
    bad = good[0] + rnd(1, m - 1);
  } else {
    good = pick([12, 18, 24, 30, 36, 42, 48, 54], 4);
    bad = pick([13, 21, 27, 35, 45], 1)[0];
  }
  return { ans: bad, items: shuffle([...good, bad]) };
}
