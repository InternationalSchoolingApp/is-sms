// One place for every dashboard animation's timing, intensity and canvas limits.
// Bands: "k5" (Playful), "middle" (Balanced), "high" (Mature) - see useMotionBand / MotionProvider.
// Rules (an earlier attempt felt slow and its reveal was not smooth):
//  - only opacity / transform are animated on DOM elements (no layout, width or height);
//  - short: 150-300 ms, ease-out; entrance animations only, never an exit that delays navigation;
//  - canvas effects are capped (particle counts, one shared loop) so low-end laptops stay smooth.
export const EASE_OUT = [0.22, 1, 0.36, 1];

export const DUR = {
  fast: 0.15, // small interactions: hover, press, badge
  card: 0.24, // card Zoom In
  dropdown: 0.2, // menus and dropdowns
  slow: 0.5,
  count: 0.6, // count-up
  celebration: 1.2, // confetti / achievement
};

// Zoom In: the scale an element starts from (final scale is 1). Grade intensity overrides any default.
export const ZOOM = { k5: 0.8, middle: 0.88, high: 0.94 };
// Spring is used selectively: playful for K-5, restrained for Middle, none for High (plain ease-out).
export const SPRING = {
  k5: { type: "spring", stiffness: 380, damping: 24, mass: 0.8 },
  middle: { type: "spring", stiffness: 420, damping: 34, mass: 0.8 },
  high: null,
};

// Delay between siblings in a stagger (s): about 40 ms, so even a long list never feels slow.
export const STAGGER = { k5: 0.04, middle: 0.04, high: 0.03 };


// Canvas effects. Counts are for a 1440x900 viewport and scale with area; "low power" halves them.
export const CANVAS = {
  maxDpr: 2,
  maxFrameMs: 50, // a long pause (tab switch) never makes a particle jump
  lowPowerFactor: 0.5,
  particles: { k5: 60, middle: 28, high: 12 },
  shapes: { k5:50, middle: 6, high: 0 },
};
