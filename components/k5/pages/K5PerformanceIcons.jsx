// SVG pieces of the mockup My Performance page (Playful.dc.html pgPerf), kept as drawn there.

const STROKE = { fill: "none", stroke: "currentColor", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };

export function ChartIcon({ size = 20, width = 2.4 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth={width} {...STROKE}>
      <path d="M3 3v18h18" />
      <path d="M7 15l4-4 3 3 5-6" />
    </svg>
  );
}

export function TargetIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4" {...STROKE}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  );
}

export function PeopleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="2.4" {...STROKE}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17" cy="9" r="2.8" />
      <path d="M16 14.2c3 .2 5.5 2.4 5.5 5.8" />
    </svg>
  );
}

export function CheckBoxIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2.4" {...STROKE}>
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </svg>
  );
}

export function UpRightIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2.4" {...STROKE}>
      <path d="M7 17L17 7M9 7h8v8" />
    </svg>
  );
}

export function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2.4" {...STROKE}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

export function ArrowUpIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" strokeWidth="2.4" style={{ flex: "none" }} {...STROKE}>
      <path d="M12 19V5M5 12l7-7 7 7" />
    </svg>
  );
}

export function ArrowRightIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" strokeWidth="2.6" {...STROKE}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

export function BackIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="3" {...STROKE}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function EyeIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" strokeWidth="2.4" {...STROKE}>
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TickIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" strokeWidth="3.2" {...STROKE}>
      <path d="M5 12l5 5L20 7" />
    </svg>
  );
}

export function HistoryIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" strokeWidth="2.3" {...STROKE}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v4h4" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

export function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" strokeWidth="3" {...STROKE}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function Star({ on, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flex: "none" }}>
      <path
        d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z"
        fill={on ? "#FFC531" : "var(--k5-line)"}
        stroke={on ? "#C98A00" : "var(--k5-line)"}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Stars({ n, size, gap = 2, className = "" }) {
  return (
    <span role="img" aria-label={`${n} of 5 stars`} className={className} style={{ display: "inline-flex", alignItems: "center", gap }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} on={i <= n} size={size} />
      ))}
    </span>
  );
}

const FLAME_OUTER = "M12 1.5c.8 3.6 5.5 6 5.5 11.5A5.5 5.5 0 0 1 6.5 13c0-2.6 1.3-4.3 2.6-5.4.1 2 .9 3.3 2 3.8-.4-3.4.2-6.6.9-9.9z";
const FLAME_INNER = "M12 11c.6 1.6 2.5 2.6 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.3.8-2.3 1.6-2.8.2.9.6 1.3 1 1.4-.2-1.1-.3-2.1-.1-3.2z";

export function Flame({ size, outer = "#F28C28", inner = "#FFD27A", className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block" }}>
      <path d={FLAME_OUTER} fill={outer} />
      <path d={FLAME_INNER} fill={inner} />
    </svg>
  );
}

/** Course view streak flame (mockup pmCv). */
export function SmallFlame({ on }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" className={on ? "k5-pmflame" : undefined}>
      <path d="M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z" fill={on ? "#F28C28" : "#C3CBD6"} />
      <path d="M12 12c.6 2 2.5 2.8 2.5 5a2.5 2.5 0 0 1-5 0c0-1.5 1.5-2.5 2.5-5z" fill={on ? "#FFD8B5" : "#E3E7EE"} />
    </svg>
  );
}

