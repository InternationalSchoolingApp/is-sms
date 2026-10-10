'use server'
// Lead capture API: the local leadapi under `next dev`, the live host otherwise; NEXT_PUBLIC_LEADS_API_URL overrides both.
const LEADS_API_BASE_URL = (
  process.env.NEXT_PUBLIC_LEADS_API_URL ||
  (process.env.NODE_ENV === "development" ? "http://localhost:7100" : "https://leads.internationalschooling.org")
).replace(/\/+$/, "");

export async function getStatesAndCitites() {
  const response = await fetch(`${LEADS_API_BASE_URL}/api/v1/common/masters`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requestData: {
        requestKey: "STATES-LIST",
        requestValue: 101,
      },
    }),
  });
  const result = await response.json();
  return result.data;
}
