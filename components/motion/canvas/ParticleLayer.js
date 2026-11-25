// Floating, softly glowing particles. Plain functions on plain objects: no React, no per-frame allocation.
import { makeGlowSprite } from "@/components/motion/canvas/palette";

const REPEL_RADIUS = 110;

export function createParticles({ count, width, height, palette, band }) {
  const sprites = palette.map((color) => makeGlowSprite(color));
  const particles = Array.from({ length: count }, (_, i) => {
    const size = band === "k5" ? 10 + Math.random() * 22 : 8 + Math.random() * 16;
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      size,
      speed: 6 + Math.random() * 14, // px / s, upwards
      drift: (Math.random() - 0.5) * 10, // px / s, sideways
      phase: Math.random() * Math.PI * 2,
      alpha: band === "high" ? 0.1 + Math.random() * 0.12 : 0.16 + Math.random() * 0.22,
      sprite: sprites[i % sprites.length],
      ox: 0,
      oy: 0,
    };
  });
  return { particles, interactive: band !== "high" };
}

/** pointer: { x, y, active } in CSS pixels (shared, updated outside React). */
export function stepAndDrawParticles(layer, { ctx, width, height, dt, time }, pointer) {
  const seconds = dt / 1000;
  for (const p of layer.particles) {
    p.y -= p.speed * seconds;
    p.x += (p.drift + Math.sin(time / 2200 + p.phase) * 6) * seconds;
    if (p.y < -p.size) {
      p.y = height + p.size;
      p.x = Math.random() * width;
    }
    if (p.x < -p.size) p.x = width + p.size;
    else if (p.x > width + p.size) p.x = -p.size;

    // A gentle push away from the pointer that eases back when it leaves.
    let tx = 0;
    let ty = 0;
    if (layer.interactive && pointer.active) {
      const dx = p.x - pointer.x;
      const dy = p.y - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < REPEL_RADIUS) {
        const push = (1 - distance / REPEL_RADIUS) * 28;
        tx = (dx / distance) * push;
        ty = (dy / distance) * push;
      }
    }
    p.ox += (tx - p.ox) * 0.08;
    p.oy += (ty - p.oy) * 0.08;

    ctx.globalAlpha = p.alpha;
    ctx.drawImage(p.sprite, p.x + p.ox - p.size / 2, p.y + p.oy - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}
