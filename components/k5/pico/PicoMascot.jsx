import { BUDDIES } from "@/constant/appearance";

// Body of each buddy (Playful.dc.html art); the face, arms and feet are shared.
const BODIES = {
  pico: <path d="M100 30C52 30 18 66 18 112c0 58 82 124 82 124s82-66 82-124c0-46-34-82-82-82z" fill="#2F7BF5" />,
  penny: (
    <g>
      <rect x="44" y="14" width="112" height="34" rx="14" fill="#FF8FB1" />
      <rect x="40" y="42" width="120" height="16" fill="#B8C2D6" />
      <rect x="40" y="56" width="120" height="134" fill="#FFC531" />
      <path d="M70 58v132M130 58v132" stroke="#E0A800" strokeWidth="4" />
      <path d="M40 190 L160 190 L100 244 Z" fill="#F5D7A1" />
      <path d="M88 233 L112 233 L100 244 Z" fill="#1C2640" />
    </g>
  ),
  booky: (
    <g>
      <rect x="24" y="36" width="152" height="186" rx="20" fill="#6A3FC4" />
      <rect x="24" y="36" width="26" height="186" rx="12" fill="#4C2A94" />
      <rect x="50" y="206" width="120" height="12" rx="4" fill="#FFF6DB" />
      <path d="M138 36v40l11-9 11 9V36z" fill="#FF5A7A" />
    </g>
  ),
  bolt: (
    <g>
      <path d="M100 44V20" stroke="#5C6B8A" strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="16" r="10" fill="#FFC531" />
      <circle cx="26" cy="112" r="12" fill="#5C6B8A" />
      <circle cx="174" cy="112" r="12" fill="#5C6B8A" />
      <rect x="30" y="42" width="140" height="180" rx="36" fill="#13A89E" />
      <rect x="72" y="184" width="56" height="22" rx="8" fill="#0B5E58" />
      <circle cx="86" cy="195" r="4" fill="#FFC531" />
      <circle cx="100" cy="195" r="4" fill="#FF8FB1" />
      <circle cx="114" cy="195" r="4" fill="#8CE0FF" />
    </g>
  ),
  twinkle: (
    <path
      d="M100 24 L141.1 79.4 L206.5 101.4 L166.6 157.6 L165.8 226.6 L100 206 L34.2 226.6 L33.4 157.6 L-6.5 101.4 L58.9 79.4 Z"
      fill="#FFB020"
      stroke="#FFB020"
      strokeWidth="16"
      strokeLinejoin="round"
    />
  ),
};

/**
 * The K–5 buddy (Pico, Penny, Booky, Bolt, Twinkle). `talking` animates the mouth, `wave`
 * waves the arm, `walking` bobs and steps (while the guide walks between tips); both stop under reduced motion (appearance.css / prefers-reduced-motion).
 */
export function PicoMascot({ buddy = "pico", width = 140, talking = false, wave = true, full = true, walking = false }) {
  const look = BUDDIES[buddy] || BUDDIES.pico;
  const height = full ? Math.round((width * 260) / 200) : width;
  return (
    <svg width={width} height={height} viewBox={full ? "0 0 200 260" : "0 0 200 200"} aria-hidden="true" className="overflow-visible">
      {full ? (
        <g className={walking ? "k5-pico-walk" : "k5-pico-idle"}>
          <ellipse cx="100" cy="252" rx="50" ry="7" fill="#1C2640" opacity="0.12" />
          <ellipse className="k5-pico-foot-l" cx="76" cy="240" rx="20" ry="11" fill={look.feet} />
          <ellipse className="k5-pico-foot-r" cx="124" cy="240" rx="20" ry="11" fill={look.feet} />
          <g className={wave ? "k5-pico-arm" : undefined}>
            <path d="M30 130 Q8 106 14 76" fill="none" strokeWidth="13" strokeLinecap="round" stroke={look.arm} />
            <circle cx="14" cy="70" r="12" fill={look.arm} />
          </g>
          <path d="M172 134 Q190 152 186 172" fill="none" strokeWidth="13" strokeLinecap="round" stroke={look.arm} />
          <circle cx="186" cy="176" r="12" fill={look.arm} />
          {BODIES[buddy] || BODIES.pico}
          <Face talking={talking} />
          {buddy === "pico" && (
            <g>
              <path d="M70 36v14q30 12 60 0V36z" fill="#1C2640" />
              <path d="M100 8l56 20-56 20-56-20z" fill="#1C2640" />
              <path d="M156 28v26" stroke="#FFC531" strokeWidth="4" strokeLinecap="round" />
              <circle cx="156" cy="58" r="6" fill="#FFC531" />
            </g>
          )}
        </g>
      ) : (
        <g>
          <circle cx="100" cy="100" r="96" fill={look.color} />
          <g transform="translate(0 -8)">
            <Face talking={talking} />
          </g>
        </g>
      )}
    </svg>
  );
}

function Face({ talking }) {
  return (
    <g>
      <circle cx="100" cy="112" r="56" fill="#FFFFFF" />
      <g className="k5-pico-eye">
        <ellipse cx="80" cy="104" rx="9" ry="12" fill="#1C2640" />
        <circle cx="83" cy="99" r="3.5" fill="#FFFFFF" />
      </g>
      <g className="k5-pico-eye">
        <ellipse cx="120" cy="104" rx="9" ry="12" fill="#1C2640" />
        <circle cx="123" cy="99" r="3.5" fill="#FFFFFF" />
      </g>
      <circle cx="66" cy="126" r="8" fill="#FF9EB5" />
      <circle cx="134" cy="126" r="8" fill="#FF9EB5" />
      <g className={`k5-pico-mouth${talking ? " k5-pico-talk" : ""}`}>
        <path d="M84 128 Q100 146 116 128 Z" fill="#1C2640" />
        <path d="M92 136 Q100 142 108 136" fill="#FF7A93" />
      </g>
    </g>
  );
}
