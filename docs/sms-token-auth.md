# SMS tokens in is-sms

What this app does with the SMS token API, and what it deliberately does not. The server side, the rules for tokens and
the settings are in the SMS repository: `is-rest-api/docs/63_7_0_SMS_TOKEN_BASED_PLAN.md` (sections 14 to 21) and
`docs/63_7_0_TOKEN_CLIENT_GUIDE.md`.

**Everything here is inert until SMS returns tokens** (`auth.token.enabled` and `auth.sso.issue-tokens` on the backend).
With them off the SSO exchange answers as it always did, no token fields exist, and the app behaves exactly as before.

## The flow

1. A student logs in on the Java login page. Because the enrollment is in progress, SMS redirects to `/api/sso?token=...`
   (unchanged).
2. `app/api/sso/route.js` calls `signIn("sso-token")`. `auth.js` exchanges the one-time token at
   `POST /{school}/api/v1/common/sso/exchange`. **New:** the answer also carries `accessToken`, `refreshToken`,
   `expiresIn`; `services/authApi.js` adds `backendOrigin` (the backend that issued them).
3. `auth.js` keeps them in the Auth.js JWT (the encrypted, HttpOnly cookie). The refresh token never leaves the server.
   The `session` callback exposes only the 15 minute **access token** (`session.accessToken`) and `session.tokenError`.
4. The page puts `session.accessToken` into the `authentication` envelope it already builds
   (`utils/authentication.js`, filled from `hooks/useEnrollmentContext.js`). `postPayload` in
   `services/studentSignupBackendApi.js` takes it out of the body and sends `Authorization: Bearer <token>`.
   No cookie is read or forwarded, which is the rule that file has always followed.
5. `components/providers/AuthSessionProvider.jsx` polls the session every 4 minutes. That poll runs in
   `/api/auth/session`, the jwt callback sees less than 5 minutes left and refreshes (`utils/tokenRefresh.js`), and the
   route writes the new tokens back to the cookie.
6. Signing out (`utils/logout.js` calls `signOut`) fires the `signOut` event in `auth.js`, which calls
   `POST /{school}/auth/logout` with the refresh token. The existing navigation to the Java logout page follows, as before.

## Why a refresh only happens in the session poll

SMS refresh tokens are **one-time**: every refresh returns a new one and the old one stops working. Presenting an old one
again, after a 10 second grace, is treated as theft and ends the whole login. Auth.js can only write a refreshed token back to
the cookie from a route handler or the proxy, not from a Server Action or a page render. A refresh inside a Server Action would
leave the cookie holding a consumed refresh token. So Server Actions never refresh: they are handed the access token by the
page, and the poll keeps that token fresh. `utils/tokenRefresh.js` also makes concurrent refreshes in one server process share a
single call.

## What it does not do yet

- **Nothing on the backend requires the token.** The enrollment endpoints are still public on SMS, so a missing or expired token
  changes nothing today. The point of sending it now is that SMS can log how often the `userId` in a body differs from the
  signed-in user (`auth.body-identity=log`) before anyone enforces it.
- **One account per browser.** Auth.js is a cookie session. Per-tab users need the pattern in the SMS client guide, section 4.
- **The password provider in `auth.js` is untouched.** It still logs in through the old endpoint and gets no tokens.
- **`/api/sso` still needs the Java login page.** Moving login into this app is a separate decision.

## Known risk

If two requests refresh the same login at the same moment on **different server instances** (for example two serverless
instances), one gets `409` and its response may write the older refresh token back into the cookie. A later refresh then
presents a consumed token and SMS ends the login. The student has to start again from the login page. It needs two polls at the
same instant on two instances, and the 4 minute poll makes it rare; raising SMS's `auth.token.refresh-grace` narrows it further.

## Checking it

`npm run verify:token-refresh` checks the refresh logic with no server (eleven cases: shared concurrent refresh, conflict,
rejected, network failure). `npm run lint` and `npm run build` pass. To see it work end to end, log in on the Java page as a
student with an enrollment in progress, with `AUTH_TOKEN_ENABLED=true` and `AUTH_SSO_ISSUE_TOKENS=true` on SMS: the
`/api/auth/session` response then contains `accessToken` (and never `refreshToken`), and SMS logs
`Authorization: Bearer` on the wizard's calls.
