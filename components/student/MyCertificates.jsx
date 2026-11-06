"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Award, Download, Plus, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { K5Certificates } from "@/components/k5/pages/K5Certificates";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import {
  cancelMyCertificateRequest,
  createMyCertificateRequest,
  getMyCertificateRequestOptions,
  getMyCertificateRequests,
  getMyCertificates,
} from "@/services/certificateApi";
import { certDate, certificateTitle, copyVerifyLink, enrolmentLabel, isCertificateOk, requestMeta, statusOf } from "@/utils/certificates";

const LIST_KEY = (userId) => ["my-certificates", userId];
const REQUESTS_KEY = (userId) => ["my-certificate-requests", userId];

function listResult(query, fallback) {
  if (query.isLoading) return { loading: true, items: [], error: "" };
  const r = query.data;
  if (!isCertificateOk(r)) return { loading: false, items: [], error: r?.message || fallback };
  return { loading: false, items: Array.isArray(r.details) ? r.details : [], error: "" };
}

/**
 * The "Request a certificate" form (legacy mcrRequestModalHtml): certificate type, its name when the type
 * asks for one, the grade (enrolment, current first) and an optional purpose.
 */
function useRequestForm({ onSent }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ typeId: "", otherName: "", standardId: "", purpose: "" });
  const [typeError, setTypeError] = useState(false);
  const [sending, setSending] = useState(false);
  const optionsQuery = useQuery({
    queryKey: ["my-certificate-request-options"],
    queryFn: getMyCertificateRequestOptions,
    enabled: open,
    staleTime: 0,
  });
  const ok = isCertificateOk(optionsQuery.data);
  const types = ok ? optionsQuery.data.details?.types ?? [] : [];
  const enrolments = ok ? optionsQuery.data.details?.enrolments ?? [] : [];
  const type = types.find((t) => String(t.id) === String(form.typeId));
  // The current enrolment is chosen unless the student picks another one.
  const standardId = form.standardId || String((enrolments.find((e) => e.current) || enrolments[0])?.studentStandardId ?? "");
  const optionsError = optionsQuery.isLoading ? "" : !optionsQuery.data ? "Could not load the options." : !ok ? optionsQuery.data.message || "Could not load the options." : !types.length ? "Your school is not taking requests right now." : "";

  function start() {
    setForm({ typeId: "", otherName: "", standardId: "", purpose: "" });
    setTypeError(false);
    setOpen(true);
  }

  async function send() {
    if (sending) return;
    if (!type) {
      setTypeError(true);
      toast.error("Please choose the certificate you need.");
      return;
    }
    if (type.askName && !form.otherName.trim()) {
      toast.error("Please enter the name of the certificate you need.");
      return;
    }
    if (enrolments.length && !standardId) {
      toast.error("Please choose the grade.");
      return;
    }
    setSending(true);
    try {
      const response = await createMyCertificateRequest({
        requestTypeId: type.id,
        otherName: type.askName ? form.otherName.trim() : null,
        studentStandardId: enrolments.length ? standardId : null,
        purpose: form.purpose.trim(),
      });
      if (isCertificateOk(response)) {
        setOpen(false);
        onSent();
      } else {
        toast.error(response?.message || "Could not send the request. Please try again.");
      }
    } finally {
      setSending(false);
    }
  }

  return {
    open,
    start,
    close: () => setOpen(false),
    loading: optionsQuery.isLoading,
    optionsError,
    types,
    enrolments,
    type,
    form,
    standardId,
    typeError,
    sending,
    set: (field, value) => {
      setForm((f) => ({ ...f, [field]: value }));
      if (field === "typeId") setTypeError(false);
    },
    send,
  };
}

