"use client";

import { kindOf } from "@/components/k5/home/K5WeatherTile";

/*
 * The weather part of the Playful My Dashboard hero (Playful.dc.html .wxs / .wxi / .wxu). The mockup loops through sun,
 * clouds, rain and wind every 40 seconds to show what each looks like; here the REAL weather picks the one that shows:
 * clear sky = just the sun (or the moon at night), cloudy = drifting clouds, rain / snow / storm = dark sky, rain and the
 * yellow umbrella, windy = gusts and blowing leaves. The animations themselves are the mockup's (app/k5-theme.css).
 */

const WINDY_KMH = 30;

/** "sun" | "partly" | "cloud" | "rain" | "wind" for the real weather (rain wins over wind, wind over a plain sky). */
export function sceneOf(weather) {
  if (!weather) return "sun";
  const kind = kindOf(weather.code);
  if (kind === "rain" || kind === "storm" || kind === "snow") return "rain";
  if (weather.windKmh >= WINDY_KMH) return "wind";
  if (kind === "cloud" || kind === "fog") return "cloud";
  return kind === "partly" ? "partly" : "sun";
}

export const SCENE_LABEL = { sun: "Sunny", partly: "Partly cloudy", cloud: "Cloudy", rain: "Rainy", wind: "Windy" };

const CLOUD = "M26 56a20 20 0 0 1-3-39.8A28 28 0 0 1 76 12a22 22 0 0 1 28 18 13 13 0 0 1-2 26z";
const CLOUDS = [
  { cls: "c1", pos: { left: "2%", top: 3, width: 170 } },
  { cls: "c2", pos: { left: "29%", top: 8, width: 140 } },
  { cls: "c3", pos: { left: "50%", top: 2, width: 190 } },
  { cls: "c4", pos: { right: "3%", top: 10, width: 140 } },
];
const GUSTS = [
  { cls: "w1", top: "30%", d: "M2 16h92c12 0 18-10 10-14s-14 4-8 8" },
  { cls: "w2", top: "52%", d: "M2 12c30-8 54 8 84 0s40-6 60 2" },
  { cls: "w3", top: "70%", d: "M2 16h92c12 0 18-10 10-14s-14 4-8 8" },
  { cls: "w4", top: "40%", d: "M2 12c30-8 54 8 84 0s40-6 60 2" },
];
const LEAVES = [
  { cls: "l1", top: "46%", fill: "#7BD389", vein: "#3E9B57" },
  { cls: "l2", top: "64%", fill: "#FFB347", vein: "#D9822B" },
  { cls: "l3", top: "34%", fill: "#FFD84D", vein: "#C9A227" },
];

/** The sky behind the hero's content for the current weather (an empty layer for a clear sky). */
export function WeatherScene({ scene }) {
  if (scene === "sun" || scene === "partly") return null;
  return (
    <div className="wxs wxs-live" data-scene={scene} aria-hidden="true">
      {scene === "rain" && <span className="wxs-dim" />}
      {(scene === "cloud" || scene === "rain") && (
        <div className="wxs-cl">
          {CLOUDS.map((c) => (
            <svg key={c.cls} className={`wxs-c ${c.cls}`} viewBox="0 -8 120 68" style={c.pos}>
              <path d={CLOUD} fill="#FFFFFF" />
              <path className="wxs-dk" d={CLOUD} fill="#7C89A6" />
            </svg>
          ))}
        </div>
      )}
      {scene === "rain" && <div className="wxs-rain" />}
      {scene === "wind" && (
        <div className="wxs-wind">
          {GUSTS.map((g) => (
            <svg key={g.cls} className={`wxs-w ${g.cls}`} width="150" height="26" viewBox="0 0 150 26" style={{ top: g.top }}>
              <path d={g.d} fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          ))}
          {LEAVES.map((l) => (
            <svg key={l.cls} className={`wxs-lf ${l.cls}`} width="18" height="18" viewBox="0 0 24 24" style={{ top: l.top }}>
              <path d="M4 20C4 9 11 4 21 3c-1 10-6 17-17 17z" fill={l.fill} />
              <path d="M4 20L14 10" stroke={l.vein} strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          ))}
        </div>
      )}
    </div>
  );
}

/** The yellow umbrella on the corner of the date strip (rain only). */
export function Umbrella() {
  return (
    <span className="wxu wxu-live" aria-hidden="true">
      <svg width="50" height="50" viewBox="0 -1 28 28">
        <path d="M14 14v9.5a2.6 2.6 0 0 1-5.2 0" fill="none" stroke="#1E2242" strokeWidth="1.7" strokeLinecap="round" />
        <path d="M2 14A12 12 0 0 1 26 14Q23 11 20 14Q17 11 14 14Q11 11 8 14Q5 11 2 14Z" fill="#FFC531" stroke="#1E2242" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M14 2.2Q9.5 7 8 13.4M14 2.2v11.6M14 2.2Q18.5 7 20 13.4" fill="none" stroke="#E09A00" strokeWidth=".9" />
        <path d="M14 2V.4" stroke="#1E2242" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M6.5 7.5a8 8 0 0 1 3.5-3.2" fill="none" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
      </svg>
    </span>
  );
}

