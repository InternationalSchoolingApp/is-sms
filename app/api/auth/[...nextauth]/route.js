import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { login } from "@/services/authApi";

/**
 * Per the migration plan: the Spring Boot backend has no Spring
 * Security/JWT of its own — it authenticates via a plain server-side
 * session cookie (POST {schoolId}/api/v1/common/login). next-auth manages
 * a SEPARATE Next.js-side session; this Credentials provider calls that
 * existing login API FIRST and only mirrors its result into next-auth —
 * it never authenticates independently, and the Spring login response is
 * always the source of truth. This is a confirmed High risk in the plan
 * doc (see "Two parallel session systems") — do not change this ordering.
 *
 * The `req.headers.cookie` forward below is required because the backend's
 * login call validates the captcha against the SAME HttpSession that
 * rendered the captcha image the user solved — see services/authApi.js.
 */
const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        captcha: { label: "Captcha", type: "text" },
        schoolUUID: { label: "School", type: "text" }, // URL-path slug/UUID
        schoolNumericId: { label: "School (numeric)", type: "text" }, // backend's Integer row id — see authApi.js
      },
      async authorize(credentials, req) {
        console.log("AUTHORIZE CALLED");
        console.log(credentials);
        const response = await login(
          {
            email: credentials.email,
            password: credentials.password,
            captcha: credentials.captcha,
            schoolUUID: credentials.schoolUUID,
            schoolNumericId: Number(credentials.schoolNumericId),
          },
          { cookie: req?.headers?.cookie }
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
        token.userLoginHash = user.userLoginHash;
        token.redirectUrl = user.redirectUrl;
        token.userId = user.userId;
      }
      return token;
    },
    async session({ session, token }) {
      session.uniqueId = token.uniqueId;
      session.userLoginHash = token.userLoginHash;
      session.redirectUrl = token.redirectUrl;
      session.userId = token.userId;
      return session;
    },
  },
});

export { handler as GET, handler as POST };
