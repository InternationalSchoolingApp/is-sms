import { cookies } from "next/headers";
import Link from "next/link";
import { heldAccounts } from "@/lib/auth/accountCookies";
import { loginPageUrl } from "@/utils/backendOrigin";

export const metadata = { title: "Choose account" };

/**
 * Shown by proxy.js when this browser holds several signed-in users for a school and the URL does not say
 * which one it is for. Each choice applies to the next visit of that page only.
 */
export default async function ChooseAccountPage({ searchParams }) {
  const params = await searchParams;
  const school = typeof params?.school === "string" ? params.school : "";
  const back = typeof params?.return === "string" && params.return.startsWith("/") && !params.return.startsWith("//")
    ? params.return
    : "/";
  const accounts = heldAccounts(await cookies()).filter((a) => !school || a.profile?.schoolUUID === school);

  return (
    <main className="mx-auto mt-16 max-w-md rounded-xl bg-white p-7 shadow">
      <h1 className="text-xl font-semibold text-slate-900">Choose account</h1>
      <p className="mt-1 mb-5 text-sm text-slate-600">
        You are signed in to more than one account in this browser. Choose the one to use for this page.
      </p>
      <ul className="space-y-2.5">
        {accounts.map((a) => (
          <li key={a.account}>
            <Link
              prefetch={false}
              href={`/api/session/pick?account=${encodeURIComponent(a.account)}&return=${encodeURIComponent(back)}`}
              className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 hover:border-primary"
            >
              <span className="font-medium text-slate-900">{a.profile?.email || a.account}</span>
              <span className="text-xs text-slate-500">{a.profile?.schoolName || a.profile?.schoolUUID || ""}</span>
            </Link>
          </li>
        ))}
      </ul>
      <a className="mt-5 block text-center text-sm text-primary" href={loginPageUrl(school)}>
        Use another account
      </a>
    </main>
  );
}
