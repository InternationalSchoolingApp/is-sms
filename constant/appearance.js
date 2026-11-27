/**
 * Appearance & personalization allowlist (docs/migration/grade_k5_dashboard_plan.html,
 * section 12). Every stored or cookie value is checked against these lists — anything
 * unknown falls back to the default (APP-016), so no raw CSS / colours ever reach the page.
 * Generic for every band and role; buddy + voice only apply where a buddy exists (K–5).
 */

export const APPEARANCE_OPTIONS = {
  mode: ["light", "dark", "system"],
  theme: ["ocean", "berry", "jungle", "grape", "sunset"],
  textSize: ["small", "medium", "large"],
  colorVision: ["standard", "cvd"],
  contrast: ["standard", "high"],
  reading: ["normal", "spaced"],
  pageColor: ["none", "cream", "peach", "mint", "sky"],
  plainText: ["off", "on"],
  ruler: ["off", "on"],
  dyslexia: ["off", "on"],
  font: ["cute", "simple", "easy", "clear"],
  hand: ["right", "left"],
  motion: ["system", "reduced"],
  buddy: ["pico", "penny", "booky", "bolt", "twinkle"],
  voice: ["heart", "bella", "nicole", "adam", "puck", "emma", "george", "alpha"],
  voiceSpeed: ["slow", "normal", "fast"],
  speech: ["on", "off"],
  buddyEnabled: ["on", "off"],
  gameSound: ["on", "off"],
  // The dashboard look (mockup "Theme"): auto = the student's own grade look.
  gradeLook: ["auto", "playful", "balanced", "mature"],
  // The Christmas (25 December) theme: snow, music and decorations (components/k5/christmas).
  christmas: ["on", "off"],
  // "Pick your pointer" (mockup): the mouse arrow and the little trail it leaves (components/appearance/PointerTrail.jsx).
  pointer: ["normal", "rocket", "star", "wand", "block", "rainbow", "paw"],
};

// Decision 08: Light by default (System stays available in the dialog).
export const DEFAULT_APPEARANCE = {
  mode: "light",
  theme: "ocean",
  textSize: "medium",
  colorVision: "standard",
  contrast: "standard",
  reading: "normal",
  pageColor: "none",
  plainText: "off",
  ruler: "off",
  dyslexia: "off",
  font: "cute",
  hand: "right",
  motion: "system",
  buddy: "pico",
  voice: "heart",
  voiceSpeed: "normal",
  speech: "on",
  buddyEnabled: "on",
  gameSound: "on",
  gradeLook: "auto",
  christmas: "on",
  pointer: "normal",
  buddyNames: {},
};

// School policy (admin CONFIGURATION keys arrive in Phase 4). Customization off = defaults
// enforced; saved overrides are kept, just inactive.
export const DEFAULT_POLICY = { allowUserCustomization: true, defaults: DEFAULT_APPEARANCE };

// The three dashboard looks a student can pick from (mockup Look dialog > Theme): Playful is the Grade K-5 look, Balanced
// the Grade 6-8 look (app/k5-middle.css), Mature the Grade 9-12 look (app/k5-mature.css). Only the look changes: what
// the dashboard shows still follows the student's grade. dots: the colours in the mockup's preview card.
export const GRADE_LOOKS = {
  playful: { name: "Playful Theme", dots: ["#1E66E0", "#C92F6E", "#F2B807", "#1F7A3A"] },
  balanced: { name: "Balanced Theme", dots: ["#027FFE", "#0F766E", "#C2410C", "#6A3FC4"] },
  mature: { name: "Mature Theme", dots: ["#027FFE", "#5B6577", "#AEB6C4", "#E3E7ED"] },
};

/** The look of a grade band: Grade 9-12 Mature, Grade 6-8 Balanced, else Playful. */
export const gradeLookOf = ({ isMiddle, isHigh }) => (isHigh ? "mature" : isMiddle ? "balanced" : "playful");

/** The look on screen: the one the student picked, or their own grade's look (auto). */
export const effectiveGradeLook = (preference, band) => (GRADE_LOOKS[preference] ? preference : gradeLookOf(band));

export const THEME_SWATCHES = {
  ocean: { name: "Ocean", color: "#1E66E0" },
  berry: { name: "Berry", color: "#C42A6B" },
  jungle: { name: "Jungle", color: "#1F7A3A" },
  grape: { name: "Grape", color: "#6A3FC4" },
  sunset: { name: "Sunset", color: "#C2410C" },
};

