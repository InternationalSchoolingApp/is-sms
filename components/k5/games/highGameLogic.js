// Pure helpers for the Grade 9–12 "Brain Games" (High.dc.html newMem / newCount / newMath / newShape / opts4).
// No data leaves the browser and nothing is saved.
import { shuffle } from "@/components/k5/games/gameLogic";

export const HIGH_GAMES = [
  { id: "count", name: "Number Series", how: "Find the next number in the pattern." },
  { id: "math", name: "Mental Math", how: "Solve it in your head, no calculator." },
  { id: "shape", name: "Odd One Out", how: "One number breaks the rule. Find it." },
  { id: "memory", name: "Memory Grid", how: "Flip two cards at a time. Match all 8 pairs." },
];

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const pick = (list, n) => shuffle(list).slice(0, n);

/** Four answer buttons: the right one and three near misses, in a random order. */
function opts4(answer) {
  const set = [answer];
  const off = [-12, -10, -6, -4, -3, -2, -1, 1, 2, 3, 4, 6, 10, 12];
  let guard = 0;
  while (set.length < 4 && guard++ < 100) {
    const n = answer + off[Math.floor(Math.random() * off.length)];
    if (n > 0 && !set.includes(n)) set.push(n);
  }
  return shuffle(set);
}

const MEMORY_FACES = ["Σ", "π", "Δ", "λ", "Ω", "∞", "√", "θ"];
export const MEMORY_PAIRS = MEMORY_FACES.length;
export const newHighMemory = () => ({ deck: shuffle(MEMORY_FACES.concat(MEMORY_FACES)), open: [], done: {}, busy: false });

/** Number Series: six terms of an arithmetic / geometric / square / Fibonacci-like / growing-step pattern, the sixth is the answer. */
export function newSeries() {
  const k = rnd(0, 4);
  let t = [];
  if (k === 0) {
    const a = rnd(3, 30);
    const d = rnd(4, 13);
    for (let i = 0; i < 6; i++) t.push(a + d * i);
  } else if (k === 1) {
    const a = rnd(2, 5);
    const q = rnd(2, 3);
    for (let i = 0; i < 6; i++) t.push(a * Math.pow(q, i));
  } else if (k === 2) {
    const b = rnd(2, 6);
    const c = rnd(-3, 5);
    for (let i = 0; i < 6; i++) t.push((b + i) * (b + i) + c);
  } else if (k === 3) {
    t = [rnd(1, 5), rnd(2, 7)];
    while (t.length < 6) t.push(t[t.length - 1] + t[t.length - 2]);
  } else {
    const a = rnd(2, 9);
    const d = rnd(2, 4);
    t = [a];
    for (let i = 1; i < 6; i++) t.push(t[i - 1] + d * i);
  }
  const ans = t[5];
  return { q: t.slice(0, 5).join(",  ") + ",  ?", ans, opts: opts4(ans) };
}

/**
 * Mental Math: a short expression, or "p% of n" (pct), with four answers. `pct` ([p, n] or null) lets a screen show the
 * "p% of n" question in its own language; `q` stays the English text.
 */
export function newMental() {
  const k = rnd(0, 4);
  let q = "";
  let ans = 0;
  let pct = null;
  if (k === 0) {
    const a = rnd(12, 29);
    const b = rnd(4, 9);
    const c = rnd(5, 40);
    q = a + " × " + b + " − " + c;
    ans = a * b - c;
  } else if (k === 1) {
    const p = [10, 15, 20, 25, 30, 40, 75][rnd(0, 6)];
    const n = rnd(2, 16) * 20;
    pct = [p, n];
    ans = (p * n) / 100;
  } else if (k === 2) {
    const a = rnd(4, 9);
    const b = rnd(11, 19);
    const c = rnd(2, 6);
    q = "(" + a + " + " + b + ") × " + c;
    ans = (a + b) * c;
  } else if (k === 3) {
    const a = rnd(11, 25);
    const b = rnd(10, 99);
    q = a + "² − " + b;
    ans = a * a - b;
  } else {
    const d = rnd(3, 9);
    const x = rnd(12, 40);
    const c = rnd(2, 30);
    q = d * x + " ÷ " + d + " + " + c;
    ans = x + c;
  }
  return { q: pct ? pct[0] + "% of " + pct[1] : q, ans, opts: opts4(ans), pct };
}

/** Odd One Out: four numbers that follow a rule (primes, squares, multiples, cubes) and one that does not. */
export function newOddOne() {
  const k = rnd(0, 3);
  let good = [];
  let bad = 0;
  if (k === 0) {
    good = pick([11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53], 4);
    bad = pick([21, 27, 33, 39, 49, 51, 57, 91], 1)[0];
  } else if (k === 1) {
    good = pick([16, 25, 36, 49, 64, 81, 100, 121, 144], 4);
    bad = pick([24, 48, 50, 63, 80, 99, 120], 1)[0];
  } else if (k === 2) {
    const m = rnd(6, 9);
    good = pick([2, 3, 4, 5, 6, 7, 8, 9, 11, 12].map((x) => x * m), 4);
    bad = good[0] + rnd(1, m - 1);
  } else {
    good = pick([8, 27, 64, 125, 216, 343], 4);
    bad = pick([36, 49, 81, 100, 144], 1)[0];
  }
  return { ans: bad, items: shuffle(good.concat([bad])) };
}
