/**
 * Mirrors the backend's payload envelope exactly (verified against
 * AesUtil.java in the is-rest-api repo — its `decode()` method is
 * base64-decode + URL-decode only, NOT real AES, despite the name).
 *
 * Backend decode (AesUtil.decode):
 *   1. payload.replaceAll(" ", "+")
 *   2. Base64 decode -> UTF-8 string
 *   3. URLDecoder.decode(str, "UTF-8")  (also turns literal "+" into a space)
 *
 * Frontend must therefore encode as: btoa(encodeURI(JSON.stringify(payload)))
 *
 * Known backend quirk (see AesUtil.decodePreservePlus javadoc): because
 * encodeURI() leaves a literal "+" untouched, and URLDecoder.decode() turns
 * every "+" into a space, a literal "+" inside a JSON value (e.g. a phone
 * number "+15854990662") is silently turned into a space by the STANDARD
 * decode() used by every Student Signup endpoint. Endpoints that need to
 * preserve a leading "+" use `decodePreservePlus` instead — but Student
 * Signup's stage-save endpoints do not. This affects the `contactNumber`/
 * `countryCode` fields: send the ISD code and the number as separate JSON
 * fields (already the case for `countryCode` + `contactNumber` in the
 * existing DTOs), never as a single "+91..." string, or the leading "+"
 * will be dropped server-side.
 */

export function encodePayload(data) {
  const json = JSON.stringify(data);
  return btoa(encodeURI(json));
}

/**
 * Matches the existing frontend's standalone `encode(payload)` helper
 * (jquery.commonFunction.js:6808 — also `btoa(encodeURI(payload))`, applied
 * to a raw string). Used ONLY for the password/confirmPassword fields in the
 * account-creation ("stage-1") request: the backend calls `aesUtil.decode()`
 * a SECOND time on just that field after decoding the outer payload
 * (ClientSignupStudentController → studentSignupStage1, confirmed at
 * source). Every other field goes through encodePayload() only, once.
 */
export function encodeRawString(value) {
  return btoa(encodeURI(value));
}

/**
 * Local-only mirror of AesUtil.decode(), used purely to verify encodePayload()
 * round-trips correctly without needing a live backend call. Not used in
 * production code paths.
 */
export function decodePayloadLikeBackend(encoded) {
  const spacesToPlus = encoded.replace(/ /g, "+");
  const binary = atob(spacesToPlus);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  const utf8String = new TextDecoder("utf-8").decode(bytes);
  const plusToSpace = utf8String.replace(/\+/g, " ");
  return decodeURIComponent(plusToSpace);
}