// Page colour swatches for the day look (CSS tokens live in app/appearance.css, data-tint).
export const PAGE_COLORS = {
  none: { name: "White", color: "#FFFFFF" },
  cream: { name: "Cream", color: "#FFF3D6" },
  peach: { name: "Peach", color: "#FFE3D3" },
  mint: { name: "Mint", color: "#DCF1E3" },
  sky: { name: "Sky", color: "#DCEAFB" },
};

// "Dyslexia-friendly mode" switches these on together (mockup dxMode); turning it off resets them.
export const DYSLEXIA_ON = { dyslexia: "on", font: "simple", reading: "spaced", pageColor: "cream", plainText: "on" };
export const DYSLEXIA_OFF = { dyslexia: "off", font: "cute", reading: "normal", pageColor: "none", plainText: "off", ruler: "off" };

// Buddy art colours (mockup) — body, arm, feet.
export const BUDDIES = {
  pico: { name: "Pico", color: "#2F7BF5", arm: "#1E66E0", feet: "#1747A6" },
  penny: { name: "Penny", color: "#FFC531", arm: "#E0A800", feet: "#A15C1E" },
  booky: { name: "Booky", color: "#6A3FC4", arm: "#7D55D6", feet: "#4C2A94" },
  bolt: { name: "Bolt", color: "#13A89E", arm: "#5C6B8A", feet: "#3A475F" },
  twinkle: { name: "Twinkle", color: "#FFB020", arm: "#E09400", feet: "#C27C00" },
};

// The buddy's voices (backend TtsService, voice.sqoora.com). `id` is the service's voice, `language` the language it must
// be sent with (a voice with another language gets the wrong accent). The backend allows only these (PicoVoiceController).
export const VOICES = {
  heart: { name: "Heart", id: "af_heart", language: "en-us", accent: "US", gender: "girl" },
  bella: { name: "Bella", id: "af_bella", language: "en-us", accent: "US", gender: "girl" },
  nicole: { name: "Nicole", id: "af_nicole", language: "en-us", accent: "US", gender: "girl" },
  adam: { name: "Adam", id: "am_adam", language: "en-us", accent: "US", gender: "boy" },
  puck: { name: "Puck", id: "am_puck", language: "en-us", accent: "US", gender: "boy" },
  emma: { name: "Emma", id: "bf_emma", language: "en-gb", accent: "UK", gender: "girl" },
  george: { name: "George", id: "bm_george", language: "en-gb", accent: "UK", gender: "boy" },
  alpha: { name: "Alpha", id: "hf_alpha", language: "hi", accent: "Hindi", gender: "girl" },
};

// How fast the buddy talks (the service takes 0.5–2.0; 0.8–1.2 is enough for the dashboard).
export const VOICE_SPEEDS = {
  slow: { name: "Slow", value: 0.8 },
  normal: { name: "Normal", value: 1.0 },
  fast: { name: "Fast", value: 1.2 },
};

/** The voice a request sends: {id, language, speed} for these preferences (unknown keys take the defaults). */
export function voiceOf(voice, speed) {
  const v = VOICES[voice] || VOICES.heart;
  return { id: v.id, language: v.language, speed: (VOICE_SPEEDS[speed] || VOICE_SPEEDS.normal).value };
}

// The name a student gave a buddy (mockup "Your buddy's name"): up to 14 characters, one per buddy.
export const BUDDY_NAME_MAX = 14;

/** A typed buddy name: no control characters, at most BUDDY_NAME_MAX characters (an empty result means "the default name"). */
export function cleanBuddyName(value) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").slice(0, BUDDY_NAME_MAX);
}

function sanitizeBuddyNames(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const names = {};
  Object.keys(BUDDIES).forEach((key) => {
    const name = cleanBuddyName(source[key]).trim();
    if (name) names[key] = name;
  });
  return names;
}

/** The name to show for a buddy: the student's own name for it, else its default (Pico, Penny...). */
export function buddyNameOf(preferences, key = preferences?.buddy) {
  const id = BUDDIES[key] ? key : "pico";
  return preferences?.buddyNames?.[id] || BUDDIES[id].name;
}

/** Only allowlisted values survive; everything else takes the default. */
export function sanitizeAppearance(value, defaults = DEFAULT_APPEARANCE) {
  const source = value && typeof value === "object" ? value : {};
  return {
    ...Object.fromEntries(
      Object.entries(APPEARANCE_OPTIONS).map(([key, allowed]) => [key, allowed.includes(source[key]) ? source[key] : defaults[key]]),
    ),
    buddyNames: sanitizeBuddyNames(source.buddyNames ?? defaults.buddyNames),
  };
}
