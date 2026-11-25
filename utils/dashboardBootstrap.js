import { addDays, format, startOfDay } from "date-fns";
import { getDashboardBadges, getDashboardBootstrap, getDashboardExtras } from "@/services/dashboardBootstrapApi";

/**
 * Client side of services/dashboardBootstrapApi.js. Server Actions run one after the other, so the start-up data comes in three
 * batched requests instead of thirty single ones:
 *   tier 1  what the page draws (started by the first query that needs any of it)
 *   tier 2  right-rail counts, inbox, cart (asked for right behind tier 1, ahead of the popups)
 *   tier 3  the popups' checks (need help, reserve a seat, system training, app install, Outlook, class feedback settings);
 *           started by the first popup that asks, and only after tier 2
 * A query takes its part out of the batch answer instead of asking on its own. Each part is used ONCE and only while the
 * answer is fresh: a refetch, an invalidation, a poll or a part first needed much later asks the backend the way it always did
 * (every query keeps its own query function as the fallback). A missing part (`undefined`: failed, another range, another role)
 * falls back too; `null` is a real answer (e.g. the quote service is off) and is used as it is.
 */

const FRESH_MS = 30_000;
const IDLE_MS = 300;

const state = { user: null, tiers: {} };

const ymd = (date) => format(date, "yyyy-MM-dd");

/** The window the home asks the calendar for first: yesterday .. tomorrow (hooks/useStudentCalendar.js `base`). */
export function defaultCalendarRange() {
  const today = startOfDay(new Date());
  return { startDate: ymd(addDays(today, -1)), endDate: ymd(addDays(today, 1)) };
}

function forUser(userId) {
  const key = String(userId);
  if (state.user !== key) {
    state.user = key;
    state.tiers = {};
  }
}

function track(load) {
  const tier = { at: 0, used: new Set(), promise: null };
  tier.promise = load().then(
    (answer) => {
      tier.at = Date.now();
      return answer || null;
    },
    () => null,
  );
  return tier;
}

function tier1(userId) {
  forUser(userId);
  if (!state.tiers[1]) {
    state.tiers[1] = track(() => getDashboardBootstrap({ calendar: defaultCalendarRange() }));
    // The counts go right behind it, ahead of the popups that start once the page has drawn.
    state.tiers[1].promise.then(() => tier2(userId));
  }
  return state.tiers[1];
}

function tier2(userId) {
  forUser(userId);
  if (!state.tiers[2]) state.tiers[2] = track(() => tier1(userId).promise.then(() => getDashboardBadges()));
  return state.tiers[2];
}

function tier3(userId) {
  forUser(userId);
  if (!state.tiers[3]) state.tiers[3] = track(() => tier2(userId).promise.then(() => getDashboardExtras()));
  return state.tiers[3];
}

async function take(tier, part, pick, fallback) {
  if (tier.used.has(part)) return fallback();
  const answer = await tier.promise;
  if (!answer || tier.used.has(part) || Date.now() - tier.at > FRESH_MS) return fallback();
  const value = pick(answer);
  if (value === undefined) return fallback();
  tier.used.add(part);
  return value;
}

/** The user the start-up data belongs to (for readers that do not know it, e.g. the inbox badge). */
export const bootstrapUser = () => state.user;

/** `part` names what is taken (used once); `pick(answer)` gives it, or undefined to ask for it yourself (`fallback`). */
export const viaTier1 = (userId, part, pick, fallback) => take(tier1(userId), part, pick, fallback);
export const viaTier2 = (userId, part, pick, fallback) => take(tier2(userId), part, pick, fallback);
export const viaTier3 = (userId, part, pick, fallback) => take(tier3(userId), part, pick, fallback);

/**
 * Something slow that nothing on screen waits for (the profile photo, the Complete Your Profile check): it runs once the
 * batches are in, so it never holds the queue in front of them. It does not start tier 3 itself (the header is on every page).
 */
export async function afterStartup(userId, fallback) {
  await tier2(userId).promise;
  if (state.tiers[3]) await state.tiers[3].promise;
  await new Promise((resolve) => setTimeout(resolve, IDLE_MS));
  return fallback();
}
