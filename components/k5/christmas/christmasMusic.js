// The Christmas theme's music (Playful / Middle / High mockups: startMusic, schedMusic, bell, jingle): "Jingle Bells" played with
// the Web Audio API (sine bells + a little sleigh-bell noise), so there is no audio file. Browsers keep an AudioContext silent
// until the student has touched the page; when it starts suspended it waits for the first tap or key and then plays.

const C = 523.25;
const D = 587.33;
const E = 659.25;
const F = 698.46;
const G = 783.99;
const SONG = [
  [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [C, 1.5], [D, 0.5], [E, 4],
  [F, 1], [F, 1], [F, 1.5], [F, 0.5], [F, 1], [E, 1], [E, 1], [E, 0.5], [E, 0.5], [E, 1], [D, 1], [D, 1], [E, 1], [D, 2], [G, 2],
  [E, 1], [E, 1], [E, 2], [E, 1], [E, 1], [E, 2], [E, 1], [G, 1], [C, 1.5], [D, 0.5], [E, 4],
  [F, 1], [F, 1], [F, 1.5], [F, 0.5], [F, 1], [E, 1], [E, 1], [E, 0.5], [E, 0.5], [G, 1], [G, 1], [F, 1], [D, 1], [C, 4], [0, 2],
];
const BEAT = 0.36;

let ac = null;
let music = null;
let timer = 0;
let unlock = null;

function bell(freq, time, dur, out) {
  try {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(0.16, time + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, time + Math.min(dur, 0.9) + 0.35);
    g.connect(out);
    const o1 = ac.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(freq, time);
    o1.connect(g);
    const g2 = ac.createGain();
    g2.gain.value = 0.25;
    g2.connect(g);
    const o2 = ac.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(freq * 2, time);
    o2.connect(g2);
    o1.start(time);
    o2.start(time);
    o1.stop(time + Math.min(dur, 0.9) + 0.4);
    o2.stop(time + Math.min(dur, 0.9) + 0.4);
  } catch {
    // a note that cannot be played is skipped
  }
}

function jingle(time, out) {
  try {
    const len = Math.floor(ac.sampleRate * 0.06);
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let k = 0; k < len; k++) data[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / len, 2);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const hp = ac.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 6000;
    const g = ac.createGain();
    g.gain.value = 0.12;
    src.connect(hp);
    hp.connect(g);
    g.connect(out);
    src.start(time);
  } catch {
    // skipped
  }
}

function schedule() {
  if (!ac || !music) return;
  while (music.next < ac.currentTime + 0.35) {
    const [freq, beats] = SONG[music.i];
    if (freq) bell(freq, music.next, beats * BEAT, music.mg);
    if (freq && beats >= 1) jingle(music.next, music.mg);
    music.next += beats * BEAT;
    music.i = (music.i + 1) % SONG.length;
  }
}

function dropUnlock() {
  if (!unlock) return;
  ["pointerdown", "keydown"].forEach((name) => document.removeEventListener(name, unlock, true));
  unlock = null;
}

export function startChristmasMusic() {
  if (music || typeof window === "undefined") return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!ac) ac = new Ctx();
    if (ac.state === "suspended") {
      ac.resume().catch(() => {});
      // Still silent (no tap yet): play as soon as the student touches the page.
      if (!unlock) {
        unlock = () => {
          if (ac && ac.state === "suspended") ac.resume().catch(() => {});
          dropUnlock();
        };
        ["pointerdown", "keydown"].forEach((name) => document.addEventListener(name, unlock, true));
      }
    }
    const mg = ac.createGain();
    mg.gain.setValueAtTime(0.0001, ac.currentTime);
    mg.gain.exponentialRampToValueAtTime(0.5, ac.currentTime + 0.6);
    mg.connect(ac.destination);
    music = { next: ac.currentTime + 0.15, i: 0, mg };
    timer = window.setInterval(schedule, 100);
  } catch {
    music = null;
  }
}

export function stopChristmasMusic() {
  dropUnlock();
  if (!music) return;
  window.clearInterval(timer);
  const { mg } = music;
  try {
    mg.gain.cancelScheduledValues(ac.currentTime);
    mg.gain.setValueAtTime(mg.gain.value || 0.5, ac.currentTime);
    mg.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.3);
    window.setTimeout(() => {
      try {
        mg.disconnect();
      } catch {
        // already gone
      }
    }, 500);
  } catch {
    // the fade is only polish
  }
  music = null;
}
