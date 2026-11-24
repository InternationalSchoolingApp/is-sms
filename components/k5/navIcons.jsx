
/*
 * Left-nav pictures of the Playful mockup (Playful.dc.html, the `.ni` items: a 36px PNG on a transparent 46px tile).
 * The PNGs live on the Java app with the other dashboard images: static/theme2/images/sidebar-icon/<name>.png.
 * The menu comes from the database, so the picture is chosen from the item's name (and page link), most specific first
 * ("Academic Performance" before "Academic Reports", "Language Club" before plain "Language").
 */
const SIDEBAR_PICTURES = [
  [/communication|inbox/, "communication"],
  [/dashboard/, "my-dashboard"],
  [/assigned|teacher/, "my-assigned-teacher"],
  [/book.*class|book-a-session/, "book-classes"],
  [/buy|extra|addon/, "buy-extra-classes"],
  [/attendance/, "my-attendance"],
  [/transcript/, "my-transcript"],
  [/performance/, "academic-performance"],
  [/progress/, "my-progress-report"],
  // Course Extension's page link is "academic-year-extention": checked before the "academic" of Academic Reports.
  [/extension|extention/, "course-extension"],
  [/report|academic/, "academic-reports"],
  [/language/, "language-club"],
  [/social/, "social-club"],
  [/sport|game/, "e-sports-club"],
  [/fee/, "my-fee-details"],
  [/handbook/, "student-handbook"],
  [/log ?in|history/, "my-login-history"],
  [/library|video/, "library"],
  [/certificate/, "certificates"],
];

/** The mockup picture URL for a nav item ({ label, segment }), or "" when the item has none (it keeps its drawn icon). */
export function navPictureFor(item) {
  const text = `${item?.label || ""} ${item?.segment || ""} ${item?.module || ""}`.toLowerCase();
  const match = SIDEBAR_PICTURES.find(([pattern]) => pattern.test(text));
  return match ? `/backend-static-assets/images/sidebar-icon/${match[1]}.png` : "";
}

/*
 * The mockup's "My Classes" picture (Playful.dc.html navClasses): a calendar with a green play badge. Drawn once in a 36 x 36 box
 * with its own colours (every stroke is spelled out, so it also works inside the 24px stroke-only NAV_ART svg, scaled).
 */
const MY_CLASSES_SHAPES = (
  <>
    <defs>
      <linearGradient id="nvcB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#6AA8FF" />
        <stop offset="1" stopColor="#2F6BEA" />
      </linearGradient>
      <linearGradient id="nvcG" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#5DD682" />
        <stop offset="1" stopColor="#1F9D55" />
      </linearGradient>
    </defs>
    <rect x="3" y="6" width="27" height="25" rx="6" fill="#EEF4FF" stroke="#BCD0F7" strokeWidth="1" />
    <path d="M3 13v-1a6 6 0 0 1 6-6h15a6 6 0 0 1 6 6v1z" fill="url(#nvcB)" stroke="none" />
    <rect x="9" y="2.5" width="3.4" height="7" rx="1.7" fill="#FFFFFF" stroke="#9DB7EE" strokeWidth="1" />
    <rect x="20.6" y="2.5" width="3.4" height="7" rx="1.7" fill="#FFFFFF" stroke="#9DB7EE" strokeWidth="1" />
    <g fill="#A9C4F7" stroke="none">
      <rect x="7" y="16" width="5" height="4" rx="1.3" />
      <rect x="14" y="16" width="5" height="4" rx="1.3" />
      <rect x="21" y="16" width="5" height="4" rx="1.3" />
      <rect x="7" y="22.5" width="5" height="4" rx="1.3" />
      <rect x="14" y="22.5" width="5" height="4" rx="1.3" />
    </g>
    <circle cx="27" cy="27" r="7.5" fill="url(#nvcG)" stroke="#FFFFFF" strokeWidth="1.6" />
    <path d="M25.2 23.6v6.8l5.4-3.4z" fill="#FFFFFF" stroke="none" />
  </>
);

/** The "My Classes" nav picture at its own size (36px, on a transparent tile). */
export function MyClassesArt() {
  return (
    <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden="true" className="block">
      {MY_CLASSES_SHAPES}
    </svg>
  );
}

