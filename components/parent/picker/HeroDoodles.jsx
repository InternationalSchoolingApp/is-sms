import styles from "./parentPicker.module.css";

// The education doodles that float on the picker's blue banner (book, atom, pencil, globe, maths, cap, bulb,
// ruler, ABC, flask, paper plane, star, notes, clock). `hidePhone` ones are dropped on a phone. Decorative only.
const DOODLES = [
  { pos: "--x:4%;--y:18%;--s:54px;--r:-12deg;--o:.24;--t:10s;--dl:0s", svg: <><path d="M3 5.5C5.5 4 8.5 4 12 6c3.5-2 6.5-2 9-.5V19c-2.5-1.5-5.5-1.5-9 .5-3.5-2-6.5-2-9-.5z" /><path d="M12 6v13.5" /></> },
  { pos: "--x:16%;--y:62%;--s:46px;--r:0deg;--o:.2;--t:12s;--dl:-3s", spin: true, svg: <><circle cx="12" cy="12" r="1.6" /><ellipse cx="12" cy="12" rx="10" ry="4" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)" /><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)" /></> },
  { pos: "--x:27%;--y:14%;--s:40px;--r:24deg;--o:.22;--t:9s;--dl:-1s", hidePhone: true, svg: <><path d="M4 20l1.2-4.6L16 4.6a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" /><path d="M14.5 6l3.5 3.5M4 20l4.6-1.2" /></> },
  { pos: "--x:8%;--y:78%;--s:34px;--r:0deg;--o:.18;--t:11s;--dl:-5s", hidePhone: true, svg: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.2 3 14.8 0 18M12 3c-3 3.2-3 14.8 0 18" /></> },
  { pos: "--x:36%;--y:70%;--s:36px;--r:-8deg;--o:.18;--t:10s;--dl:-2s", hidePhone: true, svg: <path d="M5 7h5M7.5 4.5v5M14 7h5M5.5 15.5l4 4M9.5 15.5l-4 4M14 16h5M14 19h5" /> },
  { pos: "--x:86%;--y:14%;--s:58px;--r:10deg;--o:.26;--t:11s;--dl:-4s", svg: <><path d="M2 9l10-5 10 5-10 5z" /><path d="M6 11v5c3 2.5 9 2.5 12 0v-5M22 9v6" /></> },
  { pos: "--x:74%;--y:58%;--s:44px;--r:-10deg;--o:.22;--t:9s;--dl:-6s", svg: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" /> },
  { pos: "--x:64%;--y:16%;--s:48px;--r:-18deg;--o:.18;--t:12s;--dl:-2s", hidePhone: true, svg: <><rect x="2" y="8" width="20" height="8" rx="1.5" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></> },
  { pos: "--x:92%;--y:64%;--s:44px;--r:6deg;--o:.2;--t:10s;--dl:-7s", svg: <path d="M3 18l3.5-10L10 18M4.3 14.5h4.4M12.5 8v10h3a2.5 2.5 0 0 0 0-5h-3 2.5a2.5 2.5 0 0 0 0-5zM22 9.5a3.5 3.5 0 1 0 0 7" /> },
  { pos: "--x:56%;--y:74%;--s:34px;--r:12deg;--o:.18;--t:11s;--dl:-3s", hidePhone: true, svg: <path d="M9 3h6M10 3v6l-5.5 9.5A2 2 0 0 0 6.2 21h11.6a2 2 0 0 0 1.7-2.5L14 9V3M7 15h10" /> },
  { pos: "--x:46%;--y:8%;--s:36px;--r:-6deg;--o:.2;--t:8s;--dl:-5s", hidePhone: true, svg: <path d="M22 3 2 10.5l7 2.5 2.5 7L22 3zM9 13l13-10" /> },
  { pos: "--x:80%;--y:82%;--s:26px;--r:0deg;--o:.24;--t:7s;--dl:-1s", svg: <path d="m12 3 2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6-4.5-4.2 6.1-.7z" /> },
  { pos: "--x:20%;--y:38%;--s:30px;--r:-14deg;--o:.16;--t:12s;--dl:-8s", hidePhone: true, svg: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 8h6M9 12h6M9 16h4" /></> },
  { pos: "--x:96%;--y:30%;--s:30px;--r:0deg;--o:.16;--t:10s;--dl:-4s", hidePhone: true, svg: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
];

// "--x:4%;--y:18%" -> { "--x": "4%", "--y": "18%" }
const toStyle = (pos) => Object.fromEntries(pos.split(";").map((pair) => pair.split(":")));

export function HeroDoodles() {
  return (
    <div className={styles.doodles} aria-hidden="true">
      {DOODLES.map((d, i) => (
        <span key={i} className={`${styles.dd} ${d.spin ? styles.spin : ""} ${d.hidePhone ? styles.hidePhone : ""}`} style={toStyle(d.pos)}>
          <svg viewBox="0 0 24 24">{d.svg}</svg>
        </span>
      ))}
    </div>
  );
}
