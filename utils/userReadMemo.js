import { getSessionIdentity } from "@/utils/backendRequest";

/**
 * A slow backend READ that one dashboard start-up asks twice (Tier 1 and again for a popup in Tier 3:
 * dashboard-or-migration, additinal-layer-details) is shared for a short while per signed-in user, in this server process.
 * Server-only.
 *
 * - The user is always the session's own (getSessionIdentity), never an id from the browser.
 * - Only a good answer is kept (`isGood`); a failure is asked again next time.
 * - SHARE_MS is short on purpose: enough for one page load, so a change made a moment later (a step saved in the
 *   onboarding gate, Outlook activated) is not hidden for long. Those saves also call forgetUserRead(name).
 */
const SHARE_MS = 30 * 1000;
const MAX_ENTRIES = 5000;
const shared = new Map(); // `${userId}|${name}` -> { at, promise }

export async function sharedUserRead(name, load, isGood = (value) => value != null) {
  const me = await getSessionIdentity();
  if (!me) return load();
  const key = `${me.userId}|${name}`;
  const hit = shared.get(key);
  if (hit && Date.now() - hit.at < SHARE_MS) return hit.promise;
  if (shared.size >= MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of shared) if (now - v.at >= SHARE_MS) shared.delete(k);
    if (shared.size >= MAX_ENTRIES) shared.clear();
  }
  const promise = Promise.resolve().then(load);
  const entry = { at: Date.now(), promise };
  shared.set(key, entry);
  promise.then(
    (value) => {
      if (!isGood(value) && shared.get(key) === entry) shared.delete(key);
    },
    () => {
      if (shared.get(key) === entry) shared.delete(key);
    },
  );
  return promise;
}

/** After a save that changes what `name` answers: the next read asks the backend again. */
export async function forgetUserRead(name) {
  const me = await getSessionIdentity();
  if (me) shared.delete(`${me.userId}|${name}`);
}
