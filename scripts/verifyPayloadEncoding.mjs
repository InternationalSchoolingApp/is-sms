// Local round-trip check for utils/payloadEncoding.js — no live server needed.
// Mirrors AesUtil.decode() from the Java backend byte-for-byte (see
// utils/payloadEncoding.js for the algorithm and source references).
// Run: node scripts/verifyPayloadEncoding.mjs

import { encodePayload, decodePayloadLikeBackend } from "../utils/payloadEncoding.js";

function roundTrip(original) {
  const encoded = encodePayload(original);
  const decoded = decodePayloadLikeBackend(encoded);
  return JSON.parse(decoded);
}

let allPassed = true;

function assert(name, condition) {
  console.log(condition ? "PASS" : "FAIL", name);
  if (!condition) allPassed = false;
}

// 1. Plain values round-trip cleanly.
assert(
  "simple object round-trips",
  JSON.stringify(roundTrip({ requestKey: "COUNTRY_LIST_KEY" })) ===
    JSON.stringify({ requestKey: "COUNTRY_LIST_KEY" })
);

assert(
  "email/name fields round-trip",
  JSON.stringify(
    roundTrip({ firstName: "Karan", lastName: "Singh", email: "karan.singh@internationalschooling.org" })
  ) === JSON.stringify({ firstName: "Karan", lastName: "Singh", email: "karan.singh@internationalschooling.org" })
);

// 2. Special characters and unicode survive.
assert(
  "special chars and unicode round-trip",
  roundTrip({ note: "special chars: & = ? # / \" ' { } unicode: éü中" }).note ===
    "special chars: & = ? # / \" ' { } unicode: éü中"
);

// 3. CONFIRMED backend quirk: a literal "+" in any field value is turned into
// a space by the backend's decode() (see payloadEncoding.js doc comment).
// This is why intl-tel-input's countryCode must be sent WITHOUT a leading
// "+" (e.g. "91", matching intlTelInput's dialCode property) — never "+91".
const plusResult = roundTrip({ countryCode: "+91" });
assert(
  "confirmed quirk: leading + is stripped/turned to space by backend decode (send dial codes WITHOUT +)",
  plusResult.countryCode === " 91"
);

const noPlusResult = roundTrip({ countryCode: "91" });
assert(
  "workaround confirmed: dial code WITHOUT + survives untouched",
  noPlusResult.countryCode === "91"
);

console.log(allPassed ? "\nAll checks passed." : "\nSome checks failed.");
process.exit(allPassed ? 0 : 1);
