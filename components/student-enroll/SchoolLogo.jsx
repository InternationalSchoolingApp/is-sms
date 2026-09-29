import Image from "next/image";

/**
 * Single source of truth for the school logo across the enrollment page
 * (mobile header + desktop hero). Always the SAME asset — only the rendered
 * width changes per placement via the `width` prop. Wrapped in a link to
 * the school's public site.
 *
 * Keeping this in one component means the logo asset/link/alt is defined
 * once, not copy-pasted per breakpoint.
 */
export function SchoolLogo({ schoolName, width = 220, className = "" }) {
  const label = schoolName || "International Schooling";
  return (
    <a
      href="https://internationalschooling.org/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — home`}
      className={`inline-block transition-opacity hover:opacity-90 ${className}`}
    >
      <Image
        src="/images/IS_Final_Logo.webp"
        alt={label}
        width={width}
        height={Math.round((width * 60) / 300)}
        className="h-auto"
        style={{ width }}
        priority
      />
    </a>
  );
}
