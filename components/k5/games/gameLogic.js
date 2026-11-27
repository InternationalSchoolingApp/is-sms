// Pure helpers for the K–5 free-day mini games (Playful.dc.html newMem / newCount / newMath /
// newShape / playPop). No data leaves the browser and nothing is saved.

export const GAMES = [
  { id: "balloon", emoji: "🎈", name: "Balloon Pop", how: "Tap the balloons to pop them!", border: "border-k5-pi", bg: "bg-k5-pt", rim: "shadow-[0_5px_0_var(--k5-pI)]" },
  { id: "memory", emoji: "🃏", name: "Memory Match", how: "Flip two cards. Find the pairs!", border: "border-k5-bi", bg: "bg-k5-bt", rim: "shadow-[0_5px_0_var(--k5-bI)]" },
  { id: "mole", emoji: null, name: "Pop-Up Pals", how: "Tap the friend before it hides!", border: "border-k5-gi", bg: "bg-k5-gt", rim: "shadow-[0_5px_0_var(--k5-gI)]" },
  { id: "count", emoji: "⭐", name: "Count the Stars", how: "How many stars do you see?", border: "border-k5-mi", bg: "bg-k5-mt", rim: "shadow-[0_5px_0_var(--k5-mI)]" },
  { id: "math", emoji: "➕", name: "Quick Math", how: "Pick the right answer!", border: "border-k5-grn", bg: "bg-k5-gt", rim: "shadow-[0_5px_0_var(--k5-grnD)]" },
  { id: "shape", emoji: "🔷", name: "Find the Shape", how: "Tap the shape I ask for!", border: "border-k5-vi", bg: "bg-k5-vt", rim: "shadow-[0_5px_0_var(--k5-vI)]" },
];

export function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Three answer buttons: the right one and two near misses, in a random order. */
export function numOpts(answer, lo, hi) {
  const set = [answer];
  let guard = 0;
  while (set.length < 3 && guard++ < 50) {
    const n = answer + [-2, -1, 1, 2, 3][Math.floor(Math.random() * 5)];
    if (n >= lo && n <= hi && !set.includes(n)) set.push(n);
  }
  return shuffle(set);
}

const MEMORY_FACES = ["🍎", "🐶", "⭐", "🌈", "🚗", "🎈"];
export const newMemory = () => ({ deck: shuffle(MEMORY_FACES.concat(MEMORY_FACES)), open: [], done: {}, busy: false });

export function newCount() {
  const n = 3 + Math.floor(Math.random() * 7);
  const cells = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]).slice(0, n);
  const stars = cells.map((c) => ({
    x: (4 + (c % 6) * 16 + Math.random() * 6).toFixed(1) + "%",
    y: (8 + Math.floor(c / 6) * 46 + Math.random() * 18).toFixed(0) + "%",
  }));
  return { n, stars, opts: numOpts(n, 1, 12) };
}

export function newMath() {
  const a = 1 + Math.floor(Math.random() * 9);
  const b = 1 + Math.floor(Math.random() * 9);
  return { a, b, opts: numOpts(a + b, 2, 20) };
}

export const SHAPES = ["circle", "square", "triangle", "star", "heart"];
export function newShape() {
  const colors = shuffle(["#E5484D", "#2F7BF5", "#1F9E5A", "#FFB020", "#9B6BFF"]);
  const items = shuffle(SHAPES).slice(0, 4);
  return { target: items[Math.floor(Math.random() * 4)], items: items.map((kind, i) => ({ kind, color: colors[i] })) };
}

let audio = null;
/** The balloon "pop": a short noise burst plus a falling tone (mockup playPop). Silent if audio is unavailable. */
export function playPop() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!audio) audio = new AC();
    if (audio.state === "suspended") audio.resume();
    const t = audio.currentTime;
    const len = Math.floor(audio.sampleRate * 0.09);
    const buf = audio.createBuffer(1, len, audio.sampleRate);
    const data = buf.getChannelData(0);
    for (let k = 0; k < len; k++) data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 3);
    const noise = audio.createBufferSource();
    noise.buffer = buf;
    const band = audio.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = 1700;
    band.Q.value = 0.7;
    const noiseGain = audio.createGain();
    noiseGain.gain.setValueAtTime(0.9, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noise.connect(band);
    band.connect(noiseGain);
    noiseGain.connect(audio.destination);
    noise.start(t);
    const osc = audio.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(850 + Math.random() * 350, t);
    osc.frequency.exponentialRampToValueAtTime(130, t + 0.12);
    const oscGain = audio.createGain();
    oscGain.gain.setValueAtTime(0.45, t);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    osc.connect(oscGain);
    oscGain.connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.16);
  } catch {
    // no audio: the pop is just silent
  }
}
