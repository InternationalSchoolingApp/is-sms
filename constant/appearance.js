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
  voice: ["cheerful", "calm", "squeaky", "robot", "slow"],
  speech: ["on", "off"],
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
  voice: "cheerful",
  speech: "on",
};

// School policy (admin CONFIGURATION keys arrive in Phase 4). Customization off = defaults
// enforced; saved overrides are kept, just inactive.
export const DEFAULT_POLICY = { allowUserCustomization: true, defaults: DEFAULT_APPEARANCE };

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

// Web Speech presets (mockup).
export const VOICES = {
  cheerful: { name: "Cheerful", pitch: 1.2, rate: 0.95 },
  calm: { name: "Calm", pitch: 1.0, rate: 0.85 },
  squeaky: { name: "Squeaky", pitch: 1.75, rate: 1.05 },
  robot: { name: "Robot", pitch: 0.55, rate: 0.85 },
  slow: { name: "Slow & clear", pitch: 1.15, rate: 0.7 },
};

/** Only allowlisted values survive; everything else takes the default. */
export function sanitizeAppearance(value, defaults = DEFAULT_APPEARANCE) {
  const source = value && typeof value === "object" ? value : {};
  return Object.fromEntries(
    Object.entries(APPEARANCE_OPTIONS).map(([key, allowed]) => [key, allowed.includes(source[key]) ? source[key] : defaults[key]]),
  );
}
