"use client";

import { useEffect, useRef } from "react";

// Playful.dc.html bgDots(): "Interactive dots behind every page (from the IS LMS chat-background): one fixed canvas. Dots sit on a
// 24px grid, move away from the pointer and spring back. The loop runs only while something moves." The numbers below are the
// mockup's own.
const GAP = 24;
const RADIUS = 120;
const PUSH = 30;
const EASE = 0.15;
const SIZE = 2;
const GROW = 2.5;
const HOVER = ["#FFB3C1", "#FFD97A", "#B8A6FF", "#8EDDBD", "#9DB8FF"];

const hex = (value) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(value || "").trim());
  return m ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)] : null;
};

/**
 * The Elementary (Playful) page background: the mockup's dot grid. Grade 6–12 (Balanced / Mature) have a flat page in their mockups,
 * so the shell renders this for the Playful look only (components/motion/canvas/CanvasBackground.jsx). `still`: Reduced Motion - the
 * dots are drawn but never move. The dot colour is the --k5-dot token (day #D5E5FF, night #2B3A6B: app/k5-theme.css).
 */
export function DotGridBackground({ still = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const readBase = () => {
      const a = hex(getComputedStyle(cv).getPropertyValue("--k5-dot"));
      return a ? `rgb(${a.join(",")})` : "rgb(213,229,255)";
    };
    let base = readBase();
    let ctx = null;
    let dots = [];
    let w = 0;
    let h = 0;
    let ptr = null;
    let raf = 0;

    const build = () => {
      const dpr = window.devicePixelRatio || 1;
      w = cv.offsetWidth;
      h = cv.offsetHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      ctx = cv.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dots = [];
      let i = 0;
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          dots.push({ hx: x, hy: y, x, y, c: HOVER[i % HOVER.length] });
          i += 1;
        }
      }
    };

    const frame = () => {
      raf = 0;
      if (!cv.isConnected || !ctx) return;
      let moving = false;
      ctx.clearRect(0, 0, w, h);
      for (let i = 0; i < dots.length; i += 1) {
        const d = dots[i];
        let tx = d.hx;
        let ty = d.hy;
        if (ptr && !still) {
          const dx = d.hx - ptr.x;
          const dy = d.hy - ptr.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < RADIUS && dist > 0.01) {
            const f = Math.pow(1 - dist / RADIUS, 2) * PUSH;
            tx = d.hx + (dx / dist) * f;
            ty = d.hy + (dy / dist) * f;
          }
        }
        const ex = tx - d.x;
        const ey = ty - d.y;
        if (Math.abs(ex) + Math.abs(ey) > 0.05) {
          d.x += ex * EASE;
          d.y += ey * EASE;
          moving = true;
        } else {
          d.x = tx;
          d.y = ty;
        }
        const moved = Math.min(1, (Math.abs(d.x - d.hx) + Math.abs(d.y - d.hy)) / 14);
        ctx.globalAlpha = 1;
        ctx.fillStyle = base;
        ctx.beginPath();
        ctx.arc(d.x, d.y, SIZE + moved * GROW, 0, Math.PI * 2);
        ctx.fill();
        if (moved > 0.02) {
          ctx.globalAlpha = moved;
          ctx.fillStyle = d.c;
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      if (moving) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const at = (e) => {
      const r = cv.getBoundingClientRect();
      if (!r.width || !r.height) return null;
      return { x: (e.clientX - r.left) * (cv.offsetWidth / r.width), y: (e.clientY - r.top) * (cv.offsetHeight / r.height) };
    };
    const off = () => {
      if (ptr) {
        ptr = null;
        kick();
      }
    };
    const onMove = (e) => {
      ptr = at(e);
      kick();
    };
    const onUp = (e) => {
      if (e.pointerType === "touch") off();
    };
    const sync = () => {
      const next = readBase();
      const recolour = next !== base;
      base = next;
      if (cv.offsetWidth !== w || cv.offsetHeight !== h) {
        build();
        kick();
      } else if (recolour) kick();
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    window.addEventListener("pointercancel", off, { passive: true });
    window.addEventListener("blur", off);
    document.documentElement.addEventListener("pointerleave", off);
    let observer = null;
    if (window.ResizeObserver) {
      observer = new ResizeObserver(() => sync());
      observer.observe(cv);
    } else {
      window.addEventListener("resize", sync);
    }
    build();
    kick();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", off);
      window.removeEventListener("blur", off);
      document.documentElement.removeEventListener("pointerleave", off);
      window.removeEventListener("resize", sync);
      observer?.disconnect();
    };
  }, [still]);

  return <canvas ref={canvasRef} aria-hidden="true" data-motion-canvas="background" className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
