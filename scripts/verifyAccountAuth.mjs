// Checks the browser sign-in code (lib/auth) without a browser or the real SMS: a small local server plays
// SMS (JWKS, /auth/refresh, /auth/logout) and tokens are signed here with a throwaway RSA key.
// Run: npm run verify:account-auth

import { createServer } from "node:http";
import { generateKeyPairSync, sign } from "node:crypto";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
let refreshCalls = 0;
let logoutCalls = 0;
let jwksCalls = 0;
const server = createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/.well-known/jwks.json") {
      jwksCalls++;
      res.end(JSON.stringify({ keys: [{ ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256", use: "sig" }] }));
    } else if (req.url === "/school-a/auth/refresh") {
      refreshCalls++;
      const ok = JSON.parse(body).refresh_token === "good-refresh";
      setTimeout(() => {
        if (!ok) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: "invalid_grant" }));
        } else {
          res.end(JSON.stringify({ access_token: token({}), refresh_token: "next-refresh" }));
        }
      }, 50);
    } else if (req.url === "/school-a/auth/logout") {
      logoutCalls++;
      res.end(JSON.stringify({ status: "logged_out" }));
    } else {
      res.statusCode = 404;
      res.end("{}");
    }
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const backend = `http://127.0.0.1:${server.address().port}`;
process.env.NEXT_PUBLIC_BACKEND_BASE_URL = backend;
process.env.NEXT_PUBLIC_DEPLOYMENT_MODE = "PROD";

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
function token(overrides, { key = privateKey, kid = "k1", alg = "RS256" } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const claims = { iss: "is-sms", aud: "is-sms-api", sub: "42", uid: "u-42", sch: 1, role: "STUDENT", sid: "s1", iat: now, exp: now + 900, ...overrides };
  const head = b64({ alg, kid, typ: "JWT" });
  const payload = b64(claims);
  const signature = alg === "RS256" ? sign("RSA-SHA256", Buffer.from(`${head}.${payload}`), key).toString("base64url") : "x";
  return `${head}.${payload}.${signature}`;
}

const { TokenError, logoutAtSms, refreshTokens, trustedBackend, verifyAccessToken } = await import("../lib/auth/smsTokens.js");
const cookies = await import("../lib/auth/accountCookies.js");

let failed = 0;
function check(name, condition) {
  if (!condition) {
    failed++;
    console.log(`FAIL  ${name}`);
  }
}
async function rejects(name, promise, reason) {
  try {
    await promise;
    check(`${name} (should have been refused)`, false);
  } catch (err) {
    check(`${name} -> ${reason}`, err instanceof TokenError && err.reason === reason);
  }
}

// ---- tokens
const claims = await verifyAccessToken(token({}), backend);
check("a good token gives its user", claims.userId === 42 && claims.uniqueId === "u-42" && claims.schoolNumericId === 1 && claims.sid === "s1");
await rejects("expired", verifyAccessToken(token({ exp: Math.floor(Date.now() / 1000) - 120 }), backend), "expired");
await rejects("other issuer", verifyAccessToken(token({ iss: "someone" }), backend), "invalid");
await rejects("other audience", verifyAccessToken(token({ aud: "other-api" }), backend), "invalid");
await rejects("signed by another key", verifyAccessToken(token({}, { key: other.privateKey }), backend), "invalid");
await rejects("HS256 / unsigned", verifyAccessToken(token({}, { alg: "none" }), backend), "invalid");
await rejects("unknown key id", verifyAccessToken(token({}, { kid: "nope" }), backend), "invalid");
await rejects("garbage", verifyAccessToken("abc", backend), "invalid");
const tampered = token({}).split(".");
tampered[1] = b64({ iss: "is-sms", aud: "is-sms-api", sub: "1", uid: "admin", exp: 9999999999 });
await rejects("changed claims", verifyAccessToken(tampered.join("."), backend), "invalid");
check("the key list is cached", jwksCalls <= 3);

// ---- which backend is trusted
check("an unknown backend in a cookie is not trusted", trustedBackend("https://evil.example") === backend);
check("this deployment's backend is trusted", trustedBackend(backend) === backend);

// ---- refresh: one call shared by parallel requests
const [a, b] = await Promise.all([refreshTokens(backend, "school-a", "good-refresh"), refreshTokens(backend, "school-a", "good-refresh")]);
check("parallel renewals share one call to SMS", refreshCalls === 1 && a.refreshToken === "next-refresh" && a === b);
check("a refused renewal gives null", (await refreshTokens(backend, "school-a", "used-refresh")) === null);
await logoutAtSms(backend, "school-a", "next-refresh");
check("logout reaches SMS", logoutCalls === 1);
await logoutAtSms("http://127.0.0.1:1", "school-a", "x"); // unreachable SMS: must not throw

// ---- cookies
const jar = new Map();
const target = { set: (name, value, options) => jar.set(name, { value, options }) };
cookies.writeAccount(target, "u-42", { accessToken: "at", refreshToken: "rt", profile: { email: "j@x.org", schoolUUID: "school-a", userId: 42 } });
const at = jar.get("__Host-ISX_AT_u-42");
check("token cookies are HttpOnly, Secure, Lax, Path=/", at.options.httpOnly && at.options.secure && at.options.sameSite === "lax" && at.options.path === "/");
const store = { getAll: () => [...jar].map(([name, v]) => ({ name, value: v.value })), get: (n) => (jar.has(n) ? { value: jar.get(n).value } : undefined) };
const held = cookies.heldAccounts(store);
check("held accounts are read back with their profile", held.length === 1 && held[0].accessToken === "at" && held[0].profile.email === "j@x.org");
cookies.writePick(target, "u-42", "/school-a/enrollment/x/step/1");
check("a pick works for its path only", cookies.pickedAccount(store, "/school-a/enrollment/x/step/1") === "u-42" && cookies.pickedAccount(store, "/other") === null);
cookies.clearAccount(target, "u-42");
check("clearing an account empties its cookies", cookies.heldAccounts(store).length === 0 && jar.get("__Host-ISX_AT_u-42").options.maxAge === 0);
check("odd account ids are refused", !cookies.isAccountId("../x") && !cookies.isAccountId("a;b") && cookies.isAccountId("a1-b2_C"));

server.close();
if (failed) {
  console.log(`account auth: ${failed} check(s) failed`);
  process.exit(1);
}
console.log("account auth: all checks passed");
