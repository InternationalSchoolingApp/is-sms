// Local check for utils/tokenRefresh.js, the logic that keeps the SMS access token fresh. No server needed.
// Run: node scripts/verifyTokenRefresh.mjs   (or: npm run verify:token-refresh)

import assert from "node:assert/strict";
import {
  REFRESH_MARGIN_MS,
  applyTokens,
  createRefresher,
  needsRefresh,
  normalizeTokens,
} from "../utils/tokenRefresh.js";

const NOW = 1_700_000_000_000;
const loggedIn = { uniqueId: "uid-1", accessToken: "a1", refreshToken: "r1", accessTokenExpires: NOW + 15 * 60_000 };
const fresh = { access_token: "a2", refresh_token: "r2", expires_in: 900 };

let failures = 0;
async function check(name, fn) {
  try {
    await fn();
  } catch (err) {
    failures++;
    console.error("FAIL", name, "\n   ", err.message);
  }
}

await check("normalizeTokens accepts the refresh endpoint's names and the exchange's names", () => {
  assert.deepEqual(normalizeTokens({ access_token: "a", refresh_token: "r", expires_in: 900 }), { accessToken: "a", refreshToken: "r", expiresIn: 900 });
  assert.deepEqual(normalizeTokens({ accessToken: "a", refreshToken: "r", expiresIn: 900 }), { accessToken: "a", refreshToken: "r", expiresIn: 900 });
  assert.equal(normalizeTokens({ accessToken: "a" }), null);
  assert.equal(normalizeTokens(null), null);
});

await check("applyTokens replaces the pair, sets the expiry and clears an earlier error", () => {
  const next = applyTokens({ ...loggedIn, tokenError: "RefreshFailed" }, fresh, NOW);
  assert.equal(next.accessToken, "a2");
  assert.equal(next.refreshToken, "r2");
  assert.equal(next.accessTokenExpires, NOW + 900_000);
  assert.equal(next.tokenError, undefined);
  assert.equal(next.uniqueId, "uid-1"); // identity is untouched
});

await check("applyTokens ignores a body without tokens", () => {
  assert.deepEqual(applyTokens(loggedIn, { status: "1" }, NOW), loggedIn);
});

await check("needsRefresh only when there are tokens and expiry is near", () => {
  assert.equal(needsRefresh(loggedIn, NOW), false);
  assert.equal(needsRefresh(loggedIn, NOW + 15 * 60_000 - REFRESH_MARGIN_MS), true);
  assert.equal(needsRefresh(loggedIn, NOW + 20 * 60_000), true);
  assert.equal(needsRefresh({ uniqueId: "uid-1" }, NOW + 99 * 60_000), false); // no tokens: nothing to refresh
  assert.equal(needsRefresh({ ...loggedIn, refreshToken: undefined }, NOW + 99 * 60_000), false);
});

await check("a good refresh returns the new pair", async () => {
  const refresher = createRefresher({ refresh: async () => ({ status: 200, body: fresh }), now: () => NOW });
  const next = await refresher(loggedIn);
  assert.equal(next.accessToken, "a2");
  assert.equal(next.refreshToken, "r2");
});

await check("concurrent refreshes share one call, and a racer that still holds the old cookie gets the new pair", async () => {
  let calls = 0;
  const refresher = createRefresher({
    refresh: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 10));
      return { status: 200, body: fresh };
    },
    now: () => NOW,
    shareMs: 200,
  });
  const [a, b] = await Promise.all([refresher(loggedIn), refresher(loggedIn)]);
  const late = await refresher(loggedIn); // arrives after it settled, still with the old refresh token
  assert.equal(calls, 1, "the old refresh token must be presented to SMS only once");
  assert.equal(a.refreshToken, "r2");
  assert.equal(b.refreshToken, "r2");
  assert.equal(late.refreshToken, "r2");
});

await check("once the sharing window has passed a new token triggers a new call", async () => {
  let calls = 0;
  const refresher = createRefresher({ refresh: async () => (calls++, { status: 200, body: fresh }), now: () => NOW, shareMs: 5 });
  await refresher(loggedIn);
  await new Promise((r) => setTimeout(r, 30));
  await refresher({ ...loggedIn, refreshToken: "r2" });
  assert.equal(calls, 2);
});

await check("a conflict (409) keeps the tokens and flags it", async () => {
  const next = await createRefresher({ refresh: async () => ({ status: 409 }) })(loggedIn);
  assert.equal(next.refreshToken, "r1");
  assert.equal(next.tokenError, "RefreshConflict");
});

await check("a rejected refresh token (401, 403, 400) drops the tokens but keeps who the user is", async () => {
  for (const status of [400, 401, 403]) {
    const next = await createRefresher({ refresh: async () => ({ status }) })(loggedIn);
    assert.equal(next.accessToken, undefined, `status ${status}`);
    assert.equal(next.refreshToken, undefined, `status ${status}`);
    assert.equal(next.tokenError, "RefreshTokenError", `status ${status}`);
    assert.equal(next.uniqueId, "uid-1", `status ${status}`);
  }
});

await check("a network failure, 429 and 5xx keep the tokens so the next poll retries", async () => {
  const thrown = await createRefresher({ refresh: async () => { throw new Error("ECONNRESET"); } })(loggedIn);
  assert.equal(thrown.tokenError, "RefreshFailed");
  assert.equal(thrown.refreshToken, "r1");
  for (const status of [429, 500, 503]) {
    const next = await createRefresher({ refresh: async () => ({ status }) })(loggedIn);
    assert.equal(next.tokenError, "RefreshFailed", `status ${status}`);
    assert.equal(next.refreshToken, "r1", `status ${status}`);
  }
});

await check("a 200 without tokens is a failure, not a success", async () => {
  const next = await createRefresher({ refresh: async () => ({ status: 200, body: {} }) })(loggedIn);
  assert.equal(next.tokenError, "RefreshFailed");
});

if (failures) {
  console.error(`${failures} check(s) failed`);
  process.exit(1);
}
console.log("token refresh: all checks passed");
