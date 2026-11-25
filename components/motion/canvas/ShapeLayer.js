// Slow floating shapes: stars, bubbles, clouds (Playful) and soft circles / rounded squares (Balanced).
const TAU = Math.PI * 2;

function pickKind(band, i) {
  if (band === "k5") return ["star", "bubble", "cloud", "circle"][i % 4];
  return ["circle", "square"][i % 2];
}

export function createShapes({ count, width, height, palette, band }) {
  const shapes = Array.from({ length: count }, (_, i) => {
    const kind = pickKind(band, i);
    return {
      kind,
      x: Math.random() * width,
      y: Math.random() * height,
      size: kind === "cloud" ? 54 + Math.random() * 40 : 16 + Math.random() * 26,
      speed: kind === "cloud" ? 4 + Math.random() * 5 : 7 + Math.random() * 11, // px / s
      rotation: Math.random() * TAU,
      spin: (Math.random() - 0.5) * 0.5, // rad / s
      phase: Math.random() * TAU,
      color: palette[i % palette.length],
      alpha: band === "k5" ? 0.2 + Math.random() * 0.14 : 0.07 + Math.random() * 0.07,
    };
  });
  return { shapes, band };
}

function star(ctx, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const radius = i % 2 === 0 ? r : r * 0.45;
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    ctx.lineTo(Math.cos(angle) * radius, Math.sin(angle) * radius);
  }
  ctx.closePath();
  ctx.fill();
}

function cloud(ctx, size) {
  ctx.beginPath();
  ctx.arc(-size * 0.28, 0, size * 0.22, 0, TAU);
  ctx.arc(0, -size * 0.1, size * 0.28, 0, TAU);
  ctx.arc(size * 0.28, 0, size * 0.22, 0, TAU);
  ctx.rect(-size * 0.28, 0, size * 0.56, size * 0.22);
  ctx.fill();
}

export function stepAndDrawShapes(layer, { ctx, width, height, dt, time }) {
  const seconds = dt / 1000;
  for (const s of layer.shapes) {
    s.y -= s.speed * seconds;
    s.rotation += s.spin * seconds;
    const x = s.x + Math.sin(time / 3000 + s.phase) * 14;
    if (s.y < -s.size) {
      s.y = height + s.size;
      s.x = Math.random() * width;
    }

    ctx.save();
    ctx.translate(x, s.y);
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = s.color;
    ctx.strokeStyle = s.color;
    if (s.kind === "star") {
      ctx.rotate(s.rotation);
      star(ctx, s.size / 2);
    } else if (s.kind === "bubble") {
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, s.size / 2, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = s.alpha * 0.35;
      ctx.fill();
    } else if (s.kind === "cloud") {
      cloud(ctx, s.size);
    } else if (s.kind === "square") {
      ctx.rotate(s.rotation);
      ctx.beginPath();
      ctx.roundRect(-s.size / 2, -s.size / 2, s.size, s.size, s.size * 0.28);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s.size / 2, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}
