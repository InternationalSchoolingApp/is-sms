// A tiny event bus: any part of the dashboard calls celebrate(...) when something worth celebrating happened; the one
// CelebrationHost in the shell draws it (and ignores it under Reduced Motion). No React state, no props to thread.
//   celebrate({ kind: "confetti" })                      - confetti falls from the top
//   celebrate({ kind: "burst", x, y })                   - a star burst + sparkles at a point (viewport px, default centre)
//   celebrate({ kind: "day-complete" })                  - both: the whole day's classes are done
const listeners = new Set();

export function celebrate(effect) {
  listeners.forEach((listener) => listener(effect));
}

export function onCelebrate(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
