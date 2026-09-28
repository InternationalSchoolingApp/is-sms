This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

Student Signup migration for `is-rest-api` (International Schooling) — see the migration plan doc for full context. Backend Java/Spring Boot code is unchanged; only this frontend is new.

## Reverse proxy / same-domain requirement (Step 2)

The Spring Boot backend authenticates via a plain server-side session cookie — no Spring Security/JWT. For captcha validation and login to work, this app and the backend **must share that session cookie**, which requires being on the **same domain** in production.

**Local dev**: `next.config.mjs`'s `rewrites()` forwards `/backend/*` to `NEXT_PUBLIC_BACKEND_BASE_URL` so the browser sees Next.js and the backend as one origin. Enable it with `NEXT_PUBLIC_USE_LOCAL_PROXY=true` in `.env.local` (see `utils/backendOrigin.js`). Verified locally: the proxied request returns the backend's real `Set-Cookie: SESSION=...` header through the same-origin path.

**Production/staging**: this repo cannot configure the real infra reverse proxy — that needs coordination with whoever manages it. The equivalent Nginx rule to mirror what `next.config.mjs` does locally:

```nginx
location /backend/ {
    proxy_pass http://<spring-boot-backend-origin>/;
    proxy_set_header Host $host;
    proxy_set_header Cookie $http_cookie;
}

location ~ ^/[^/]+/student/[^/]+/[^/]+ {
    proxy_pass http://<next-js-app-origin>;
}
```

Once that's in place, set `NEXT_PUBLIC_BACKEND_BASE_URL` to the same-origin `/backend` path (or drop the distinction entirely) instead of the direct backend URL used during local development.

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
