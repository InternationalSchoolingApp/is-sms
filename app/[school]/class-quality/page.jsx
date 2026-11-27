import { getAccountSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { loginPageUrl } from "@/utils/backendOrigin";
import { getClassQualityReport } from "@/services/classQualityApi";
import { ClassQuality } from "@/components/student/ClassQuality";
import { Footer } from "@/components/common/Footer";

export const metadata = { title: "Class Quality" };

/**
 * Class Quality screen: the real per-student class-analytics report for one
 * class/lens session, replacing the paused AI-written content.
 *
 * App Router wiring — reachable at:
 *   /{school}/class-quality?session=<lensSessionExternalId>
 *
 * This repo is the enrollment/signup surface and has no shared dashboard shell
 * or nav menu to add a link to, so the page carries its own header + Footer the
 * way app/account/choose does. Add a nav entry here once a dashboard exists.
 */
export default async function ClassQualityPage({ params, searchParams }) {
  const session = await getAccountSession();
  const { school } = await params;
  const sp = await searchParams;

  if (!session) {
    redirect(loginPageUrl(school));
  }

  // The class is chosen by its externalId (LENS_SESSION.SESSION_ID). Accept a
  // couple of likely query names so the screen is easy to link to.
  const sessionExternalId =
    pickParam(sp?.session) || pickParam(sp?.sessionId) || pickParam(sp?.externalId) || "";

  const result = await getClassQualityReport(session.schoolUUID, { sessionExternalId });

  const schoolName = session.schoolName || "International Schooling";

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F9FC]">
      <header className="border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center">
          <span className="text-sm font-bold text-slate-900">{schoolName}</span>
        </div>
      </header>

      <main className="flex-1 px-4 py-8 sm:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <ClassQuality
            report={result.ok ? result.data : null}
            error={result.ok ? null : result.error}
            message={result.ok ? result.message : null}
          />
        </div>
      </main>

      <Footer schoolName={schoolName} />
      <Footer schoolName={schoolName} inFlow />
    </div>
  );
}

function pickParam(value) {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}
