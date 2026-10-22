/**
 * Direct browser-side GET to pro.ip-api.com — same call the legacy Java app
 * made from theme2/js/custom/locationFinder.js (PRO_IP_API_URL) and the one
 * new-website's components/demo/utils/ApiUtils.js makes. Every visitor's own
 * browser resolves its own location directly against pro-ip-api; no backend
 * hop, no server-side IP forwarding, no CORS concerns.
 */
const PRO_IP_API_URL =
  "https://pro.ip-api.com/json/?key=9908tZlRhI0pK5W&fields=status,message,continent,continentCode,country,countryCode,region,regionName,city,district,zip,lat,lon,timezone,offset,currency,isp,org,as,asname,reverse,mobile,proxy,hosting,query";

export async function getIpLocation() {
  const response = await fetch(PRO_IP_API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`ip-location responded ${response.status}`);
  const data = await response.json();
  if (data?.status !== "success") {
    throw new Error(data?.message || "IP location lookup failed");
  }
  return data;
}