/** Plain look (other grades): the same data, actions and form as the K–5 view. */
function PlainCertificates({ requests, certificates, form, onCancel, onCopy }) {
  return (
    <div className="mx-auto w-full space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2">
          <Award className="h-5 w-5 text-primary" aria-hidden="true" />
          <h1 className="text-lg font-extrabold text-black sm:text-xl">My Certificates</h1>
        </div>
        <button type="button" onClick={form.start} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white">
          <Plus className="h-4 w-4" aria-hidden="true" /> Request a certificate
        </button>
      </div>
      <p className="px-1 text-sm text-black/70">Certificates your school has issued to you. Anyone can check one is genuine with its Certificate ID.</p>

      {requests.items.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 font-bold text-black">My requests</h2>
          <ul className="divide-y divide-slate-100">
            {requests.items.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <div className="font-semibold text-black">
                    {r.typeName} <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{statusOf(r.status).label}</span>
                  </div>
                  <div className="text-xs text-slate-500">{requestMeta(r)}</div>
                  {r.status === "REJECTED" && r.rejectReason && <div className="text-xs text-red-600">Reason: {r.rejectReason}</div>}
                </div>
                <div className="flex gap-2">
                  {r.status === "PENDING" && (
                    <button type="button" onClick={() => onCancel(r)} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Cancel</button>
                  )}
                  {r.status === "APPROVED" && r.pdfUrl && (
                    <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">Download</a>
                  )}
                  {r.status === "APPROVED" && r.verifyUrl && (
                    <a href={r.verifyUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold">Verify</a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="mb-3 font-bold text-black">My certificates</h2>
        {certificates.loading ? (
          <p className="py-6 text-center text-black/50">Loading…</p>
        ) : certificates.error ? (
          <p className="py-6 text-center text-red-600">{certificates.error}</p>
        ) : !certificates.items.length ? (
          <p className="py-6 text-center text-black/60">You don&apos;t have any certificates yet. When your school issues you one, it will appear here.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {certificates.items.map((c) => (
              <li key={c.certCode} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-black">
                <div className="font-bold">{certificateTitle(c)}</div>
                <div>Awarded to {c.recipientName}</div>
                <div>Issued {certDate(c.issueDate)}</div>
                <div className="font-mono text-xs">Certificate ID: {c.certCode}</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {c.pdfStatus === "READY" && c.pdfUrl ? (
                    <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 font-semibold text-white">
                      <Download className="h-4 w-4" aria-hidden="true" /> Download PDF
                    </a>
                  ) : (
                    <span className="text-xs text-slate-500">Your PDF is being prepared. Please check back in a few minutes.</span>
                  )}
                  <a href={c.verifyUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 font-semibold">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> Verify
                  </a>
                  <button type="button" onClick={() => onCopy(c.verifyUrl)} className="rounded-lg border border-slate-300 px-3 py-1.5 font-semibold">Copy link</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={form.open} onOpenChange={(open) => !open && form.close()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Request a certificate</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-black">
            <label className="block">
              Certificate you need *
              <select value={form.form.typeId} onChange={(e) => form.set("typeId", e.target.value)} disabled={form.loading || !form.types.length} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2">
                <option value="">{form.loading ? "Loading…" : form.optionsError || "Choose…"}</option>
                {form.types.map((t) => (
                  <option key={t.id} value={t.id}>{t.typeName}</option>
                ))}
              </select>
            </label>
            {form.type?.askName && (
              <label className="block">
                Name of the certificate *
                <input value={form.form.otherName} maxLength={150} onChange={(e) => form.set("otherName", e.target.value)} placeholder="e.g. Bonafide Certificate" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2" />
              </label>
            )}
            {form.enrolments.length > 0 && (
              <label className="block">
                Grade *
                <select value={form.standardId} onChange={(e) => form.set("standardId", e.target.value)} className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2">
                  {form.enrolments.map((e) => (
                    <option key={e.studentStandardId} value={e.studentStandardId}>{enrolmentLabel(e)}</option>
                  ))}
                </select>
              </label>
            )}
            <label className="block">
              Purpose (optional)
              <textarea rows={3} maxLength={500} value={form.form.purpose} onChange={(e) => form.set("purpose", e.target.value)} placeholder="e.g. a visa application" className="mt-1 w-full rounded-md border border-slate-300 px-2 py-2" />
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={form.close} className="rounded-lg border border-slate-300 px-4 py-2 font-semibold">Cancel</button>
              <button type="button" disabled={form.sending || !form.types.length} onClick={form.send} className="rounded-lg bg-primary px-4 py-2 font-semibold text-white disabled:opacity-50">
                {form.sending ? "Sending…" : "Send request"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * My Certificates (sidebar pageLink my-certificates) — legacy myCertificates.js + myCertificatesContent.js:
 * the student's certificate requests with their progress, the certificates issued to them (PDF, public
 * verification page, copy link) and the "Request a certificate" form.
 */
export function MyCertificates() {
  const { context, isK5 } = useDashboardContext();
  const userId = context?.userId;
  const queryClient = useQueryClient();
  const [sent, setSent] = useState(false);
  const listQuery = useQuery({ queryKey: LIST_KEY(userId), queryFn: getMyCertificates, enabled: Boolean(userId), staleTime: 0 });
  const requestsQuery = useQuery({ queryKey: REQUESTS_KEY(userId), queryFn: getMyCertificateRequests, enabled: Boolean(userId), staleTime: 0 });
  const certificates = !context ? { loading: true, items: [], error: "" } : listResult(listQuery, "Could not load your certificates. Please try again.");
  const requests = !context ? { loading: true, items: [], error: "" } : listResult(requestsQuery, "");

  const reloadRequests = () => queryClient.invalidateQueries({ queryKey: REQUESTS_KEY(userId) });
  const form = useRequestForm({
    onSent: () => {
      reloadRequests();
      if (isK5) setSent(true);
      else toast.success("Your request has been sent to the school. You will see it here once it is approved.");
    },
  });

  async function cancelRequest(request) {
    if (!window.confirm("Cancel this request?")) return;
    const response = await cancelMyCertificateRequest({ requestId: request.id });
    if (isCertificateOk(response)) toast.success("Request cancelled");
    else toast.error(response?.message || "Could not cancel the request.");
    reloadRequests();
  }

  async function copyLink(url) {
    if (await copyVerifyLink(url)) toast.success("Verification link copied");
  }

  if (isK5) {
    return (
      <K5Certificates
        schoolName={context?.schoolName}
        requests={requests}
        certificates={certificates}
        form={form}
        sent={sent}
        onSentClose={() => setSent(false)}
        onCancel={cancelRequest}
        onCopy={copyLink}
      />
    );
  }
  return <PlainCertificates requests={requests} certificates={certificates} form={form} onCancel={cancelRequest} onCopy={copyLink} />;
}