export function ProgressRing({ pct, col, lt }) {
  const size = 56;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(Math.max(pct, 0), 100);
  return (
    <span className="relative block h-14 w-14 flex-none">
      <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true" style={{ display: "block", transform: "rotate(-90deg)" }}>
        <circle cx="28" cy="28" r={r} fill="none" strokeWidth={stroke} style={{ stroke: lt }} />
        <circle
          cx="28"
          cy="28"
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${((c * v) / 100).toFixed(1)} ${c.toFixed(1)}`}
          style={{ stroke: col, transition: "stroke-dasharray .5s" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-k5-display text-[13px] font-semibold text-k5-ink">{Math.round(v)}%</span>
    </span>
  );
}

/** Walking figure for Ahead (running) / On track (standing) / Behind (slow walk). */
export function PaceIcon({ pace, size = 16 }) {
  const props = { width: size, height: size, viewBox: "0 0 24 24", strokeWidth: 2.2, ...STROKE };
  if (pace === "A") {
    return (
      <svg {...props} className="k5-pmpA">
        <circle cx="15.2" cy="4" r="2.5" fill="currentColor" stroke="none" />
        <path d="M14.2 7.4L12 13.4" />
        <g className="k5-pmlg k5-pmL1" style={{ transformOrigin: "12px 13.4px" }}>
          <path d="M12 13.4v7.2h1.8" />
        </g>
        <g className="k5-pmlg k5-pmL2" style={{ transformOrigin: "12px 13.4px" }}>
          <path d="M12 13.4v7.2h1.8" />
        </g>
        <g className="k5-pmar k5-pmA1" style={{ transformOrigin: "13.6px 9px" }}>
          <path d="M13.6 9v4.6" />
        </g>
        <g className="k5-pmar k5-pmA2" style={{ transformOrigin: "13.6px 9px" }}>
          <path d="M13.6 9v4.6" />
        </g>
      </svg>
    );
  }
  if (pace === "B") {
    return (
      <svg {...props} className="k5-pmpB">
        <circle cx="12" cy="4" r="2.5" fill="currentColor" stroke="none" />
        <path d="M12 7.2V14.2" />
        <g className="k5-pmlg k5-pmL1" style={{ transformOrigin: "12px 14.2px" }}>
          <path d="M12 14.2V21h1.6" />
        </g>
        <g className="k5-pmlg k5-pmL2" style={{ transformOrigin: "12px 14.2px" }}>
          <path d="M12 14.2V21h1.6" />
        </g>
        <g className="k5-pmar k5-pmA1" style={{ transformOrigin: "12px 9.2px" }}>
          <path d="M12 9.2v4.6" />
        </g>
        <g className="k5-pmar k5-pmA2" style={{ transformOrigin: "12px 9.2px" }}>
          <path d="M12 9.2v4.6" />
        </g>
      </svg>
    );
  }
  return (
    <svg {...props} style={{ flex: "none" }}>
      <circle cx="12" cy="4" r="2.5" fill="currentColor" stroke="none" />
      <path d="M12 7.2V14.2M12 14.2l-2 6.8M12 14.2l2 6.8M12 9.2l-2.8 4.3M12 9.2l2.8 4.3" />
    </svg>
  );
}

/** Smiling star sticker on a course with a perfect score. */
export function StarSticker() {
  return (
    <svg width="50" height="50" viewBox="0 0 64 64" aria-hidden="true" style={{ display: "block", overflow: "visible", filter: "drop-shadow(0 3px 0 rgba(28,38,64,.25))" }}>
      <path d="M32.0 5.0 L39.3 23.9 L59.6 25.0 L43.9 37.9 L49.0 57.5 L32.0 46.5 L15.0 57.5 L20.1 37.9 L4.4 25.0 L24.7 23.9 Z" fill="#F2A100" stroke="#B97800" strokeWidth="3" strokeLinejoin="round" />
      <path d="M32.0 34.0 L24.7 23.9 L32.0 5.0 Z M32.0 34.0 L39.3 23.9 L59.6 25.0 Z M32.0 34.0 L43.9 37.9 L49.0 57.5 Z M32.0 34.0 L32.0 46.5 L15.0 57.5 Z M32.0 34.0 L20.1 37.9 L4.4 25.0 Z" fill="#FFD95A" />
      <path d="M32.0 34.0 L32.0 5.0 L39.3 23.9 Z M32.0 34.0 L59.6 25.0 L43.9 37.9 Z M32.0 34.0 L49.0 57.5 L32.0 46.5 Z M32.0 34.0 L15.0 57.5 L20.1 37.9 Z M32.0 34.0 L4.4 25.0 L24.7 23.9 Z" fill="#F2A100" />
      <circle cx="26.5" cy="32" r="3" fill="#2A2F4A" />
      <circle cx="37.5" cy="32" r="3" fill="#2A2F4A" />
      <circle cx="27.4" cy="31" r="1" fill="#FFFFFF" />
      <circle cx="38.4" cy="31" r="1" fill="#FFFFFF" />
      <ellipse cx="21.5" cy="38" rx="3" ry="2" fill="#FF8FA3" />
      <ellipse cx="42.5" cy="38" rx="3" ry="2" fill="#FF8FA3" />
      <path d="M28.5 38 q3.5 4.5 7 0" fill="none" stroke="#2A2F4A" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

const ROSETTE =
  "M28.0 2.0 L32.9 5.6 L39.0 4.9 L41.4 10.6 L47.1 13.0 L46.4 19.1 L50.0 24.0 L46.4 28.9 L47.1 35.0 L41.4 37.4 L39.0 43.1 L32.9 42.4 L28.0 46.0 L23.1 42.4 L17.0 43.1 L14.6 37.4 L8.9 35.0 L9.6 28.9 L6.0 24.0 L9.6 19.1 L8.9 13.0 L14.6 10.6 L17.0 4.9 L23.1 5.6 Z";

const MEDAL_GLYPH = {
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  bolt: <path d="M13 2L4 14h7l-1 8 9-12h-7z" />,
  star: <path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7.1L12 17.3 5.8 21l1.6-7.1L2 9.2l7.1-.6z" />,
  flag: <path d="M4 22V4M4 4h13l-2 4 2 4H4" />,
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
};

const LOCKED = { ribbon: "#E6EBF2", fill: "#D5DDE8", ring: "#8D9BB2", glyph: "#FFFFFF" };

/** Rosette medal (mockup .pkemb); a locked one is grey with a padlock. */
export function Medal({ medal, earned }) {
  const c = earned ? medal : LOCKED;
  return (
    <svg width="56" height="62" viewBox="0 0 56 62" aria-hidden="true" style={{ display: "block", overflow: "visible" }}>
      <path d="M17 34 L10 58 L18 54 L23 61 L28 40 Z" fill={c.ribbon} />
      <path d="M39 34 L46 58 L38 54 L33 61 L28 40 Z" fill={c.ribbon} />
      <path d={ROSETTE} fill={c.fill} stroke={c.ring} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="28" cy="24" r="14.5" fill={c.ring} stroke="#FFFFFF" strokeWidth="2" strokeOpacity="0.6" />
      <path d="M17 18 a13 13 0 0 1 9 -7" fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" opacity="0.55" />
      <g transform="translate(18.5 14.5) scale(0.8)" fill="none" stroke={earned ? medal.glyph : LOCKED.glyph} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        {MEDAL_GLYPH[medal.icon]}
      </g>
      {!earned && (
        <g transform="translate(37 34)">
          <circle cx="8" cy="8" r="8" fill="#FFFFFF" stroke="#8D9BB2" strokeWidth="2" />
          <rect x="4.5" y="7.5" width="7" height="5.5" rx="1.2" fill="#8D9BB2" />
          <path d="M6 7.5V6a2 2 0 0 1 4 0v1.5" fill="none" stroke="#8D9BB2" strokeWidth="1.6" />
        </g>
      )}
    </svg>
  );
}

/** Hero scene: smiling sun, drifting clouds, hills, path and a flag (mockup .pkscene). */
export function HeroScene() {
  return (
    <svg
      className="k5-pkscene pointer-events-none absolute bottom-0 end-0 h-full w-[440px] max-w-[70%]"
      viewBox="0 0 440 240"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
    >
      <g className="k5-pksun" style={{ transformOrigin: "360px 62px" }}>
        <g stroke="#FFC531" strokeWidth="5" strokeLinecap="round">
          {[0, 45, 90, 135, 180, 225, 270, 315].map((r) => (
            <path key={r} d="M360 24 v-10" transform={`rotate(${r} 360 62)`} />
          ))}
        </g>
      </g>
      <circle cx="360" cy="62" r="26" fill="#FFD24A" stroke="#2A2F4A" strokeWidth="3" />
      <circle cx="352" cy="58" r="2.6" fill="#2A2F4A" />
      <circle cx="368" cy="58" r="2.6" fill="#2A2F4A" />
      <ellipse cx="346" cy="66" rx="3.4" ry="2.2" fill="#FF8FA3" />
      <ellipse cx="374" cy="66" rx="3.4" ry="2.2" fill="#FF8FA3" />
      <path d="M354 67 q6 6 12 0" fill="none" stroke="#2A2F4A" strokeWidth="2.6" strokeLinecap="round" />
      <g className="k5-pkcloud1">
        <path d="M200 70 a14 14 0 0 1 26 -8 a18 18 0 0 1 32 6 a12 12 0 0 1 2 24 h-58 a11 11 0 0 1 -2 -22z" fill="#FFFFFF" stroke="#2A2F4A" strokeWidth="2.5" strokeLinejoin="round" opacity="0.95" />
      </g>
      <g className="k5-pkcloud2">
        <path d="M262 132 a10 10 0 0 1 19 -6 a13 13 0 0 1 23 4 a9 9 0 0 1 1 17 h-42 a8 8 0 0 1 -1 -15z" fill="#FFFFFF" stroke="#2A2F4A" strokeWidth="2.2" strokeLinejoin="round" opacity="0.9" />
      </g>
      <path d="M90 240 C150 170 230 150 300 180 C340 196 380 160 440 150 V240 Z" style={{ fill: "var(--k5-ac)" }} opacity="0.16" />
      <path d="M170 240 C230 196 300 188 350 205 C390 218 410 200 440 196 V240 Z" style={{ fill: "var(--k5-ac)" }} opacity="0.28" />
      <path d="M220 238 C250 222 270 214 300 206 C330 198 352 196 372 178" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
      <path d="M376 180 V136" stroke="#2A2F4A" strokeWidth="3.5" strokeLinecap="round" />
      <path className="k5-pkflag" d="M377 137 h26 l-6 8 6 8 h-26 z" fill="#22A35A" stroke="#2A2F4A" strokeWidth="2.5" strokeLinejoin="round" />
      <g fill="#FFC531" stroke="#2A2F4A" strokeWidth="1.8" strokeLinejoin="round">
        <path className="k5-pksp" d="M150 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" />
        <path className="k5-pksp" style={{ animationDelay: ".7s" }} d="M300 30 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4z" />
        <path className="k5-pksp" style={{ animationDelay: "1.3s" }} d="M420 120 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" />
      </g>
    </svg>
  );
}
