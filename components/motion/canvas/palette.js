// Colours for the ambient canvas: the student's own accent (Ocean / Berry / Jungle ...) read from the shell's CSS
// variables, so the background follows the chosen look. Playful adds a few friendly extras; Balanced and Mature use
// the accent only.
export function readPalette(el, band) {
  // `el` can be null when the canvas was just removed (a resize report arriving after unmount): fall back to the page root.
  const style = getComputedStyle(el instanceof Element ? el : document.documentElement);
  const token = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  const accent = token("--k5-ac", "#1e66e0");
  if (band !== "k5") return [accent];
  return [accent, "#ffc531", "#ff7eb6", token("--k5-vI", "#6a3fc4"), "#2fbf8a"];
}

/** A soft round glow drawn once (not a gradient per particle per frame), tinted `color`. */
export function makeGlowSprite(color, size = 48) {
  const sprite = document.createElement("canvas");
  sprite.width = size;
  sprite.height = size;
  const ctx = sprite.getContext("2d");
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.35, color);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return sprite;
}
