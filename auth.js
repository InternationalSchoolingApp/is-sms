import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { login, exchangeSsoToken } from "@/services/authApi";

/**
 * Central Auth.js (next-auth v5) config — the single source used by:
 *   - app/api/auth/[...nextauth]/route.js  (re-exports `handlers`)
 *   - middleware.js                        (uses `auth` directly)
 *   - any future server component/route handler that needs the session
 *     (import { auth } from "@/auth"; const session = await auth();)
 *
 * Per the migration plan: the Spring Boot backend has no Spring
 * Security/JWT of its own — it authenticates via a plain server-side
 * session cookie (POST {schoolId}/api/v1/common/login). next-auth manages
 * a SEPARATE Next.js-side session; this Credentials provider calls that
 * existing login API FIRST and only mirrors its result into next-auth —
 * it never authenticates independently, and the Spring login response is
 * always the source of truth. This is a confirmed High risk in the plan
 * doc (see "Two parallel session systems") — do not change this ordering.
 *
 * The forwarded cookie header below is required because the backend's
 * login call validates the captcha against the SAME HttpSession that
 * rendered the captcha image the user solved — see services/authApi.js.
 * `authorize()`'s second argument is a Web API Request in v5 (was a plain
 * Node req object in v4), so the cookie header is read via
 * `request.headers.get("cookie")`, not `req.headers.cookie`.
 *
 * `secret` is passed explicitly from NEXTAUTH_SECRET (not the v5-default
 * AUTH_SECRET) so .env.local doesn't need to change.
 *
 * The enrollment wizard's URLs are flat (/step/1, /step/2, /step/3 — no
 * {schoolId} segment), so schoolUUID/schoolNumericId/schoolName (known at
 * login time, since the LOGIN page is still {schoolId}-scoped) are carried
 * through into the JWT/session here, same as uniqueId/userId above, so
 * those pages can read `session.schoolUUID` etc. instead of a URL param.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captcha: { label: "Captcha", type: "text" },
        schoolUUID: { label: "School", type: "text" }, // URL-path slug/UUID
        schoolNumericId: { label: "School (numeric)", type: "text" }, // backend's Integer row id — see authApi.js
        schoolName: { label: "School name", type: "text" }, // display-only, passed through so session carries it without an extra fetch
      },
      async authorize(credentials, request) {
        const response = await login(
          {
            email: credentials.email,
            password: credentials.password,
            captcha: credentials.captcha,
            schoolUUID: credentials.schoolUUID,
            schoolNumericId: Number(credentials.schoolNumericId),
          },
          { cookie: request?.headers?.get?.("cookie") }
        );

        // Confirmed at source: status "0"/"2" = failure, "3" = session-out.
        // Only a status OTHER than these means the login itself succeeded.
        if (response.status === "0" || response.status === "2" || response.status === "3") {
          throw new Error(response.message || "Login failed");
        }

        return {
          id: response.uniqueId,
          email: credentials.email,
          userLoginHash: response.userLoginHash,
          redirectUrl: response.redirectUrl,
          // Numeric User.id (LoginResponse.userId) — distinct from `id`
          // above (the uniqueId UUID string). Required as
          // Authentication.userId by downstream student-enrollment
          // save-*-details endpoints, which cannot resolve the user from
          // uniqueId alone (confirmed at SignupStudentUtil.java:1606).
          userId: response.userId,
          schoolUUID: credentials.schoolUUID,
          schoolNumericId: Number(credentials.schoolNumericId),
          schoolName: credentials.schoolName || "",
        };
      },
    }),
    // SSO handoff FROM the legacy Java login page (Login.jsp) — login no
    // longer happens inside this Next.js app at all (see the removed
    // /[schoolId]/common/login route). When a STUDENT with an in-progress
    // enrollment logs in there, the backend redirects the browser to
    // app/api/sso/route.js with a short-lived, single-use `ssoToken`; that
    // route calls signIn("sso-token", ...) server-side, which lands here.
    // `authorize()` exchanges the token for the same user shape the
    // password-based provider above returns — the exchange endpoint is the
    // ONLY consumer of this token, and the backend invalidates it after one
    // use (see services/authApi.js's exchangeSsoToken).
    CredentialsProvider({
      id: "sso-token",
      name: "SSO",
      credentials: {
        ssoToken: { label: "SSO token", type: "text" },
        schoolUUID: { label: "School", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.ssoToken || !credentials?.schoolUUID) {
          console.error("sso-token authorize: missing ssoToken or schoolUUID in credentials");
          return null;
        }
        const response = await exchangeSsoToken(credentials.schoolUUID, credentials.ssoToken);
        // Temporary diagnostic — this is the first live run of this path;
        // remove once the handoff is confirmed working end to end.
        console.log("sso-token authorize: exchangeSsoToken response:", response);
        if (!response || response.status === "0") return null;

        return {
          id: response.uniqueId,
          email: response.email || "",
          userLoginHash: response.userLoginHash,
          redirectUrl: response.redirectUrl || "",
          userId: response.userId,
          schoolUUID: response.schoolUUID,
          schoolNumericId: response.schoolNumericId,
          schoolName: response.schoolName || "",
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.uniqueId = user.id;
        token.email = user.email;
        token.userLoginHash = user.userLoginHash;
        token.redirectUrl = user.redirectUrl;
        token.userId = user.userId;
        token.schoolUUID = user.schoolUUID;
        token.schoolNumericId = user.schoolNumericId;
        token.schoolName = user.schoolName;
      }
      return token;
    },
    async session({ session, token }) {
      session.uniqueId = token.uniqueId;
      session.email = token.email;
      session.userLoginHash = token.userLoginHash;
      session.redirectUrl = token.redirectUrl;
      session.userId = token.userId;
      session.schoolUUID = token.schoolUUID;
      session.schoolNumericId = token.schoolNumericId;
      session.schoolName = token.schoolName;
      return session;
    },
  },
});
