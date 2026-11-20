// Which device the login intro shows and how it is sized. Decided from the viewport width (the same breakpoints the
// dashboard layouts use), never from the user agent. The real dashboard is laid out at the full viewport size inside the
// device's screen and the whole device is scaled down, so the screen shows exactly the layout this viewport gets (a phone
// gets the mobile layout, not a shrunken desktop).
//   laptop (>= 1100 px wide)  - about 40 % of the viewport width
//   tablet (760 - 1099 px)    - about 40 % of the viewport width
//   phone  (< 760 px)         - about 60 % of the viewport height
export const TABLET_MIN = 760;
export const LAPTOP_MIN = 1100;

export function deviceFor(width) {
  if (width < TABLET_MIN) return "phone";
  if (width < LAPTOP_MIN) return "tablet";
  return "laptop";
}

/**
 * Geometry for `device` at a vw x vh viewport. All lengths are in the device's own pixels (the screen is vw x vh before it
 * is scaled): bezel = frame thickness (top / sides / bottom), radius = the screen's corner, scale = how small the whole
 * device is drawn, tilt = the resting 3D turn in degrees.
 */
export function geometry(device, vw, vh) {
  if (device === "phone") {
    const side = Math.round(vw * 0.05);
    const top = Math.round(vw * 0.075);
    const total = vh + top + side; // device height in screen pixels
    const scale = Math.min(0.6 * vh / total, 0.9 * vw / (vw + 2 * side));
    return { device, bezel: { top, side, bottom: side }, radius: Math.round(vw * 0.085), outer: Math.round(vw * 0.13), scale, tilt: { x: 4, y: -12 }, base: 0 };
  }
  if (device === "tablet") {
    const side = Math.round(vw * 0.035);
    const scale = Math.min(0.4 * vw / (vw + 2 * side), 0.6 * vh / (vh + 2 * side));
    return { device, bezel: { top: side, side, bottom: side }, radius: Math.round(vw * 0.018), outer: Math.round(vw * 0.035), scale, tilt: { x: 4, y: -10 }, base: 0 };
  }
  const side = Math.round(vw * 0.022);
  const bottom = Math.round(vw * 0.03);
  const baseHeight = Math.round(vw * 0.03);
  const totalWidth = vw * 1.14; // the base is wider than the lid
  const scale = Math.min(0.4 * vw / totalWidth, 0.6 * vh / (vh + side + bottom + baseHeight));
  return { device, bezel: { top: side, side, bottom }, radius: Math.round(vw * 0.008), outer: Math.round(vw * 0.016), scale, tilt: { x: 5, y: -14 }, base: baseHeight };
}
