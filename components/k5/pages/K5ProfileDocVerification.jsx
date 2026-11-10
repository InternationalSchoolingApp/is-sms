"use client";

import { useState, useEffect } from "react";
import { Check, X, Eye, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { loadDocumentVerification } from "@/services/profileActionsApi";
import { callServer } from "@/utils/serverCall";

function Badge({ ok, children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border-2 px-2.5 py-0.5 text-[13px] font-black ${ok ? "border-k5-ac bg-k5-act text-k5-acx" : "border-k5-ri bg-red-50 text-k5-ri"}`}
    >
      {ok ? <Check className="h-3.5 w-3.5" strokeWidth={3.4} /> : <X className="h-3.5 w-3.5" strokeWidth={3.4} />}
      {children}
    </span>
  );
}

function StatusBar({ status }) {
  if (!status) return null;
  const { submittedCount = 0, verifiedCount = 0, skippedCount = 0, unverifiedRequiredCount = 0 } = status;
  if (!submittedCount) return null;
  const allVerified = unverifiedRequiredCount === 0;
  return (
    <div
      className={`flex flex-wrap items-center gap-3 rounded-2xl border-[3px] px-4 py-3 text-sm font-black ${allVerified ? "border-k5-ac bg-k5-act text-k5-acx" : "border-amber-400 bg-amber-50 text-amber-700"}`}
    >
      {allVerified ? (
        <ShieldCheck className="h-5 w-5 flex-none" />
      ) : (
        <AlertCircle className="h-5 w-5 flex-none" />
      )}
      <span>
        {verifiedCount} of {submittedCount} document{submittedCount !== 1 ? "s" : ""} verified
        {skippedCount > 0 && <span className="text-k5-mut"> ({skippedCount} skipped)</span>}
        {unverifiedRequiredCount > 0 && <span className="text-k5-ri"> &middot; {unverifiedRequiredCount} pending</span>}
      </span>
    </div>
  );
}

export function DocumentVerification() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    callServer(() => loadDocumentVerification())
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "Could not load document verification.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-base font-extrabold text-k5-mut">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading verification status...
      </div>
    );
  }

  if (error) {
    return <p className="m-0 text-base font-extrabold text-k5-ri">{error}</p>;
  }

  if (!data?.documents?.length) {
    return <p className="m-0 text-base font-extrabold text-k5-mut">No enrollment documents found.</p>;
  }

  const { documents, status } = data;

  return (
    <div className="flex flex-col gap-3.5">
      <StatusBar status={status} />
      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-2xl border-[3px] border-k5-line md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-[3px] border-k5-line bg-k5-soft text-left font-black text-k5-mut">
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Grade</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Remark</th>
              <th className="px-4 py-3 text-center">View</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => {
              const verified = String(doc.isDocumentVerified).toUpperCase() === "Y";
              const skipped = String(doc.isVerificationRequired).toUpperCase() === "N";
              return (
                <tr key={doc.id} className="border-b border-k5-line last:border-b-0">
                  <td className="px-4 py-3 font-extrabold text-k5-ink">{doc.fileOriginalName || doc.documentName || "—"}</td>
                  <td className="px-4 py-3 text-k5-ink">{doc.standardName || "—"}</td>
                  <td className="px-4 py-3 text-k5-ink">{doc.submittedDate || "—"}</td>
                  <td className="px-4 py-3">
                    {skipped ? (
                      <span className="text-k5-mut font-black text-xs">Skipped</span>
                    ) : (
                      <Badge ok={verified}>{verified ? "Yes" : "No"}</Badge>
                    )}
                  </td>
                  <td className="max-w-[220px] truncate px-4 py-3 text-k5-ink" title={doc.verificationRemark || ""}>
                    {doc.verificationRemark || "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {doc.fileUrl ? (
                      <a
                        href={doc.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-full border-2 border-k5-ac bg-k5-act px-3 py-1 text-[13px] font-black text-k5-acx no-underline"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </a>
                    ) : (
                      <span className="text-k5-mut">{"—"}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* Mobile cards */}
      <div className="flex flex-col gap-3 md:hidden">
        {documents.map((doc) => {
          const verified = String(doc.isDocumentVerified).toUpperCase() === "Y";
          const skipped = String(doc.isVerificationRequired).toUpperCase() === "N";
          return (
            <div key={doc.id} className="flex flex-col gap-2 rounded-2xl border-[3px] border-k5-line bg-k5-card p-4">
              <div className="flex items-start justify-between gap-2">
                <span className="text-base font-extrabold text-k5-ink">{doc.fileOriginalName || doc.documentName || "—"}</span>
                {skipped ? (
                  <span className="text-k5-mut font-black text-xs">Skipped</span>
                ) : (
                  <Badge ok={verified}>{verified ? "Yes" : "No"}</Badge>
                )}
              </div>
              {doc.standardName && (
                <div className="text-sm text-k5-mut"><span className="font-black">Grade:</span> {doc.standardName}</div>
              )}
              {doc.submittedDate && (
                <div className="text-sm text-k5-mut"><span className="font-black">Submitted:</span> {doc.submittedDate}</div>
              )}
              {doc.verificationRemark && (
                <div className="text-sm text-k5-mut"><span className="font-black">Remark:</span> {doc.verificationRemark}</div>
              )}
              {doc.fileUrl && (
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex w-fit items-center gap-1 rounded-full border-2 border-k5-ac bg-k5-act px-3 py-1 text-[13px] font-black text-k5-acx no-underline"
                >
                  <Eye className="h-3.5 w-3.5" />
                  View Document
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
