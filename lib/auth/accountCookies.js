/**
 * Browser sign-in for this app (SMS plan section 27, Phase 4): one cookie set per signed-in user, so
 * several users can work in different tabs of one browser. Named after the user's UNIQUEUUID:
 *   __Host-ISX_AT_<uid>  the SMS access token (JWT, 15 min inside; cookie kept as long as the login)
 *   __Host-ISX_RT_<uid>  the SMS refresh token (one-time, rotating)
 *   __Host-ISX_PF_<uid>  display data SMS's token does not carry: e-mail, school UUID and name, backend
 *   __Host-ISX_PICK      the account chosen on /account/choose, for one navigation to one path
 * All HttpOnly, Secure, SameSite=Lax, Path=/. The proxy (proxy.js) reads them on every request.
 */

export const ACCESS_PREFIX = "__Host-ISX_AT_";
export const REFRESH_PREFIX = "__Host-ISX_RT_";
export const PROFILE_PREFIX = "__Host-ISX_PF_";
export const PICK_COOKIE = "__Host-ISX_PICK";
export const ACCOUNT_HEADER = "x-is-account";
// Sent by the page itself (components/auth/TabAccount.jsx) on its own calls: which of the browser's accounts
// this tab works for. Same name and meaning as SMS's X-Account (accountAuth.js). It only chooses among the
// accounts the browser already holds cookies for; it never signs anyone in.
export const TAB_ACCOUNT_HEADER = "x-account";
export const MAX_ACCOUNTS = 5;
const LOGIN_MAX_AGE = 30 * 24 * 60 * 60;
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function isAccountId(value) {
  return typeof value === "string" && ACCOUNT_ID.test(value);
}

function base(maxAge) {
  return { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge };
}

/** Accounts the browser holds: [{ account, accessToken, refreshToken, profile }]. `store` is a RequestCookies or cookies(). */
export function heldAccounts(store) {
  const found = new Map();
  for (const { name, value } of store.getAll()) {
    if (!value) continue;
    for (const [prefix, field] of [[ACCESS_PREFIX, "accessToken"], [REFRESH_PREFIX, "refreshToken"], [PROFILE_PREFIX, "profile"]]) {
      if (name.startsWith(prefix)) {
        const account = name.slice(prefix.length);
        if (!isAccountId(account)) continue;
        const entry = found.get(account) || { account };
        entry[field] = field === "profile" ? decodeProfile(value) : value;
        found.set(account, entry);
      }
    }
  }
  return [...found.values()].filter((entry) => entry.accessToken || entry.refreshToken);
}

/** Writes one account's cookies onto a response (`target` is NextResponse.cookies or cookies()). */
export function writeAccount(target, account, { accessToken, refreshToken, profile }) {
  target.set(ACCESS_PREFIX + account, accessToken, base(LOGIN_MAX_AGE));
  if (refreshToken) target.set(REFRESH_PREFIX + account, refreshToken, base(LOGIN_MAX_AGE));
  if (profile) target.set(PROFILE_PREFIX + account, encodeProfile(profile), base(LOGIN_MAX_AGE));
}

export function clearAccount(target, account) {
  for (const prefix of [ACCESS_PREFIX, REFRESH_PREFIX, PROFILE_PREFIX]) {
    target.set(prefix + account, "", base(0));
  }
}

/** The pick cookie: account and the exact path it is for, valid 30 seconds. */
export function writePick(target, account, path) {
  target.set(PICK_COOKIE, `${account}.${Buffer.from(path, "utf8").toString("base64url")}`, base(30));
}

export function clearPick(target) {
  target.set(PICK_COOKIE, "", base(0));
}

export function pickedAccount(store, path) {
  const raw = store.get(PICK_COOKIE)?.value;
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot <= 0) return null;
  const account = raw.slice(0, dot);
  try {
    const forPath = Buffer.from(raw.slice(dot + 1), "base64url").toString("utf8");
    return isAccountId(account) && forPath === path ? account : null;
  } catch {
    return null;
  }
}

function encodeProfile(profile) {
  return Buffer.from(JSON.stringify(profile), "utf8").toString("base64url");
}

function decodeProfile(value) {
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
