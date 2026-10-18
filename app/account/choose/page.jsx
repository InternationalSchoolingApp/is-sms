import { cookies } from "next/headers";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { heldAccounts } from "@/lib/auth/accountCookies";
import { trustedBackend, verifyAccessToken } from "@/lib/auth/smsTokens";
import { encodePayload } from "@/utils/payloadEncoding";
import { loginPageUrl } from "@/utils/backendOrigin";
import { Footer } from "@/components/common/Footer";
import { SchoolLogo } from "@/components/student-enroll/SchoolLogo";

export const metadata = { title: "Choose account" };

/**
 * Reached through proxy.js when this browser holds several signed-in users for a school and a full page load did
 * not say which one it is for. A tab that already works for one of them goes straight on (the inline script
 * below reads the tab's user, see components/auth/TabAccount.jsx); any other tab is asked who is continuing.
 * The choice goes through /api/session/pick and applies to that tab from then on.
 */
export default async function ChooseAccountPage({ searchParams }) {
  const params = await searchParams;
  const school = typeof params?.school === "string" ? params.school : "";
  const back = typeof params?.return === "string" && params.return.startsWith("/") && !params.return.startsWith("//")
    ? params.return
    : "/";
  const held = heldAccounts(await cookies()).filter((a) => !school || a.profile?.schoolUUID === school);
  const pickUrlBase = `/api/session/pick?return=${encodeURIComponent(back)}`;
  const accounts = await Promise.all(held.map(describe));
  const schoolName = held.find((a) => a.profile?.schoolName)?.profile.schoolName || "International Schooling";
  const logoUrl = await schoolLogo(accounts);

  // Only account ids and pick URLs reach the browser: no tokens.
  const picks = Object.fromEntries(accounts.map((a) => [a.account, `${pickUrlBase}&account=${encodeURIComponent(a.account)}`]));
  const autoPick = `(function () {
  var picks = ${JSON.stringify(picks)};
  var tab = null;
  try { tab = window.sessionStorage.getItem("isx-account"); } catch (e) {}
  if (tab && picks[tab]) { window.location.replace(picks[tab]); return; }
  var list = document.getElementById("isx-choose");
  if (list) list.style.visibility = "visible";
})();`;

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC]">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl items-center">
          {logoUrl ? (
            <Image src={logoUrl} alt={schoolName} width={160} height={36} className="w-full max-w-[160px] sm:max-w-[220px]" unoptimized priority />
          ) : (
            <SchoolLogo schoolName={schoolName} width={180} />
          )}
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:py-16">
        {/* hidden until the script below decides: this tab's own user goes straight on, no list flashes. The script
            changes the style before React starts, hence suppressHydrationWarning. */}
        <div id="isx-choose" style={{ visibility: "hidden" }} className="w-full max-w-md" suppressHydrationWarning>
          <noscript>
            <style>{`#isx-choose{visibility:visible !important}`}</style>
          </noscript>
          <section className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.08)] sm:p-8">
            <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Choose an account</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              More than one person is signed in on this browser. Who is continuing?
            </p>

            <ul className="mt-6 space-y-3">
              {accounts.map((a) => (
                <li key={a.account}>
                  <a
                    href={picks[a.account]}
                    className="group flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 transition-colors hover:border-primary hover:bg-primary/5 focus-visible:border-primary focus-visible:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold uppercase text-white"
                    >
                      {a.initial}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-slate-900">{a.email || a.account}</span>
                      {a.role && <span className="block text-xs capitalize text-slate-500">{a.role}</span>}
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-slate-400 transition-colors group-hover:text-primary" aria-hidden="true" />
                  </a>
                </li>
              ))}
            </ul>

            {accounts.length === 0 && (
              <p className="mt-6 text-sm text-slate-600">Your sign-in has ended. Please log in again.</p>
            )}

            <a className="mt-6 block text-center text-sm font-semibold text-primary hover:underline" href={loginPageUrl(school)}>
              Use another account
            </a>
          </section>
        </div>
        <script dangerouslySetInnerHTML={{ __html: autoPick }} />
      </main>

      <Footer schoolName={schoolName} />
      <Footer schoolName={schoolName} inFlow />
    </div>
  );
}

/** What the list shows for one account: e-mail, role, the initial for the avatar. */
async function describe(entry) {
  const email = entry.profile?.email || "";
  let role = "";
  let schoolNumericId = null;
  let backend = null;
  try {
    backend = trustedBackend(entry.profile?.backend);
    const claims = await verifyAccessToken(entry.accessToken, backend);
    role = String(claims.role || "").toLowerCase();
    schoolNumericId = claims.schoolNumericId ?? null;
  } catch {
    // expired or not verifiable: still listed (choosing it renews it), just without the role
  }
  return {
    account: entry.account,
    email,
    role,
    initial: (email || entry.account).charAt(0),
    // server-side only, for the logo call below; never rendered
    token: schoolNumericId ? entry.accessToken : null,
    schoolNumericId,
    backend,
  };
}

/** The school's own logo (SMS {school}/api/v1/links), asked with one listed user's token; null falls back to the IS logo. */
async function schoolLogo(accounts) {
  const withToken = accounts.find((a) => a.token && a.backend);
  if (!withToken) return null;
  try {
    const response = await fetch(`${withToken.backend}/${withToken.schoolNumericId}/api/v1/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${withToken.token}` },
      body: JSON.stringify({ payload: encodePayload({ schoolId: withToken.schoolNumericId }) }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const links = await response.json().catch(() => null);
    return typeof links?.logoUrl === "string" && links.logoUrl ? links.logoUrl : null;
  } catch {
    return null;
  }
}
