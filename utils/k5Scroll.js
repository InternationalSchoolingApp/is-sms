// Scroll helpers for the Grade K–5 home: after a student picks a day, bring the part that
// shows it into view, but only when it is not already there (never scroll a visible page).

const HEADER = 100; // sticky K–5 header

function motion(el) {
  const reduced = el.closest('[data-motion="reduced"]') || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return reduced ? "auto" : "smooth";
}

/** Scroll `el` just enough to show all of it (its top stays below the header). */
export function revealElement(el) {
  if (!el) return;
  const { top, bottom } = el.getBoundingClientRect();
  if (top >= HEADER && bottom <= window.innerHeight) return;
  el.scrollIntoView({ behavior: motion(el), block: bottom - top > window.innerHeight - HEADER ? "start" : "nearest" });
}

/** Put the top of `el` under the header when it is off-screen or far down the page. */
export function revealPlanTop(el) {
  if (!el) return;
  const { top } = el.getBoundingClientRect();
  if (top >= HEADER && top <= window.innerHeight * 0.45) return;
  el.scrollIntoView({ behavior: motion(el), block: "start" });
}
