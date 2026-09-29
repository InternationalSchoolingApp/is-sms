/**
 * Payer's ISO country code for the payment gateways — the lookup legacy does
 * before opening the payment modal (getPayerCountryCodePromise() /
 * callLocationForPaymentPromise() in commonPaymentGateway.js / locationFinder.js):
 * an IP-geolocation call (legacy: PRO_IP_API_URL, ip-api style JSON with a
 * `countryCode`), falling back to the browser locale's region
 * (getCountryISOCode()) when the lookup isn't configured or fails.
 *
 * Set NEXT_PUBLIC_IP_API_URL to enable the IP lookup; without it only the
 * browser-locale fallback is used. Resolves to "" if neither yields anything.
 */
let cached = null;

export async function resolvePayerCountryCode() {
  if (cached !== null) return cached;
  const ipApiUrl = process.env.NEXT_PUBLIC_IP_API_URL;
  if (ipApiUrl) {
    try {
      const response = await fetch(ipApiUrl);
      const data = await response.json();
      if (data?.countryCode) {
        cached = data.countryCode;
        return cached;
      }
    } catch (err) {
      console.error("Payer country lookup failed, falling back to browser locale:", err);
    }
  }
  const region = typeof navigator !== "undefined" ? (navigator.language || "").split("-")[1] : "";
  cached = region ? region.toLowerCase() : "";
  return cached;
}
