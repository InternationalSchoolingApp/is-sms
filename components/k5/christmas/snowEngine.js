// The Christmas theme's snow (Playful / Middle / High mockups: xmSnow): a canvas over the page where flakes fall and PILE UP on the
// cards (rounded boxes of the page), a card that gets too heavy shakes the snow off, the clumps fall onto cards below or build a
// drift on the ground, and everything slowly melts. Ported from the mockup; only the places it looks for things changed:
// cards are searched inside the dashboard's <main>, the header is the page's <header>, the left menu is #k5-sidenav.
// Returns stop(). Under Reduced Motion nothing starts (the sky keeps its still flakes).

export function startChristmasSnow() {
  if (typeof window === "undefined") return () => {};
  try {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => {};
  } catch {
    // no matchMedia: carry on
  }
  const cv = document.createElement("canvas");
  cv.className = "xm-snowcv";
  cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  document.body.classList.add("xm-snow-on");
  const ctx = cv.getContext("2d");
  let W = 0;
  let H = 0;
  const BIN = 4;
  let TOPY = 84;
  const measureHeader = () => {
    try {
      const header = document.querySelector("header");
      if (header) TOPY = Math.round(header.getBoundingClientRect().bottom);
    } catch {
      // keep the default
    }
  };
  measureHeader();
  let ground = new Float32Array(1);
  const resize = () => {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    cv.width = W * dpr;
    cv.height = H * dpr;
    cv.style.width = `${W}px`;
    cv.style.height = `${H}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = new Float32Array(Math.ceil(W / BIN) + 1);
    for (let i = 0; i < g.length; i++) g[i] = ground[Math.min(ground.length - 1, Math.floor((i * ground.length) / g.length))] || 0;
    ground = g;
    measureHeader();
  };
  resize();
  window.addEventListener("resize", resize);

  const mkFlake = (y) => {
    const z = Math.random();
    const r = z < 0.35 ? 0.7 + Math.random() * 1.1 : 1.5 + Math.random() * 2.6;
    return { x: Math.random() * W, y: y == null ? -8 - Math.random() * 40 : y, py: 0, r, z, vy: 0.45 + r * 0.32 + Math.random() * 0.3, ph: Math.random() * 6.28, sw: 0.4 + Math.random() * 1.1, land: z >= 0.35 };
  };
  const flakes = [];
  const N = Math.round(Math.max(90, Math.min(240, (W * H) / 6200)));
  for (let i = 0; i < N; i++) flakes.push(mkFlake(Math.random() * H));
  const clumps = [];
  const surf = new Map();
  let cands = [];
  let t = 0;
  let raf = 0;

  const scan = () => {
    const out = [];
    const walk = (el, depth) => {
      for (const c of el.children) {
        const r = c.getBoundingClientRect();
        if (r.width < 150 || r.height < 36) {
          if (depth < 4) walk(c, depth + 1);
          continue;
        }
        const cs = getComputedStyle(c);
        const rad = parseFloat(cs.borderTopLeftRadius) || 0;
        const bg = cs.backgroundColor || "";
        const solid = (bg && bg !== "transparent" && bg.indexOf("rgba(0, 0, 0, 0)") < 0) || (cs.backgroundImage && cs.backgroundImage !== "none");
        if (solid && rad >= 14 && cs.visibility !== "hidden") out.push({ el: c, rad });
        else if (depth < 4) walk(c, depth + 1);
      }
    };
    document.querySelectorAll(".k5-layout main").forEach((root) => walk(root, 0));
    cands = out;
    for (const k of surf.keys()) if (!k.isConnected) surf.delete(k);
  };
  const getS = (c, r) => {
    let sd = surf.get(c.el);
    const n = Math.max(3, Math.ceil(r.width / BIN));
    if (!sd || sd.h.length !== n) {
      const h = new Float32Array(n);
      if (sd) for (let i = 0; i < n; i++) h[i] = sd.h[Math.floor((i * sd.h.length) / n)];
      sd = { h, cool: 0, drop: 0, spL: 0, spR: 0 };
      surf.set(c.el, sd);
    }
    return sd;
  };
  const dep = (h, i, a) => {
    const n = h.length;
    if (i < 0 || i >= n) return;
    h[i] += a * 0.5;
    if (i > 0) h[i - 1] += a * 0.25;
    else h[i] += a * 0.25;
    if (i < n - 1) h[i + 1] += a * 0.25;
    else h[i] += a * 0.25;
  };
  const relax = (h, k) => {
    for (let i = 0; i < h.length - 1; i++) {
      const d = h[i] - h[i + 1];
      if (d > 1.1 || d < -1.1) {
        const mv = d * k;
        h[i] -= mv;
        h[i + 1] += mv;
      }
    }
  };
  let SA = new Float32Array(512);
  let SB = new Float32Array(512);
  const smooth = (h, zeroEdge) => {
    const n = h.length;
    if (SA.length < n) {
      SA = new Float32Array(n * 2);
      SB = new Float32Array(n * 2);
    }
    SA.set(h);
    for (let p = 0; p < 3; p++) {
      for (let i = 0; i < n; i++) {
        let sm = 0;
        for (let k = -3; k <= 3; k++) {
          const j = i + k;
          sm += j < 0 ? (zeroEdge ? 0 : SA[0]) : j >= n ? (zeroEdge ? 0 : SA[n - 1]) : SA[j];
        }
        SB[i] = sm / 7;
      }
      const tp = SA;
      SA = SB;
      SB = tp;
    }
    return SA;
  };
  const curve = (x0, ys, n) => {
    let px = x0 + BIN / 2;
    let py = ys(0);
    ctx.lineTo(px, py);
    for (let i = 1; i < n; i++) {
      const x = x0 + i * BIN + BIN / 2;
      const y = ys(i);
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + y) / 2);
      px = x;
      py = y;
    }
    ctx.lineTo(px, py);
    return [px, py];
  };
  const lumps = (h, sh, n, big) => {
    if (h.p1 === undefined) {
      h.p1 = Math.random() * 6.283;
      h.p2 = Math.random() * 6.283;
      h.l1 = (big ? 220 : 110) + Math.random() * 60;
      h.l2 = (big ? 90 : 46) + Math.random() * 24;
    }
    for (let i = 0; i < n; i++) {
      const x = i * BIN;
      const lm = 1 + 0.62 * Math.sin((x / h.l1) * 6.283 + h.p1) + 0.3 * Math.sin((x / h.l2) * 6.283 + h.p2);
      sh[i] = Math.max(0, sh[i] * Math.max(0, lm));
    }
  };
  const pile = (left, top, h) => {
    const n = h.length;
    let any = false;
    for (let i = 0; i < n; i++)
      if (h[i] > 0.35) {
        any = true;
        break;
      }
    if (!any) return;
    const sh = smooth(h, true);
    lumps(h, sh, n, false);
    let pk = 0;
    for (let i = 0; i < n; i++) {
      const te = Math.min(1, ((i + 0.5) * BIN) / 18, ((n - i - 0.5) * BIN) / 18);
      sh[i] = Math.max(0, sh[i] * Math.sin(te * 1.5708) - 1.1);
      if (sh[i] > pk) pk = sh[i];
    }
    if (pk < 0.6) return;
    const y = (i) => top - sh[i];
    const bt = (i) => top + Math.min(1.5, sh[i] * 0.35);
    ctx.beginPath();
    ctx.moveTo(left + BIN / 2, bt(0));
    curve(left, y, n);
    let px = left + (n - 1) * BIN + BIN / 2;
    let py = bt(n - 1);
    ctx.lineTo(px, py);
    for (let i = n - 2; i >= 0; i--) {
      const x = left + i * BIN + BIN / 2;
      const yy = bt(i);
      ctx.quadraticCurveTo(px, py, (px + x) / 2, (py + yy) / 2);
      px = x;
      py = yy;
    }
    ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fill();
  };

  const shake = (el) => {
    try {
      el.animate(
        [
          { transform: "translate(0,0) rotate(0)" },
          { transform: "translate(-7px,1px) rotate(-1.1deg)", offset: 0.12 },
          { transform: "translate(6px,-1px) rotate(.9deg)", offset: 0.26 },
          { transform: "translate(-5px,0) rotate(-.7deg)", offset: 0.4 },
          { transform: "translate(4px,0) rotate(.5deg)", offset: 0.54 },
          { transform: "translate(-3px,0) rotate(-.3deg)", offset: 0.68 },
          { transform: "translate(2px,0)", offset: 0.82 },
          { transform: "translate(0,0) rotate(0)" },
        ],
        { duration: 600, easing: "cubic-bezier(.36,.07,.19,.97)" },
      );
    } catch {
      // no Web Animations: the pile just drops
    }
  };

  const frame = () => {
    t++;
    if (t % 45 === 1) scan();
    const wind = Math.sin(t * 0.004) * 0.35 + Math.sin(t * 0.0013) * 0.3;
    const R = [];
    for (const c of cands) {
      if (!c.el.isConnected) continue;
      const r = c.el.getBoundingClientRect();
      if (r.top <= TOPY + 2 || r.top > H || r.width < 1) continue;
      R.push({ c, r, s: getS(c, r) });
    }
    // flakes
    for (const f of flakes) {
      f.py = f.y;
      f.ph += 0.02;
      f.x += wind * (0.5 + f.z) + Math.sin(f.ph) * f.sw * 0.35;
      f.y += f.vy * (0.6 + f.z * 0.6);
      let done = false;
      if (f.land)
        for (const q of R) {
          if (q.s.shaken) continue;
          const r = q.r;
          if (f.x > r.left + 1 && f.x < r.right - 1) {
            const i = Math.floor((f.x - r.left) / BIN);
            const top = r.top - (q.s.h[i] || 0);
            if (f.py <= top && f.y >= top) {
              if (Math.random() < 0.4) {
                dep(q.s.h, i, f.r * 4.4);
                done = true;
                break;
              }
            }
          }
        }
      if (!done) {
        const gi = Math.max(0, Math.min(ground.length - 1, Math.floor(f.x / BIN)));
        if (f.y >= H - ground[gi]) {
          if (f.land) dep(ground, gi, f.r * 0.9);
          done = true;
        }
      }
      if (done || f.y > H + 10) Object.assign(f, mkFlake());
      if (f.x < -10) f.x += W + 20;
      else if (f.x > W + 10) f.x -= W + 20;
    }
    // surfaces: settle, taper at rounded corners, melt, overflow -> shake
    for (const q of R) {
      const h = q.s.h;
      const n = h.length;
      const rad = Math.max(8, q.c.rad);
      relax(h, 0.22);
      for (let i = 0; i < n; i++) {
        const dEdge = Math.min(i, n - 1 - i) * BIN + BIN / 2;
        const cap = dEdge < rad ? dEdge * 0.55 : 99;
        if (h[i] > cap) {
          const ex = h[i] - cap;
          h[i] = cap;
          if (i < n / 2) q.s.spL += ex;
          else q.s.spR += ex;
        }
        h[i] = Math.max(0, h[i] - 0.00025);
      }
      if (q.s.spL > 1.4) {
        clumps.push({ x: q.r.left + 2, y: q.r.top - 2, r: 1.6 + Math.random(), vx: -0.4 - Math.random() * 0.5, vy: 0, src: q.c.el });
        q.s.spL = 0;
      }
      if (q.s.spR > 1.4) {
        clumps.push({ x: q.r.right - 2, y: q.r.top - 2, r: 1.6 + Math.random(), vx: 0.4 + Math.random() * 0.5, vy: 0, src: q.c.el });
        q.s.spR = 0;
      }
      let sum = 0;
      let mx = 0;
      for (let i = 0; i < n; i++) {
        sum += h[i];
        if (h[i] > mx) mx = h[i];
      }
      if (!q.s.shaken && !q.s.drop && t > q.s.cool && (sum / n > 4.6 || mx > 13)) {
        q.s.drop = t + 9;
        q.s.cool = t + 160;
        q.s.shaken = true;
        shake(q.c.el);
      }
      if (q.s.drop && t >= q.s.drop) {
        q.s.drop = 0;
        for (let i = 0; i < n; i += 2) {
          const hh = (h[i] + (h[i + 1] || 0)) / 2;
          if (hh > 0.5)
            clumps.push({
              x: q.r.left + i * BIN + BIN + (Math.random() - 0.5) * 3,
              y: q.r.top - hh * 0.6,
              r: Math.min(5.5, 0.9 + hh * 0.42),
              vx: (Math.random() - 0.5) * 1.6 + (i < n / 2 ? -0.35 : 0.35),
              vy: -Math.random() * 1.4,
              src: q.c.el,
            });
          h[i] = 0;
          if (i + 1 < n) h[i + 1] = 0;
        }
      }
    }
    // falling clumps: may land on a lower card, else build the ground drift
    for (let k = clumps.length - 1; k >= 0; k--) {
      const c = clumps[k];
      const py = c.y;
      c.vy += 0.24;
      c.vx *= 0.99;
      c.x += c.vx + wind * 0.3;
      c.y += c.vy;
      let gone = false;
      for (const q of R) {
        if (q.c.el === c.src || q.s.shaken) continue;
        const r = q.r;
        if (c.x > r.left + 1 && c.x < r.right - 1) {
          const i = Math.floor((c.x - r.left) / BIN);
          const top = r.top - (q.s.h[i] || 0);
          if (py <= top && c.y >= top) {
            dep(q.s.h, i, c.r * 1.5);
            gone = true;
            break;
          }
        }
      }
      if (!gone) {
        const gi = Math.max(0, Math.min(ground.length - 1, Math.floor(c.x / BIN)));
        if (c.y >= H - ground[gi]) {
          dep(ground, gi, c.r * 1.3);
          gone = true;
        }
      }
      if (gone || c.y > H + 20 || c.x < -20 || c.x > W + 20) clumps.splice(k, 1);
    }
    if (clumps.length > 900) clumps.splice(0, clumps.length - 900);
    relax(ground, 0.18);
    for (let i = 0; i < ground.length; i++) ground[i] = Math.min(34, Math.max(0, ground[i] - 0.004));
    // draw
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#FFFFFF";
    for (const f of flakes)
      if (!f.land) {
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, TOPY, W, H - TOPY);
    {
      const nv = document.querySelector("#k5-sidenav");
      const nr = nv ? nv.getBoundingClientRect() : null;
      if (nr && nr.width > 0) ctx.rect(nr.right + 3, nr.top - 36, -(nr.width + 6), nr.height + 42);
    }
    ctx.clip("evenodd");
    ctx.shadowColor = "rgba(40,70,140,0.28)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 1.5;
    ctx.fillStyle = "#FFFFFF";
    for (const q of R) pile(q.r.left, q.r.top, q.s.h);
    ctx.restore();
    ctx.save();
    ctx.shadowColor = "rgba(40,70,140,0.22)";
    ctx.shadowBlur = 8;
    ctx.fillStyle = "#FFFFFF";
    {
      const gs = smooth(ground, false);
      lumps(ground, gs, ground.length, true);
      ctx.beginPath();
      ctx.moveTo(0, H + 2);
      ctx.lineTo(0, H - gs[0]);
      curve(0, (i) => H - gs[i], ground.length);
      ctx.lineTo(W, H - gs[ground.length - 1]);
      ctx.lineTo(W, H + 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#FFFFFF";
    for (const f of flakes)
      if (f.land) {
        ctx.globalAlpha = 0.75 + f.z * 0.25;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, 6.283);
        ctx.fill();
      }
    ctx.globalAlpha = 1;
    for (const c of clumps) {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, 6.283);
      ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    try {
      cv.remove();
    } catch {
      // already removed
    }
    document.body.classList.remove("xm-snow-on");
  };
}
