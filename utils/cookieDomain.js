/**
 * Cookie domain resolution for the campaign/UTM attribution cookies.
 *
 * The previous implementation (duplicated in campaignCookies.js and
 * utmCookies.js) guessed the domain as "last two labels of the hostname".
 * That silently breaks wherever those two labels are a public suffix: on UAT
 * (is-sms.vercel.app) it produced `domain=vercel.app`, which every browser
 * rejects, so NOTHING was ever stored and every utm* field reached the
 * backend blank. Prod (enrollment.internationalschooling.org ->
 * internationalschooling.org) happened to be fine, which is why it only
 * showed up on UAT.
 *
 * Rather than ship a public-suffix list, we probe: write a throwaway cookie
 * at each candidate domain, broadest first, and keep the first one the
 * browser actually stores. Host-only (no `domain` attribute) is the final
 * fallback and always works.
 *
 *   localhost                             -> ""                            (host-only)
 *   is-sms.vercel.app                     -> "is-sms.vercel.app"           (vercel.app rejected)
 *   enrollment.internationalschooling.org -> "internationalschooling.org"  (shared with www)
 *
 * The broad domain on prod is deliberate: a campaign that lands on the
 * marketing site must carry its cookies into the enrollment subdomain.
 */

const PROBE_COOKIE = "__cd_probe";

// Cookie lifetime used by every caller (was 31 days in campaignCookies.js,
// 30 in utmCookies.js — they describe the same cookies, so pick one).
export const COOKIE_MAX_AGE_DAYS = 31;

/**
 * Candidate domains for `hostname`, broadest first. Pure — no document
 * access — so scripts/verifyCookieDomain.mjs can assert it directly.
 *
 * An empty list means "host-only cookie, no domain attribute": that's the
 * right answer for localhost, bare hostnames and IP literals, none of which
 * can carry a domain attribute at all.
 */
export function candidateCookieDomains(hostname) {
  if (!hostname || hostname.indexOf(".") === -1 || /^[0-9.]+$/.test(hostname) || hostname === "localhost") {
    return [];
  }

  const labels = hostname.split(".");
  const candidates = [];
  // Broadest first: "internationalschooling.org", then
  // "enrollment.internationalschooling.org". The narrowest candidate equals
  // the host itself, which is always accepted, so a public-suffix rejection
  // of the broad one still leaves a working domain-scoped cookie.
  for (let take = 2; take <= labels.length; take++) {
    candidates.push(labels.slice(-take).join("."));
  }
  return candidates;
}

function cookieAttributes(domain, maxAgeSeconds) {
  return (
    (domain ? `; domain=${domain}` : "") +
    "; path=/" +
    `; max-age=${maxAgeSeconds}` +
    "; samesite=lax" +
    // Never on http://localhost — a Secure cookie there is dropped.
    (typeof location !== "undefined" && location.protocol === "https:" ? "; secure" : "")
  );
}

/** True if a cookie can actually be stored at `domain` on this host. */
function domainIsAccepted(domain) {
  document.cookie = `${PROBE_COOKIE}=1${cookieAttributes(domain, 60)}`;
  const stored = document.cookie.indexOf(`${PROBE_COOKIE}=1`) !== -1;
  // Clear the probe either way; a delete has to repeat domain/path to match.
  document.cookie = `${PROBE_COOKIE}=${cookieAttributes(domain, 0)}`;
  return stored;
}

// Probing costs two cookie writes per candidate, so do it once per page load.
let resolvedDomain;

/**
 * The domain attribute to use for attribution cookies on this host, or ""
 * for a host-only cookie.
 *
 * NEXT_PUBLIC_COOKIE_DOMAIN is an escape hatch for a host this can't infer
 * (it is still probe-verified, and falls through to the derived candidates
 * if the browser rejects it). It is unset in every environment today —
 * NEXT_PUBLIC_* values are inlined at build time, so it would have to be set
 * per build, which is exactly the per-environment config the probe avoids.
 */
export function resolveCookieDomain() {
  if (typeof document === "undefined") return "";
  if (resolvedDomain !== undefined) return resolvedDomain;

  const configured = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
  const candidates = [
    ...(configured ? [configured.trim().replace(/^\./, "")] : []),
    ...candidateCookieDomains(window.location.hostname),
  ];

  resolvedDomain = candidates.find(domainIsAccepted) ?? "";
  return resolvedDomain;
}

/** Writes an attribution cookie at the resolved domain. */
export function writeCookie(name, value, days = COOKIE_MAX_AGE_DAYS) {
  if (typeof document === "undefined") return;
  if (!name || value === undefined || value === "") return;

  const maxAge = Math.round(days * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)}${cookieAttributes(resolveCookieDomain(), maxAge)}`;
}

/** Reads a cookie by name; "" when absent. */
export function readCookie(name) {
  if (typeof document === "undefined" || !name) return "";
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : "";
}