// Drawn fallback icons (24px, stroke-only, colour from the tile) for an item without a picture.
// Key = the icon key of utils/dashboardNav.js.
export const NAV_ART = {
  "dashboard": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><path d="M17.5 14v7M14 17.5h7" />
    </>
  ),
  "my-classes": <g transform="scale(0.6667)">{MY_CLASSES_SHAPES}</g>,
  "calendar": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15.5l2 2 4-4" />
    </>
  ),
  "book-class": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /><path d="M9 15.5l2 2 4-4" />
    </>
  ),
  "teacher": (
    <>
      <circle cx="9" cy="7" r="4" /><path d="M2 21v-1a6 6 0 0 1 6-6h2" /><path d="M14.5 18l2.2 2.2 4.3-4.4" />
    </>
  ),
  "cart": (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" />
    </>
  ),
  "attendance": (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 2.5h6v3H9z" /><path d="M8.5 11l1.5 1.5 3-3" /><path d="M8.5 16.5h7" />
    </>
  ),
  "chart": (
    <>
      <path d="M4 20h16" /><path d="M6 17v-3M11 17v-6M16 17V9" /><path d="M4 9l6-4 4 3 6-4" /><path d="M17 4h3v3" />
    </>
  ),
  "file": (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8.5 13l1.6-4.5 1.6 4.5M9.1 11.6h2" /><path d="M15 9.5v3.2M13.4 11.1h3.2" /><path d="M8.5 17h7" />
    </>
  ),
  "globe": (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" />
    </>
  ),
  "social": (
    <>
      <circle cx="8" cy="8" r="3" /><circle cx="16" cy="8" r="3" /><path d="M2 20a6 6 0 0 1 12 0" /><path d="M10 20a6 6 0 0 1 12 0" />
    </>
  ),
  "game": (
    <>
      <rect x="2" y="7" width="20" height="11" rx="5.5" /><path d="M7 10.5v4M5 12.5h4" /><path d="M15.5 11h.01M18 13.5h.01" />
    </>
  ),
  "fee": (
    <>
      <circle cx="12" cy="12" r="9" /><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.8 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2" />
    </>
  ),
  "handbook": (
    <>
      <path d="M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3z" /><path d="M21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z" />
    </>
  ),
  "history": (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v4h4" /><path d="M12 8v4l3 2" />
    </>
  ),
  "certificate": (
    <>
      <circle cx="12" cy="9" r="6" /><path d="M9.5 9l1.8 1.8 3.2-3.3" /><path d="M8.5 14l-1.5 7 5-2.5 5 2.5-1.5-7" />
    </>
  ),
};

/*
 * Grade 9–12 ("High", Mature look) left nav: High.dc.html draws every item as a 24px line icon (no PNG) on a transparent
 * tile, stroke 2.3, in the item's own colour (white on the active item). Colours are the mockup's Mature tokens, set as
 * --k5-hn-* in app/k5-mature.css (day and night). Same name matching as SIDEBAR_PICTURES, most specific first.
 */
const HIGH_ART = {
  comm: (
    <>
      <path d="M4 13l2.2-7.2A1.5 1.5 0 0 1 7.6 4.8h8.8a1.5 1.5 0 0 1 1.4 1L20 13" />
      <path d="M4 13v5a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5h-4.5l-1.5 2.5h-4L8.5 13H4z" />
    </>
  ),
  extend: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <path d="M12 13v5M9.5 15.5h5" />
    </>
  ),
  library: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <path d="M10 9.2v5.6l4.8-2.8z" />
    </>
  ),
  certs: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5" />
      <path d="M9.8 9l1.5 1.5 3-3" />
    </>
  ),
  // Academic Reports' two sub-pages (18px on a soft green tile in the open menu)
  perf: (
    <>
      <path d="M4 20h16" />
      <path d="M7 16v-4M12 16V8M17 16v-6" />
    </>
  ),
  progress: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2.5" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
};

// [pattern, art, colour class]. Colour: nav = the mockup's --nv*I (one blue in Mature), b = --bI, g = --gI, y = --yX.
const NAV = "[stroke:var(--k5-hn-nav)]";
const BLUE = "[stroke:var(--k5-hn-b)]";
const GREEN = "[stroke:var(--k5-hn-g)]";
const BROWN = "[stroke:var(--k5-hn-y)]";
const HIGH_NAV = [
  [/communication|inbox/, HIGH_ART.comm, BLUE],
  [/dashboard/, NAV_ART.dashboard, BLUE],
  [/assigned|teacher/, NAV_ART.teacher, NAV],
  [/book.*class|book-a-session/, NAV_ART["book-class"], NAV],
  [/buy|extra|addon/, NAV_ART.cart, BLUE],
  [/attendance/, NAV_ART.attendance, NAV],
  [/transcript/, NAV_ART.file, BROWN],
  [/performance/, HIGH_ART.perf, GREEN],
  [/progress/, HIGH_ART.progress, GREEN],
  [/extension|extention/, HIGH_ART.extend, GREEN],
  [/report|academic/, NAV_ART.chart, GREEN],
  [/language/, NAV_ART.globe, BLUE],
  [/social/, NAV_ART.social, NAV],
  [/sport|game/, NAV_ART.game, NAV],
  [/fee/, NAV_ART.fee, NAV],
  [/handbook/, NAV_ART.handbook, NAV],
  [/log ?in|history/, NAV_ART.history, NAV],
  [/library|video/, HIGH_ART.library, NAV],
  [/certificate/, HIGH_ART.certs, NAV],
];

/** The High rail's icon for a nav item: { art, tone } (tone = a Tailwind stroke class), or null (keeps the shared icon). */
export function highNavIconFor(item) {
  const text = `${item?.label || ""} ${item?.segment || ""} ${item?.module || ""}`.toLowerCase();
  const match = HIGH_NAV.find(([pattern]) => pattern.test(text));
  return match ? { art: match[1], tone: match[2] } : null;
}
