# Browser sign-in with SMS tokens (several users per browser)

Phase 4 of the SMS token plan (`is-rest-api`: `docs/63_7_0_SMS_TOKEN_BASED_PLAN.md`, section 27). This app no
longer uses Auth.js. Each signed-in user has their own cookies, so different users (or roles, or schools) can
work in different tabs of one browser, and every call to SMS carries that user's token.

## How a request finds its user

`proxy.js` runs on the protected routes (`/{school}/enrollment/{program}/step/...`,
`/{school}/add-enrollment/{parentId}/{sessionUserId}/step/...`):

1. **Pick the account**: the one chosen on `/account/choose` for exactly this path, else a path segment equal to
   an account's UNIQUEUUID or numeric user id, else the browser's only account for this school. Several and
   nothing naming one: `/account/choose`. None: the school's login page on the Java app.
2. **Same school**: an account only counts for URLs of its own school (first path segment).
3. **Valid token**: the SMS access token is verified here (RS256, SMS's `/.well-known/jwks.json`, issuer,
   audience, expiry). Expired: renewed at SMS (`/{school}/auth/refresh`) with the refresh token, and the new
   cookies are written on the response. Ended login: its cookies are cleared, login page.
4. The page learns the account from the `x-is-account` request header; `lib/auth/session.js`
   (`getAccountSession()`) gives server code the user and token, and `withSmsAuth()` adds
   `Authorization: Bearer` to calls to SMS. The browser never sees the token.

## Cookies (all HttpOnly, Secure, SameSite=Lax, Path=/)

| Cookie | Content |
|---|---|
| `__Host-ISX_AT_<uid>` | SMS access token |
| `__Host-ISX_RT_<uid>` | SMS refresh token (one-time, rotating) |
| `__Host-ISX_PF_<uid>` | e-mail, school, user id, which SMS backend (display and routing data; the token is the authority) |
| `__Host-ISX_PICK` | account chosen on the chooser, for one navigation to one path (30 s) |

At most 5 users per browser: signing in a 6th ends the oldest login.

## Signing in and out

- Sign-in is still the Java login page; its SSO handoff (`/api/sso?token=...`) exchanges the one-time token at
  SMS `sso/exchange`, which must return tokens: on SMS set `AUTH_TOKEN_ENABLED=true` and
  `AUTH_SSO_ISSUE_TOKENS=true`.
- `POST /api/session/logout` with `X-Account: <uid>` ends that user's login at SMS and clears only that user's
  cookies (`utils/logout.js`).

## Settings

| Variable | Default | Meaning |
|---|---|---|
| `BACKEND_BASE_URL` / `NEXT_PUBLIC_BACKEND_BASE_URL` | | SMS; its JWKS verifies tokens |
| `SMS_TOKEN_ISSUER` | `is-sms` | must equal SMS `auth.token.issuer` |
| `SMS_TOKEN_AUDIENCE` | `is-sms-api` | must equal SMS `auth.token.audience` |

On UAT a login may come from any backend in `constant/UatBackendUrls.js`; only those (and this deployment's
backend) are trusted to supply signing keys, so a cookie can never name the key server.

## Checks

`npm run verify:account-auth` (local fake SMS: tokens good, expired, wrong issuer, audience, key, algorithm,
changed claims; JWKS caching; renewals shared by parallel requests; logout; cookie attributes; picks).

## Known limits

- The root layout reads the user once per full page load. A client-side navigation within one tab to a page of
  another account keeps the first account's data until the next full load.
- `next-auth` is no longer imported but is still listed in `package.json`; remove it with `npm uninstall
  next-auth` when convenient.
