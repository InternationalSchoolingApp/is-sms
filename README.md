This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

Student Signup migration for `is-rest-api` (International Schooling) — see the migration plan doc for full context. Backend Java/Spring Boot code is unchanged; only this frontend is new.

## Reverse proxy / same-domain requirement (Step 2)

The Spring Boot backend authenticates via a plain server-side session cookie — no Spring Security/JWT. For captcha validation and login to work, this app and the backend **must share that session cookie**, which requires being on the **same domain** in production.

**Local dev**: `next.config.mjs`'s fallback `rewrites()` forwards paths not handled by a Next.js route to `NEXT_PUBLIC_BACKEND_BASE_URL`, without adding a URL prefix. The browser sees Next.js and the backend as one origin. Enable it with `NEXT_PUBLIC_USE_LOCAL_PROXY=true` in `.env.local` (see `utils/backendOrigin.js`).

**Production/staging**: this repo cannot configure the real infra reverse proxy — that needs coordination with whoever manages it. The equivalent Nginx rule to mirror what `next.config.mjs` does locally:

```nginx
location / {
    proxy_pass http://<spring-boot-backend-origin>/;
    proxy_set_header Host $host;
    proxy_set_header Cookie $http_cookie;
}

location ~ ^/[^/]+/student/[^/]+/[^/]+ {
    proxy_pass http://<next-js-app-origin>;
}
```

Once that's in place, set `NEXT_PUBLIC_BACKEND_BASE_URL` to the direct backend origin for local development, or to the same origin when a reverse proxy routes backend paths there.

## UAT backend switcher

UAT previously had to be configured with exactly one backend URL at a time (`NEXT_PUBLIC_BACKEND_BASE_URL`), so testing against a different UAT instance meant a redeploy. A floating "UAT backend" picker (bottom-right of every page) lets each tester point their own browser at any backend origin instead — pick one from the preset list in `constant/UatBackendUrls.js` or type a custom `http://ip:port`. The choice is stored per-browser (a cookie, so it also reaches server-side calls) and persists until reset.

The picker only renders when `NEXT_PUBLIC_DEPLOYMENT_MODE` is `DEV` or `UAT` — it's always off on `PROD`, where the cookie is ignored even if somehow present.

A browser calling a UAT backend directly runs into that backend's own CORS policy (it never put this app's origin in its allow-list), so every backend-touching call in this app — including ip-location (`services/ipLocationApi.js`), school settings links (`utils/schoolSettings.js`) and the payment-response/init polling (`services/paymentResponseApi.js`, `services/paymentInitApi.js`) — is a Server Action: the browser calls our own Next.js server, which makes the real cross-origin request itself. Server-to-server calls never go through CORS, so the override Just Works the same way the rest of the app's backend calls already do. The one exception is ip-location, which needs the real site visitor's IP (not this server's) — that Server Action forwards the incoming request's `X-Forwarded-For` header through to the backend. Full-page navigations (login links, logout) still go straight to the overridden origin via `resolveBackendOrigin()`, since navigation isn't subject to CORS at all.

**Route change**: the student-signup account page moved off the `/student-enroll` prefix onto the exact same URL pattern the JSP app itself serves — `/{schoolId}/student/{enrollmentFor}/{learningProgram}` (`app/[schoolId]/student/[enrollmentFor]/[learningProgram]/page.jsx`), matching `ClientSignupStudentController#signupStudent` in is-rest-api. This means Next.js and the JSP app now claim the **same root-level path space**; whoever owns the real reverse proxy needs to route that specific pattern to the Next.js origin instead of (or ahead of) the JSP backend for it to actually take over those URLs — this repo cannot configure that itself, same as the `/backend` proxy above.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
