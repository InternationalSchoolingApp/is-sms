"use client";

import { useK5Weather } from "@/hooks/useK5Weather";

// WMO weather code -> the mockup kinds.
function kindOf(code) {
  if (code === 0) return "sun";
  if (code <= 2) return "partly";
  if (code === 3) return "cloud";
  if (code <= 48) return "fog";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snow";
  if (code >= 95) return "storm";
  return "rain";
}

const TEXT = {
  sun: (night) => [night ? "Clear sky" : "Sunny", night ? "Look at the stars!" : "Wear a hat!"],
  partly: (night) => ["Partly cloudy", night ? "Stay cozy tonight!" : "Great day to learn!"],
  cloud: (night) => ["Cloudy", night ? "Stay cozy tonight!" : "Great day to learn!"],
  fog: () => ["Foggy", "Stay close to a grown-up!"],
  rain: () => ["Rainy", "Bring an umbrella!"],
  snow: () => ["Snowy", "Wear your mittens!"],
  storm: () => ["Stormy", "Stay inside today!"],
};

const DROPS = [12, 34, 58, 80];
const STARS = [
  [8, 22],
  [16, 72],
  [30, 12],
  [44, 86],
  [62, 18],
];

/**
 * Weather tile of the planner toolbar (mockup .wxbox): temperature in C and F, a label and a
 * kid-friendly tip, on a day or night sky. Shows nothing until real weather has arrived.
 */
export function K5WeatherTile({ timezone }) {
  const weather = useK5Weather(timezone);
  if (!weather) return null;

  const night = !weather.isDay;
  const kind = kindOf(weather.code);
  const [label, tip] = TEXT[kind](night);
  const c = Math.round(weather.celsius);
  const f = Math.round(((weather.celsius * 9) / 5 + 32) * 10) / 10;
  const ink = night ? "text-white" : "text-[#13254D]";
  const mut = night ? "text-[#D6E0FF]" : "text-[#2F4371]";

  return (
    <div
      role="img"
      aria-label={"Weather: " + c + " degrees Celsius, " + f + " degrees Fahrenheit, " + label + ". " + tip}
      className={"relative box-border flex min-h-[100px] min-w-[200px] flex-[1_1_230px] flex-col items-center justify-center gap-0.5 overflow-hidden rounded-[22px] px-[22px] py-2.5 text-center max-[760px]:flex-[1_1_100%] " + (night ? "bg-[linear-gradient(135deg,#0B1A3F_0%,#1F2F5C_100%)]" : "bg-[linear-gradient(135deg,#CFE3FF_0%,#E9F2FF_100%)]")}
    >
      {night &&
        STARS.map(([left, top]) => (
          <span key={left} aria-hidden="true" className="absolute block h-0.5 w-0.5 rounded-full bg-white opacity-70" style={{ left: left + "%", top: top + "%" }} />
        ))}
      {!night && <span aria-hidden="true" className="absolute -right-6 -top-6 block h-[90px] w-[90px] rounded-full bg-[radial-gradient(circle,#FFE58A_0%,rgba(255,213,79,0.55)_45%,rgba(255,213,79,0)_70%)]" />}
      {(kind === "rain" || kind === "storm") &&
        DROPS.map((left, i) => <span key={left} aria-hidden="true" className="k5-wx-drop" style={{ left: left + "%", animationDelay: i * 0.25 + "s" }} />)}
      {kind === "snow" &&
        DROPS.map((left, i) => <span key={left} aria-hidden="true" className="k5-wx-flake" style={{ left: left + "%", animationDelay: i * 0.5 + "s" }} />)}
      <span className={"relative whitespace-nowrap font-k5-display text-4xl font-bold leading-[1.05] " + ink}>
        {c + "\u00B0"} <span className="text-[26px] font-semibold">{"| " + f + " F"}</span>
      </span>
      <span className={"relative font-k5-display text-[22px] font-bold leading-[1.1] " + ink}>{label}</span>
      <span className={"relative text-sm font-extrabold " + mut}>{tip}</span>
    </div>
  );
}