/** The weather picture next to the temperature in the date strip. */
export function WeatherIcon({ scene, night }) {
  let art;
  if (scene === "wind") {
    art = (
      <svg width="50" height="50" viewBox="0 0 48 48">
        <g fill="none" stroke="#2F6FD6" strokeWidth="3" strokeLinecap="round">
          <path className="wxi-wl" d="M5 18h24c5 0 7-6 3-8s-7 2-4 4" />
          <path className="wxi-wl d2" d="M5 26h34c5 0 7 6 3 8s-7-2-4-4" />
          <path className="wxi-wl d3" d="M9 34h14" />
        </g>
      </svg>
    );
  } else if (scene === "rain") {
    art = (
      <svg width="50" height="50" viewBox="0 0 48 48">
        <g stroke="#4FA8FF" strokeWidth="2.6" strokeLinecap="round">
          <path className="wxi-dr" d="M16 36l-2 5" />
          <path className="wxi-dr d2" d="M24 36l-2 5" />
          <path className="wxi-dr d3" d="M32 36l-2 5" />
        </g>
        <path d="M14 32a8 8 0 0 1-1.2-15.9A11 11 0 0 1 34 13.5a8 8 0 0 1 .8 18.5z" fill="#E3EAF6" stroke="#93A5C6" strokeWidth="2" />
      </svg>
    );
  } else if (night && (scene === "sun" || scene === "partly")) {
    art = (
      <svg className="hs-moon" width="46" height="46" viewBox="0 0 48 48">
        <path d="M31 6a19 19 0 1 0 12 30A16 16 0 0 1 31 6z" fill="#FFE27A" stroke="#E0B12E" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="22" cy="26" r="2.6" fill="#F2C94C" />
        <circle cx="28" cy="35" r="1.8" fill="#F2C94C" />
        <path d="M40 8l1.4 3 3 1.4-3 1.4L40 17l-1.4-3-3-1.4 3-1.4z" fill="#FFFFFF" />
      </svg>
    );
  } else if (scene === "sun") {
    art = (
      <svg className="hs-sun" width="50" height="50" viewBox="0 0 48 48">
        <g stroke="#FFC531" strokeWidth="3.6" strokeLinecap="round">
          <path d="M24 3.5v6M24 38.5v6M3.5 24h6M38.5 24h6M9.5 9.5l4.2 4.2M34.3 34.3l4.2 4.2M9.5 38.5l4.2-4.2M34.3 13.7l4.2-4.2" />
        </g>
        <circle cx="24" cy="24" r="10" fill="#FFC531" />
        <circle cx="24" cy="24" r="10" fill="url(#hsSunG)" />
        <defs>
          <radialGradient id="hsSunG" cx=".38" cy=".35" r=".75">
            <stop offset="0" stopColor="#FFF3A6" />
            <stop offset=".55" stopColor="#FFD23F" />
            <stop offset="1" stopColor="#F5A623" />
          </radialGradient>
        </defs>
      </svg>
    );
  } else {
    art = (
      <svg width="50" height="50" viewBox="0 0 48 48">
        <circle cx="31" cy="16" r="8" fill="#FFC531" />
        <path d="M14 38a8 8 0 0 1-1.2-15.9A11 11 0 0 1 34 19.5a8 8 0 0 1 .8 18.5z" fill="#FFFFFF" stroke="#BCCBE6" strokeWidth="2" />
      </svg>
    );
  }
  return <span className="wxi wxi-live">{art}</span>;
}

/** The moon beside the greeting after dark (mockup .hero-moon): it bobs and the stars twinkle. */
export function HeroMoon() {
  return (
    <svg className="hero-sun hero-moon" width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" style={{ flex: "none", margin: "-16px -14px -18px -8px" }}>
      <circle className="hm-glow" cx="34" cy="38" r="27" fill="#FFF3B0" />
      <g className="hm-body">
        <path d="M34.7 16A22 22 0 1 0 54.6 45.8A18 18 0 0 1 34.7 16Z" fill="#FFE27A" stroke="#E0B12E" strokeWidth="2.2" strokeLinejoin="round" />
        <circle cx="27" cy="27" r="2.2" fill="#F2C94C" />
        <circle cx="36" cy="53" r="1.6" fill="#F2C94C" />
        <path d="M17.5 38q2.2 1.8 4.4 0M25.5 43.5q2.2 1.8 4.4 0" fill="none" stroke="#1E2242" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="17.5" cy="43.5" r="1.9" fill="#FF9EB5" opacity=".85" />
        <circle cx="27" cy="49" r="1.9" fill="#FF9EB5" opacity=".85" />
        <path d="M20.5 46.5q2.6 2.4 5.2 .6" fill="none" stroke="#1E2242" strokeWidth="1.5" strokeLinecap="round" />
      </g>
      <path className="hm-st" d="M58 9l1.2 2.8 2.8 1.2-2.8 1.2L58 17l-1.2-2.8-2.8-1.2 2.8-1.2z" fill="#FFFFFF" />
      <path className="hm-st s2" d="M65 28l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="#FFF3B0" />
      <path className="hm-st s3" d="M11 13l.8 1.8 1.8.8-1.8.8-.8 1.8-.8-1.8-1.8-.8 1.8-.8z" fill="#FFFFFF" />
    </svg>
  );
}
