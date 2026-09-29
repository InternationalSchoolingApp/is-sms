/**
 * Solid (filled) field icons for the Account Creation card — envelope,
 * lock, shield — matching the near-black filled glyphs in the signup-new
 * design. Lucide's icons are outline-only, so these are small filled SVGs.
 * They accept a `className` (AccountInput passes size/color there).
 */
export function MailSolidIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M2.5 6.5A2.5 2.5 0 0 1 5 4h14a2.5 2.5 0 0 1 2.5 2.5v.4l-9.5 5.6L2.5 6.9v-.4Z" />
      <path d="M21.5 8.9V17.5A2.5 2.5 0 0 1 19 20H5a2.5 2.5 0 0 1-2.5-2.5V8.9l8.98 5.29a1 1 0 0 0 1.04 0L21.5 8.9Z" />
    </svg>
  );
}

export function LockSolidIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M7 9V7a5 5 0 0 1 10 0v2h.5A1.5 1.5 0 0 1 19 10.5v9A1.5 1.5 0 0 1 17.5 21h-11A1.5 1.5 0 0 1 5 19.5v-9A1.5 1.5 0 0 1 6.5 9H7Zm2 0h6V7a3 3 0 1 0-6 0v2Zm3 4a1.5 1.5 0 0 0-.75 2.8V17.5a.75.75 0 0 0 1.5 0v-1.7A1.5 1.5 0 0 0 12 13Z" />
    </svg>
  );
}

export function ShieldSolidIcon({ className = "" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.2 4.5 5v6.2c0 4.4 3.1 8.5 7.5 9.8 4.4-1.3 7.5-5.4 7.5-9.8V5L12 2.2Z" />
    </svg>
  );
}
