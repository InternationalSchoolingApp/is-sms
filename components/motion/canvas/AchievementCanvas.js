// Achievement: a star burst with sparkles flying out of a point (a badge unlocked, a day completed).
const TAU = Math.PI * 2;
const LIFE_MS = 1100;

export function createBurst({ x, y, count, palette }) {
  const stars = Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * TAU + Math.random() * 0.3;
    const speed = 160 + Math.random() * 230;
    return {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 9 + Math.random() * 12,
      rotation: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 6,
      color: palette[i % palette.length],
      sparkle: i % 3 === 0, // every third one is a thin four-point sparkle
      px: 0,
      py: 0,
    };
  });
  return { x, y, stars, age: 0 };
}

function fivePointStar(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

function fourPointSparkle(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.12, r, 0);
  ctx.quadraticCurveTo(r * 0.12, r * 0.12, 0, r);
  ctx.quadraticCurveTo(-r * 0.12, r * 0.12, -r, 0);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.12, 0, -r);
  ctx.fill();
}

/** Returns false when the burst is over. */
export function stepAndDrawBurst(effect, { ctx, dt }) {
  effect.age += dt;
  if (effect.age > LIFE_MS) return false;
  const t = effect.age / LIFE_MS;
  const seconds = dt / 1000;
  const ease = 1 - t * t; // the burst slows down as it fades
  for (const s of effect.stars) {
    s.px += s.vx * seconds * ease;
    s.py += s.vy * seconds * ease + 40 * seconds * t; // a little sag at the end
    s.rotation += s.spin * seconds;
    ctx.save();
    ctx.translate(effect.x + s.px, effect.y + s.py);
    ctx.rotate(s.rotation);
    ctx.globalAlpha = Math.max(0, 1 - t * t * t);
    ctx.fillStyle = s.color;
    const scale = 0.4 + Math.sin(Math.min(1, t * 1.6) * Math.PI * 0.5) * 0.9;
    if (s.sparkle) fourPointSparkle(ctx, s.size * scale);
    else fivePointStar(ctx, s.size * scale);
    ctx.restore();
  }
  return true;
}
