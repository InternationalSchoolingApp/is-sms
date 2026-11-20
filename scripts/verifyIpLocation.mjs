import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

// Exercise the browser fetch boundary with a mocked Server Action and override cookie.
const source = (await readFile(new URL("../services/ipLocationClientApi.js", import.meta.url), "utf8"))
  .replace('import { getClientBackendOverride } from "@/utils/backendOrigin";',
    'const getClientBackendOverride = () => globalThis.__locationTest.override;')
  .replace('import { getIpLocation as getOverrideIpLocation } from "@/services/ipLocationApi";',
    'const getOverrideIpLocation = () => globalThis.__locationTest.serverAction();');
const { getIpLocation } = await import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
const originalFetch = globalThis.fetch;
let serverCalls = 0;
let browserCalls = 0;
const newYork = { status: "success", query: "198.51.100.1", timezone: "America/New_York" };
globalThis.__locationTest = {
  override: "",
  serverAction: () => { serverCalls++; return { status: "success", timezone: "Europe/Amsterdam" }; },
};
try {
  globalThis.fetch = async (url, options) => {
    browserCalls++;
    assert.equal(url, "/api/v1/ip-location");
    assert.equal(options.cache, "no-store");
    return { ok: true, json: async () => newYork };
  };
  assert.deepEqual(await getIpLocation(), newYork);
  assert.equal(serverCalls, 0, "normal lookup must not use the app server's outbound connection");
  const amsterdam = { ...newYork, timezone: "Europe/Amsterdam" };
  globalThis.fetch = async () => ({ ok: true, json: async () => amsterdam });
  assert.deepEqual(await getIpLocation(), amsterdam, "a later lookup must use the current network");
  globalThis.fetch = async () => ({ ok: false, status: 503 });
  await assert.rejects(getIpLocation(), /503/);
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ status: "fail", message: "invalid IP" }) });
  await assert.rejects(getIpLocation(), /invalid IP/);
  assert.equal(serverCalls, 0, "failed browser lookups must not silently fall back to server location");
  globalThis.__locationTest.override = "https://uat.example";
  assert.equal((await getIpLocation()).timezone, "Europe/Amsterdam");
  assert.equal(serverCalls, 1);
  assert.equal(browserCalls, 1);
  console.log("IP location checks passed: browser path, network changes, failures, UAT override.");
} finally {
  globalThis.fetch = originalFetch;
  delete globalThis.__locationTest;
}
