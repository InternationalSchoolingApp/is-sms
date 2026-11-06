"use client";

// The toolbar picture next to the clock (mockup .tbicon): sun, moon, partly cloudy, cloud, rain or snow.
const SUN_RAYS = (
  <g stroke="#FFB020" strokeWidth="10" strokeLinecap="round">
    <line x1="80" y1="8" x2="80" y2="28" />
    <line x1="80" y1="132" x2="80" y2="152" />
    <line x1="8" y1="80" x2="28" y2="80" />
    <line x1="132" y1="80" x2="152" y2="80" />
    <line x1="29" y1="29" x2="43" y2="43" />
    <line x1="131" y1="29" x2="117" y2="43" />
    <line x1="29" y1="131" x2="43" y2="117" />
    <line x1="131" y1="131" x2="117" y2="117" />
  </g>
);
const SUN = (
  <>
    {SUN_RAYS}
    <circle cx="80" cy="80" r="44" fill="#FFC531" />
    <circle cx="66" cy="74" r="6" fill="#1C2640" />
    <circle cx="94" cy="74" r="6" fill="#1C2640" />
    <path d="M65 91q15 13 30 0" fill="none" stroke="#1C2640" strokeWidth="6" strokeLinecap="round" />
  </>
);
const MOON = (
  <>
    <path d="M98 26a56 56 0 1 0 40 86a46 46 0 1 1-40-86z" fill="#8B6CE8" stroke="#5B3FC0" strokeWidth="4" strokeLinejoin="round" />
    <path d="M132 20l3.5 9 9 3.5-9 3.5-3.5 9-3.5-9-9-3.5 9-3.5z" fill="#B9A4F5" />
    <path d="M150 58l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="#B9A4F5" />
    <circle cx="124" cy="80" r="4" fill="#B9A4F5" />
  </>
);
const CLOUD_PATH = "M34 150a26 26 0 0 1 2-52 34 34 0 0 1 64-8 26 26 0 0 1 34 32 18 18 0 0 1-4 28z";
const CLOUD = <path d={CLOUD_PATH} fill="#FFFFFF" stroke="#C9D3E6" strokeWidth="5" strokeLinejoin="round" />;

/** Same picture choice as the mockup: by weather kind and day / night. */
export function K5ClockIcon({ kind, night, className = "" }) {
  let art;
  if (kind === "rain" || kind === "storm") {
    art = (
      <>
        <g transform="translate(0 -28)">{CLOUD}</g>
        <path d="M50 134l-6 14M80 134l-6 14M110 134l-6 14" stroke="#2F7BF5" strokeWidth="7" strokeLinecap="round" />
      </>
    );
  } else if (kind === "snow") {
    art = (
      <>
        <g transform="translate(0 -28)">{CLOUD}</g>
        <circle cx="48" cy="140" r="7" fill="#9CC2F7" />
        <circle cx="80" cy="150" r="7" fill="#9CC2F7" />
        <circle cx="112" cy="140" r="7" fill="#9CC2F7" />
      </>
    );
  } else if (night) {
    art = MOON;
  } else if (kind === "partly") {
    art = (
      <>
        <g transform="translate(40 0) scale(0.72)">{SUN}</g>
        {CLOUD}
      </>
    );
  } else if (kind === "cloud" || kind === "fog" || kind === "storm") {
    art = <g transform="translate(10 -30) scale(1.05)">{CLOUD}</g>;
  } else {
    art = SUN;
  }
  return (
    <svg className={className} width="56" height="56" viewBox="0 0 160 160" aria-hidden="true" style={{ flex: "none" }}>
      {art}
    </svg>
  );
}
