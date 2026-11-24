// Confetti: coloured paper pieces thrown up from the lower edge in two fans, then falling with a flutter. Plain functions
// on plain objects (the CelebrationHost owns the canvas). `strength` is a per-band multiplier of the piece count.
const TAU = Math.PI * 2;
const LIFE_MS = 1900;
const FADE_MS = 450;

export function createConfetti({ width, height, count, palette }) {
  const pieces = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const spread = 0.15 + Math.random() * 0.6;
    const angle = -Math.PI / 2 + (fromLeft ? spread : -spread); // up and inwards
    const speed = 520 + Math.random() * 520;
    return {
      x: fromLeft ? width * 0.08 : width * 0.92,
      y: height * 0.95,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      w: 6 + Math.random() * 7,
      h: 4 + Math.random() * 6,
      rotation: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 12,
      flutter: Math.random() * TAU,
      color: palette[i % palette.length],
    };
  });
  return { pieces, age: 0 };
}

/** Returns false when the confetti is over. */
export function stepAndDrawConfetti(effect, { ctx, dt }) {
  effect.age += dt;
  if (effect.age > LIFE_MS) return false;
  const seconds = dt / 1000;
  const fade = effect.age > LIFE_MS - FADE_MS ? (LIFE_MS - effect.age) / FADE_MS : 1;
  for (const p of effect.pieces) {
    p.vy += 900 * seconds; // gravity
    p.vx *= 1 - 1.6 * seconds; // air drag
    p.vy *= 1 - 0.6 * seconds;
    p.x += p.vx * seconds;
    p.y += p.vy * seconds;
    p.rotation += p.spin * seconds;
    p.flutter += 9 * seconds;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.scale(1, Math.cos(p.flutter)); // turning paper
    ctx.globalAlpha = fade;
    ctx.fillStyle = p.color;
    ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }
  return true;
}
