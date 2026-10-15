"use client";

import { useEffect } from "react";
import Image from "next/image";
import { useParams, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { LoaderCircle } from "lucide-react";
import { getAddEnrollmentThankYou } from "@/services/addEnrollmentBackendApi";
import { expireSession } from "@/utils/logout";

/**
 * Thank-you page of the Add Another Student wizard
 * (/{school}/add-enrollment/{parentId}/{sessionUserId}/thank-you). The review step sends the user
 * here when the backend answers REDIRECT_TO_DASHBOOARD (enrollment already completed). One details
 * API call fills the page; the account card below is the design of AccountInfoCard in
 * components/common/PaymentResponseView.jsx.
 */
export function AddThankYou() {
  const { school, parentId, sessionUserId } = useParams();
  const childUniqueId = useSearchParams().get("child") || "";
  const { data: session, status } = useSession();
  const authenticated = status === "authenticated" && Boolean(session?.schoolUUID && session?.uniqueId);

  useEffect(() => {
    if (status === "unauthenticated") expireSession(school);
  }, [status, school]);

  const details = useQuery({
    queryKey: ["add-enrollment-thank-you", session?.schoolUUID, parentId, childUniqueId],
    queryFn: () =>
      getAddEnrollmentThankYou(session.schoolUUID, { parentId, sessionUserId: session.uniqueId, childUniqueId }),
    enabled: authenticated,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });

  if (!authenticated || details.isPending) {
    return (
      <PageShell>
        <div className="flex flex-col items-center gap-5 py-10 text-center">
          <LoaderCircle className="size-12 animate-spin text-primary" aria-hidden="true" />
          <h1 className="text-xl font-bold text-slate-800">Please wait…</h1>
        </div>
      </PageShell>
    );
  }

  const data = details.data;
  if (details.isError || !data || data.status === "0" || data.status === "2") {
    return (
      <PageShell>
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-slate-900">Thank you for enrolling!</h2>
          <p className="mt-3 text-sm text-slate-600">
            {data?.message || "We couldn't load your enrollment details right now. They will also be sent to you by email."}
          </p>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell schoolSettingsLinks={data.schoolSettingsLinks} schoolName={data.displaySchoolName}>
      <div className="text-center">
        <Image
          src="/images/OrderSuccess.gif"
          alt="Enrollment successful"
          width={150}
          height={150}
          unoptimized
          priority
          className="mx-auto h-24 w-24 md:h-32 md:w-32"
        />
        <h2 className="text-2xl font-extrabold tracking-tight text-emerald-600 sm:text-3xl">Successfully Enrolled!</h2>

        {data.userName && <p className="mt-4 text-base font-bold text-black">Dear, {data.userName}</p>}
        {data.displaySchoolName && (
          <p className="mt-3 text-sm font-semibold text-slate-700">Thank you for choosing {data.displaySchoolName}!</p>
        )}
        {data.message && (
          <div className="mt-5 space-y-2 rounded-2xl bg-emerald-50/80 px-5 py-4 text-sm leading-relaxed text-slate-700 ring-1 ring-emerald-100">
            <p>{data.message}</p>
          </div>
        )}

        <AccountInfoCard data={data} />
      </div>
    </PageShell>
  );
}

// Same info as the invite mail — SMS password + Outlook account (design copied from PaymentResponseView's AccountInfoCard).
function AccountInfoCard({ data }) {
  if (data.showAccountInfo !== "Y" && !data.createPasswordUrl && !data.outlookEmail) return null;
  const hasOutlook = data.outlookEmail && data.outlookPassword;
  return (
    <div className="mt-5 space-y-4 rounded-2xl bg-blue-50/80 px-5 py-4 text-left text-sm leading-relaxed text-slate-700 ring-1 ring-blue-100">
      <div>
        <p className="font-bold text-slate-900">Step 1: Create your SMS password</p>
        {data.createPasswordUrl && (
          <a
            href={data.createPasswordUrl}
            className="mt-2 inline-block rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary/90"
          >
            Create Password
          </a>
        )}
      </div>
      <div>
        <p className="font-bold text-slate-900">Step 2: Sign in to Outlook and set your new password</p>
        {hasOutlook ? (
          <dl className="mt-2 space-y-1">
            <div>
              <dt className="inline font-semibold">Outlook login URL: </dt>
              <dd className="inline">
                <a href={data.outlookLoginUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                  {data.outlookLoginUrl}
                </a>
              </dd>
            </div>
            <div>
              <dt className="inline font-semibold">Email: </dt>
              <dd className="inline break-all">{data.outlookEmail}</dd>
            </div>
            <div>
              <dt className="inline font-semibold">Temporary password: </dt>
              <dd className="inline font-mono">{data.outlookPassword}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2">Your Outlook account is being prepared. The details will be shared with you by email.</p>
        )}
      </div>
    </div>
  );
}

// Same page frame as the payment response pages (PaymentResponseView's PageShell).
function PageShell({ children, schoolSettingsLinks, schoolName }) {
  const logoUrl = schoolSettingsLinks?.logo;
  const websiteUrl = schoolSettingsLinks?.website || "https://internationalschooling.org/";
  return (
    <main
      className="flex min-h-screen flex-col items-center bg-[#eef4fb] bg-cover bg-center bg-no-repeat p-4 sm:p-8"
      style={{ backgroundImage: "url('/images/signup-thankyou-bg.png')" }}
    >
      <div className="mt-6 mb-4 flex justify-center">
        <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element -- per-school CDN logo, see PaymentResponseView */}
          <img src={logoUrl || "/images/IS_Final_Logo.webp"} alt={schoolName || "International Schooling"} className="h-11 w-auto" />
        </a>
      </div>
      <div className="flex w-full flex-1 items-center justify-center">
        <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-slate-900/5 sm:p-10">
          {children}
        </div>
      </div>
    </main>
  );
}
