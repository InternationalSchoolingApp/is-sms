// One requestAnimationFrame loop shared by every canvas effect on the page (never one loop per canvas).
// The loop runs only while at least one effect is subscribed and the tab is visible, so an idle dashboard
// costs nothing. An effect's frame callback returns false when it has finished (confetti), which unsubscribes it.
import { CANVAS } from "@/components/motion/motionConfig";

const effects = new Set();
let frameId = 0;
let lastTime = 0;
let listening = false;

function tick(time) {
  frameId = 0;
  if (!effects.size || document.hidden) return;
  const dt = lastTime ? Math.min(time - lastTime, CANVAS.maxFrameMs) : 16;
  lastTime = time;
  for (const effect of [...effects]) {
    if (effect.frame(dt, time) === false) effects.delete(effect);
  }
  if (effects.size) frameId = requestAnimationFrame(tick);
}

function start() {
  if (!frameId && effects.size && !document.hidden) {
    lastTime = 0; // after a pause the first step is a normal one, not the whole gap
    frameId = requestAnimationFrame(tick);
  }
}

function onVisibility() {
  if (document.hidden) {
    cancelAnimationFrame(frameId);
    frameId = 0;
  } else {
    start();
  }
}

/** Add an effect ({ frame(dt, time) }); returns the function that removes it. */
export function subscribeCanvasEffect(effect) {
  effects.add(effect);
  if (!listening) {
    document.addEventListener("visibilitychange", onVisibility);
    listening = true;
  }
  start();
  return () => {
    effects.delete(effect);
    if (!effects.size) {
      cancelAnimationFrame(frameId);
      frameId = 0;
      document.removeEventListener("visibilitychange", onVisibility);
      listening = false;
    }
  };
}

/** Size a canvas to its CSS box at the device pixel ratio (capped) and return the 2D context in CSS pixels. */
export function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, CANVAS.maxDpr);
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height };
}
