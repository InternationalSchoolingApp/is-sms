"use server";

import { backendRequest, getSessionIdentity } from "@/utils/backendRequest";
import { getSettingValue } from "@/services/studentSignupApi";

/**
 * "Quote of the Moment" (legacy MotivationalQuotesContent.js showQuoteOfMoment, gated by SETTINGS CONFIGURATION/QUOTE_SERVICE):
 * GET {school}/dashboard/motivational-quotes/my-quote/{UNIQUEUUID} -> { status: "1", quoteText, author }.
 * Returns { quoteText, author } or null (service off, no quote, signed out, any failure) - the card is only a nicety.
 */
export async function loadQuoteOfMoment() {
  try {
    const identity = await getSessionIdentity();
    if (!identity?.uniqueId) return null;
    const on = String(await getSettingValue(identity.schoolUUID, "CONFIGURATION", "QUOTE_SERVICE")).trim().toLowerCase();
    if (on !== "true") return null;
    const result = await backendRequest({
      path: `dashboard/motivational-quotes/my-quote/${encodeURIComponent(identity.uniqueId)}`,
      method: "GET",
      headers: (who) => ({ UNIQUEUUID: who.uniqueId }),
    });
    const answer = result.ok ? result.data : null;
    if (!answer || String(answer.status) !== "1" || !answer.quoteText) return null;
    return { quoteText: String(answer.quoteText), author: answer.author ? String(answer.author) : "" };
  } catch {
    return null;
  }
}
