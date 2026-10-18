import { cookies } from "next/headers";
import Link from "next/link";
import { heldAccounts } from "@/lib/auth/accountCookies";
import { loginPageUrl } from "@/utils/backendOrigin";
import { AutoPick } from "./AutoPick";

export const metadata = { title: "Loading" };

/**
 * Reached through proxy.js when this browser holds several signed-in users for a school and a full page load
 * did not say which one it is for. Nobody is asked: AutoPick chooses this tab's own user (else the most recent
 * sign-in) and goes on to the page through /api/session/pick. The list below is only for a browser without
 * script.
 */
export default async function ChooseAccountPage({ searchParams }) {
  const params = await searchParams;
  const school = typeof params?.school === "string" ? params.school : "";
  const back = typeof params?.return === "string" && params.return.startsWith("/") && !params.return.startsWith("//")
    ? params.return
    : "/";
  const accounts = heldAccounts(await cookies()).filter((a) => !school || a.profile?.schoolUUID === school);
  const pickUrlBase = `/api/session/pick?return=${encodeURIComponent(back)}`;
  // Only what the picker needs: no tokens reach the browser.
  const choices = accounts.map((a) => ({ account: a.account, signedInAt: a.profile?.signedInAt || 0 }));

  return (
    <main className="mx-auto mt-16 max-w-md p-7">
      <AutoPick accounts={choices} pickUrlBase={pickUrlBase} />
      <noscript>
        <ul className="space-y-2.5">
          {accounts.map((a) => (
            <li key={a.account}>
              <Link
                prefetch={false}
                href={`${pickUrlBase}&account=${encodeURIComponent(a.account)}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3"
              >
                <span className="font-medium text-slate-900">{a.profile?.email || a.account}</span>
              </Link>
            </li>
          ))}
        </ul>
        <a className="mt-5 block text-center text-sm text-primary" href={loginPageUrl(school)}>
          Use another account
        </a>
      </noscript>
    </main>
  );
}
