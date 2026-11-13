/*
 * The buddy's voice clips (port of LoginHighlight.jsp playerOf / warmVoice / follow). The backend makes each sentence
 * once (TtsService) and returns {url, times}; here they are got ready ahead of the tap, remembered in this browser
 * (so a reload plays at once) and played.
 */

const clean = (text) => String(text || "").replace(/\s+/g, " ").trim();

// Remembered clips survive a reload. Raise the version when the clip format changes: older entries are then dropped
// (the backend still has the files, so asking again is quick).
// v2: one clip per voice and speed.
const STORE_KEY = "is-pico-voice:v2";
const STORE_MAX = 300;

function readStore() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}
function remember(text, clip) {
  try {
    const saved = readStore();
    saved[text] = clip;
    const keys = Object.keys(saved);
    // Oldest out first when the list grows too long.
    keys.slice(0, Math.max(0, keys.length - STORE_MAX)).forEach((k) => delete saved[k]);
    window.localStorage.setItem(STORE_KEY, JSON.stringify(saved));
  } catch {
    // storage full or blocked: the clip is still used for this page
  }
}

// After a failed answer (voice not set up, backend down) nothing is asked for a while, so a page does not fire a request
// per sentence and fill the console with errors; the browser voice says everything meanwhile.
const COOL_DOWN_MS = 5 * 60 * 1000;
let coolUntil = 0;

// text -> Promise<{url, times} | null>, so a sentence is asked for once per page life.
const clips = new Map();
// One <audio> per url, so a clip is downloaded once however often it is played.
const players = new Map();

export function playerOf(url) {
  let audio = players.get(url);
  if (!audio) {
    audio = new Audio();
    audio.preload = "auto";
    audio.src = url;
    players.set(url, audio);
  }
  return audio;
}

const validClip = (clip) => (clip && /^https?:\/\//i.test(clip.url || "") ? { url: clip.url, times: Array.isArray(clip.times) ? clip.times : [] } : null);

// A clip belongs to a sentence in one voice at one speed.
const keyOf = (text, voice) => `${voice?.id || "default"}|${voice?.speed ?? ""}|${text}`;

async function askBackend(text, voice) {
  const response = await fetch("/api/pico-voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voice: voice?.id, speed: voice?.speed }),
    cache: "no-store",
  });
  return response.ok ? validClip(await response.json().catch(() => null)) : null;
}

/**
 * The clip of this sentence in this voice ({id, speed}, see voiceOf in constant/appearance.js): remembered in this browser,
 * else asked for once (null when it cannot be made).
 */
export function clipFor(text, voice) {
  const said = clean(text);
  if (!said || typeof window === "undefined") return Promise.resolve(null);
  const key = keyOf(said, voice);
  if (!clips.has(key)) {
    const known = validClip(readStore()[key]);
    if (known) {
      clips.set(key, Promise.resolve(known));
    } else if (Date.now() < coolUntil) {
      return Promise.resolve(null);
    } else {
      clips.set(
        key,
        askBackend(said, voice)
          .then((clip) => {
            if (clip) remember(key, clip);
            else {
              clips.delete(key); // try again later
              coolUntil = Date.now() + COOL_DOWN_MS;
            }
            return clip;
          })
          .catch(() => {
            clips.delete(key);
            coolUntil = Date.now() + COOL_DOWN_MS;
            return null;
          }),
      );
    }
  }
  return clips.get(key);
}

/** The clip of this sentence in this voice right now, if this browser already has it, else null. */
export function readyClip(text, voice) {
  const said = clean(text);
  if (!said || typeof window === "undefined") return null;
  return validClip(readStore()[keyOf(said, voice)]);
}

/**
 * Gets these sentences ready (made on the backend, audio downloaded) once the browser is idle, a few at a time, so the
 * student's tap plays at once. Returns a cancel function. Nothing is played here.
 */
export function preparePicoClips(texts, voice) {
  if (typeof window === "undefined") return () => {};
  const list = [...new Set(texts.map(clean).filter(Boolean))];
  if (!list.length) return () => {};
  let idle = 0;
  let cancelled = false;
  const run = () => {
    const queue = list.slice();
    const worker = async () => {
      while (queue.length && !cancelled) {
        const clip = await clipFor(queue.shift(), voice);
        if (clip && !cancelled) playerOf(clip.url);
      }
    };
    // Three at a time: quick, and the page's own requests still come first.
    for (let i = 0; i < 3; i += 1) worker();
  };
  const timer = setTimeout(
    () => {
      if (window.requestIdleCallback) idle = window.requestIdleCallback(run, { timeout: 3000 });
      else run();
    },
    document.readyState === "complete" ? 300 : 1500,
  );
  return () => {
    cancelled = true;
    clearTimeout(timer);
    if (idle && window.cancelIdleCallback) window.cancelIdleCallback(idle);
  };
}

/** Index of the word being said at `now` seconds (-1 between words), from the clip's [start, end] times. */
export function wordAt(times, now) {
  for (let i = 0; i < times.length; i += 1) {
    const next = times[i + 1];
    const end = next && next[0] >= 0 ? next[0] - 0.03 : times[i][1] + 0.15;
    if (times[i][0] >= 0 && now >= times[i][0] - 0.03 && now < end) return i;
  }
  return -1;
}
