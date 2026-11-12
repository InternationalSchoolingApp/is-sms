"use client";

import { useState } from "react";

const W = 640;
const H = 300;
const PAD = { top: 16, right: 12, bottom: 38, left: 44 };

/**
 * A small responsive SVG column chart (no chart library), the home's Attendance and Grades charts.
 *  data     [{ key, label, value }] — one bar each; values are 0-100
 *  barColor (value) => fill       — legacy: grey for 0, a colour otherwise
 *  ticks    number of Y-axis steps (the axis always runs 0-100)
 *  yLabel   (tick value) => text   — "80%" for attendance, a grade letter for grades
 *  tooltip  (item) => string[]     — the lines shown while a bar is hovered or focused
 */
export function BarChart({ data, barColor, ticks, yLabel, tooltip, ariaLabel }) {
  const [active, setActive] = useState(null);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const slot = data.length ? plotW / data.length : plotW;
  const barW = slot * 0.45;
  const y = (v) => PAD.top + plotH - (Math.max(0, Math.min(100, v)) / 100) * plotH;
  const tickValues = Array.from({ length: ticks + 1 }, (_, i) => (100 / ticks) * i);
  const shown = active == null ? null : data[active];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="h-auto w-full">
        {tickValues.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e5e7eb" strokeDasharray="4" />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">
              {yLabel(t)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const x = PAD.left + slot * i + (slot - barW) / 2;
          const top = y(d.value);
          return (
            <g
              key={d.key}
              tabIndex={0}
              role="img"
              aria-label={tooltip(d).join(", ")}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            >
              {/* a taller invisible hit area so thin or empty bars are easy to hover */}
              <rect x={PAD.left + slot * i} y={PAD.top} width={slot} height={plotH} fill="transparent" />
              <rect x={x} y={top} width={barW} height={Math.max(0, PAD.top + plotH - top)} rx="6" fill={barColor(d.value)} opacity={active == null || active === i ? 1 : 0.6} />
              <text x={x + barW / 2} y={H - PAD.bottom + 18} textAnchor="middle" fontSize="10.5" fill="#64748b">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
      {shown && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
          style={{ left: `clamp(8px, ${((PAD.left + slot * active + slot / 2) / W) * 100}%, calc(100% - 150px))` }}
        >
          {tooltip(shown).map((line, i) => (
            <span key={line} className={`block ${i === 0 ? "text-base font-bold text-black" : "text-black/60"}`}>
              {line}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
