// Checks candidateCookieDomains() from utils/cookieDomain.js against the real
// enrollment hostnames — no browser or live server needed. The probe that picks
// one of these candidates needs a browser; this covers the pure part, i.e. that
// the right candidates are offered in the right order.
// Run: node scripts/verifyCookieDomain.mjs

import { candidateCookieDomains } from "../utils/cookieDomain.js";

let allPassed = true;

function assert(name, condition) {
  if (!condition) allPassed = false;
}

function assertCandidates(hostname, expected) {
  const actual = candidateCookieDomains(hostname);
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  assert(`${hostname || "(empty)"} -> [${expected.join(", ")}]`, ok);
  if (!ok) 
    // console.log("     got:", JSON.stringify(actual));
}

// 1. The three real enrollment environments.

// dev: no domain attribute is possible on localhost — host-only cookie.
assertCandidates("localhost", []);

// UAT: vercel.app is a public suffix and gets rejected by the browser, so the
// probe falls through to the full host. Both must be offered, broadest first.
assertCandidates("is-sms.vercel.app", ["vercel.app", "is-sms.vercel.app"]);

// prod: internationalschooling.org comes first so the cookie stays shared with
// the marketing site — that's today's behaviour and must not change.
assertCandidates("enrollment.internationalschooling.org", [
  "internationalschooling.org",
  "enrollment.internationalschooling.org",
]);

// 2. Hosts that can't carry a domain attribute at all.
assertCandidates("", []);
assertCandidates("localhost", []);
assertCandidates("intranet", []);
assertCandidates("127.0.0.1", []);
assertCandidates("192.168.1.39", []);

// 3. Ordering holds for deeper hostnames.
assertCandidates("a.b.c.example.org", [
  "example.org",
  "c.example.org",
  "b.c.example.org",
  "a.b.c.example.org",
]);

// 4. The broadest candidate is always the registrable-looking pair, and the
//    narrowest is always the host itself (the one domain value a browser can
//    never reject as a public suffix).
const prod = candidateCookieDomains("enrollment.internationalschooling.org");
assert("broadest candidate is the two-label suffix", prod[0] === "internationalschooling.org");
assert(
  "narrowest candidate is the host itself",
  prod[prod.length - 1] === "enrollment.internationalschooling.org"
);

// console.log(allPassed ? "\nAll checks passed." : "\nSome checks FAILED.");
process.exit(allPassed ? 0 : 1);
