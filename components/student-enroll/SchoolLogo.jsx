import Image from "next/image";

/**
 * Single source of truth for the school logo across the enrollment page
 * (mobile header + desktop hero) — resolved per-school from the {school} URL
 * segment, not a single hardcoded brand. `logoUrl`/`href` come from the
 * backend's schoolSettingsLinks (logoUrl, schoolWebsite — see
 * utils/schoolSettings.js), fetched by the caller; this component only
 * falls back to the International Schooling asset/link while that hasn't
 * resolved yet (or a school has none configured), matching the same
 * logoUrl-with-fallback pattern used by EnrollmentWizardShell's LogoMark.
 *
 * Keeping this in one component means the logo asset/link/alt is defined
 * once, not copy-pasted per breakpoint.
 */
export function SchoolLogo({ schoolName, logoUrl, href, width = 220, className = "" }) {
  const label = schoolName || "International Schooling";
  const resolvedHref = href || "https://internationalschooling.org/";
  return (
    <a
      href={resolvedHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — home`}
      className={`inline-block transition-opacity hover:opacity-90 ${className}`}
    >
      {logoUrl ? (
        // logoUrl is a remote, per-school asset resolved from the backend;
        // a plain <img> avoids next/image remotePatterns config for arbitrary hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={label} style={{ width, height: "auto" }} className="h-auto" />
      ) : (
        <Image
          src="/images/IS_Final_Logo.webp"
          alt={label}
          width={width}
          height={Math.round((width * 60) / 300)}
          className="h-auto"
          style={{ width }}
          priority
        />
      )}
    </a>
  );
}
