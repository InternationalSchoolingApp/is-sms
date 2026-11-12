"use client";

import { useState } from "react";
import { Download, Link2, Plus, Search, ShieldCheck, X } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { certDate, certificateTitle, enrolmentLabel, requestMeta, requestSteps, statusOf } from "@/utils/certificates";
import { K5Loading, K5ListSkeleton, K5CardsSkeleton } from "@/components/k5/K5Skeletons";

const PRIMARY = "inline-flex min-h-[46px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-none bg-k5-ac px-[18px] font-k5-display text-base font-semibold text-white no-underline shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-50";
const SECONDARY = "inline-flex min-h-[46px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-line bg-k5-card px-4 font-k5-display text-base font-semibold text-k5-ink no-underline shadow-[0_4px_0_var(--k5-line)]";
const FIELD = "w-full min-h-[52px] box-border rounded-[14px] border-[3px] border-k5-line bg-k5-card px-3 font-k5-body text-base font-extrabold text-k5-ink";
const LABEL = "flex flex-col gap-1.5 text-[15px] font-black text-k5-mut";
// Status chip colours (mockup PILL), by how far the request is.
const PILL = {
  PENDING: ["#FFF1CC", "#7A4A05"],
  UNDER_REVIEW: ["#E4EEFE", "#1557C9"],
  GENERATING: ["#FFEDD5", "#B35F00"],
  PROCESSING: ["#FFEDD5", "#B35F00"],
  DISPATCHING: ["#FFEDD5", "#B35F00"],
  APPROVED: ["#E4F4EA", "#0E5A31"],
  REJECTED: ["#FDECEE", "#C81E35"],
};

const CapIcon = ({ size, stroke = "var(--k5-pI)" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ stroke }}>
    <path d="M2 9l10-5 10 5-10 5z" />
    <path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5" />
    <path d="M22 9v6" />
  </svg>
);

/** Requested -> Under review -> Generating certificate -> Certificate generated (mockup .cttrack). */
function Track({ status }) {
  const track = requestSteps(status);
  if (!track) return null;
  return (
    <ol aria-label="Progress" className="m-0 grid list-none p-0 pt-1.5" style={{ gridTemplateColumns: `repeat(${track.labels.length}, minmax(0, 1fr))` }}>
      {track.labels.map((label, i) => {
        const done = i < track.current;
        const cur = i === track.current;
        return (
          <li key={label} aria-current={cur ? "step" : undefined} className="relative flex flex-col items-center gap-2 text-center">
            {i > 0 && <span aria-hidden="true" className={`absolute -left-1/2 top-[13px] h-1 w-full rounded-sm ${done || cur ? "bg-k5-ac" : "bg-k5-line"}`} />}
            <span
              className={`k5-ctdot relative z-[1] box-border flex h-[30px] w-[30px] items-center justify-center rounded-full border-[3px] ${done ? "border-k5-ac bg-k5-ac" : cur ? "k5-ctcur border-k5-ac bg-k5-card" : "border-k5-line bg-k5-card"}`}
            >
              {done && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5 9-10" />
                </svg>
              )}
            </span>
            <span className={`text-sm leading-tight max-[760px]:text-xs ${cur ? "font-black text-k5-acx" : done ? "font-extrabold text-k5-ink" : "font-extrabold text-k5-mut"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function Seal() {
  return (
    <svg className="k5-ctseal flex-none" width="58" height="66" viewBox="0 0 58 66" aria-hidden="true">
      <path d="M18 38 L12 64 L21 58 L26 66 L30 42 Z" fill="#E5243B" />
      <path d="M40 38 L46 64 L37 58 L32 66 L28 42 Z" fill="#B81A2E" />
      <circle cx="29" cy="26" r="24" fill="#F2B600" stroke="#C9930A" strokeWidth="3" />
      <circle cx="29" cy="26" r="16" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeDasharray="3 3" />
      <path d="M29 15l3.4 6.9 7.6 1.1-5.5 5.4 1.3 7.6L29 32.4l-6.8 3.6 1.3-7.6-5.5-5.4 7.6-1.1z" fill="#FFFFFF" />
    </svg>
  );
}

function Overlay({ onClose, children, label }) {
  return (
    <div className="fixed inset-0 z-[88] box-border flex items-center justify-center p-4">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 cursor-pointer border-none bg-[rgba(10,16,34,0.55)] p-0" />
      <div role="dialog" aria-modal="true" aria-label={label} className="relative box-border flex max-h-full w-[560px] max-w-full flex-col gap-4 overflow-y-auto rounded-[28px] border-[3px] border-k5-ink bg-k5-card p-[22px] text-k5-ink shadow-[0_8px_0_var(--k5-ink)]">
        {children}
      </div>
    </div>
  );
}

function RequestDialog({ form }) {
  return (
    <Overlay onClose={form.close} label="Request a certificate">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="flex h-[52px] w-[52px] flex-none items-center justify-center rounded-2xl bg-k5-pt">
          <CapIcon size={28} />
        </span>
        <h2 className="m-0 flex-1 font-k5-display text-[26px] font-semibold max-[760px]:text-[22px]">Request a certificate</h2>
        <button type="button" onClick={form.close} aria-label="Close" className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-red bg-k5-red text-white">
          <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
      <label className={LABEL}>
        Certificate you need *
        <select
          value={form.form.typeId}
          onChange={(e) => form.set("typeId", e.target.value)}
          disabled={form.loading || !form.types.length}
          className={`${FIELD} cursor-pointer`}
          style={form.typeError ? { borderColor: "#E5243B" } : undefined}
        >
          <option value="">{form.loading ? "Loading…" : form.optionsError || "Choose..."}</option>
          {form.types.map((t) => (
            <option key={t.id} value={t.id}>{t.typeName}</option>
          ))}
        </select>
      </label>
      {form.typeError && <p className="-mt-2 mb-0 text-sm font-extrabold text-[#C81E35]">Please choose a certificate.</p>}
      {form.type?.askName && (
        <label className={LABEL}>
          Name of the certificate *
          <input value={form.form.otherName} maxLength={150} onChange={(e) => form.set("otherName", e.target.value)} placeholder="e.g. Bonafide Certificate" className={FIELD} />
        </label>
      )}
      {form.enrolments.length > 0 && (
        <label className={LABEL}>
          Grade *
          <select value={form.standardId} onChange={(e) => form.set("standardId", e.target.value)} className={`${FIELD} cursor-pointer`}>
            {form.enrolments.map((e) => (
              <option key={e.studentStandardId} value={e.studentStandardId}>{enrolmentLabel(e)}</option>
            ))}
          </select>
          <span className="text-[13px] font-extrabold">Choose the grade (and year) the certificate should mention.</span>
        </label>
      )}
      <label className={LABEL}>
        Purpose (optional)
        <textarea rows={3} maxLength={500} value={form.form.purpose} onChange={(e) => form.set("purpose", e.target.value)} placeholder="e.g. a visa application" className={`${FIELD} resize-y py-3`} />
      </label>
      <div className="flex flex-wrap justify-end gap-2.5 pt-1">
        <button type="button" onClick={form.close} className={SECONDARY}>Cancel</button>
        <button type="button" disabled={form.sending || !form.types.length} onClick={form.send} className={PRIMARY}>
          {form.sending ? "Sending…" : "Send request"}
        </button>
      </div>
    </Overlay>
  );
}

/**
 * K–5 look of My Certificates (mockup My Certificates): the requests with their progress track, the issued
 * certificates as golden cards, the request form and the "sent" message. Download / Verify / Copy link use
 * the backend's own PDF and public verification links.
 */
export function K5Certificates({ schoolName, requests, certificates, form, sent, onSentClose, onCancel, onCopy }) {
  const [query, setQuery] = useState("");
  usePicoContentReady(!requests.loading && !certificates.loading);
  const q = query.trim().toLowerCase();
  const certs = q
    ? certificates.items.filter((c) => [c.activityTitle, c.activityType, c.templateName, c.certCode].some((v) => String(v || "").toLowerCase().includes(q)))
    : certificates.items;

  return (
    <div className="flex flex-col gap-[18px]">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
        <span className="flex h-[84px] w-[84px] flex-none items-center justify-center rounded-[26px] bg-k5-pt">
          <CapIcon size={48} />
        </span>
        <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
          <h1 className="m-0 font-k5-display text-4xl font-semibold leading-[1.05]">My Certificates</h1>
          <p className="m-0 text-[17px] font-extrabold text-k5-mut">Certificates your school has issued to you. Anyone can check one is genuine with its Certificate ID.</p>
        </div>
        <button type="button" onClick={form.start} className={`${PRIMARY} min-h-[54px] text-lg max-[760px]:w-full max-[760px]:justify-center`}>
          <Plus className="h-5 w-5" strokeWidth={3} aria-hidden="true" /> Request a certificate
        </button>
      </div>

      <section aria-labelledby="k5-ct-req" className="flex flex-col gap-3">
        <h2 id="k5-ct-req" className="m-0 ps-1 font-k5-display text-2xl font-semibold">My requests</h2>
        {requests.loading ? (
          <K5Loading label="Loading your requests" className="">
            <K5ListSkeleton rows={2} card />
          </K5Loading>
        ) : !requests.items.length ? (
          <div className={`${K5_CARD} p-6 text-center font-k5-display text-lg font-semibold text-k5-mut`}>{requests.error || "You have no requests yet."}</div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {requests.items.map((r) => {
              const s = statusOf(r.status);
              const [pbg, pfg] = PILL[r.status] || ["var(--k5-soft)", "var(--k5-mut)"];
              const done = r.status === "APPROVED";
              return (
                <li key={r.id} className={`${K5_CARD} k5-ctreq flex flex-col gap-3.5 px-5 pb-5 pt-4 max-[760px]:px-4`}>
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="m-0 font-k5-display text-[21px] font-semibold">{r.typeName}</h3>
                        <span className="rounded-full px-3 py-[3px] text-[13px] font-black" style={{ background: pbg, color: pfg }}>{s.label}</span>
                      </div>
                      <span className="text-[15px] font-extrabold text-k5-mut">{requestMeta(r)}</span>
                      {r.status === "REJECTED" && r.rejectReason && <span className="text-[15px] font-extrabold text-[#C81E35]">Reason: {r.rejectReason}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 max-[760px]:w-full">
                      {r.status === "PENDING" && (
                        <button type="button" onClick={() => onCancel(r)} className={SECONDARY}>Cancel</button>
                      )}
                      {done &&
                        (r.pdfUrl ? (
                          <a href={r.pdfUrl} target="_blank" rel="noopener noreferrer" className={PRIMARY}>
                            <Download className="h-[18px] w-[18px]" strokeWidth={2.8} aria-hidden="true" /> Download
                          </a>
                        ) : (
                          <span className="self-center text-[15px] font-extrabold text-k5-mut">PDF being prepared</span>
                        ))}
                      {done && r.verifyUrl && (
                        <a href={r.verifyUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                          <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Verify
                        </a>
                      )}
                    </div>
                  </div>
                  <Track status={r.status} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section aria-labelledby="k5-ct-my" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="k5-ct-my" className="m-0 ps-1 font-k5-display text-2xl font-semibold">My certificates</h2>
          {certificates.items.length > 6 && (
            <label className="flex min-h-[50px] min-w-0 flex-[0_1_340px] items-center gap-2.5 rounded-full border-[3px] border-k5-line bg-k5-soft px-4 max-[760px]:flex-[1_1_100%]">
              <Search className="h-5 w-5 flex-none text-k5-mut" strokeWidth={3} aria-hidden="true" />
              <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search certificates…" aria-label="Search certificates…" className="min-w-0 flex-1 border-none bg-transparent text-base font-extrabold text-k5-ink outline-none" />
            </label>
          )}
        </div>
        {certificates.loading ? (
          <K5Loading label="Loading your certificates" className="">
            <K5CardsSkeleton count={3} />
          </K5Loading>
        ) : certificates.error ? (
          <div className={`${K5_CARD} p-6 text-center font-k5-display text-lg font-semibold text-[#C81E35]`}>{certificates.error}</div>
        ) : !certs.length ? (
          <div className={`${K5_CARD} p-6 text-center font-k5-display text-lg font-semibold text-k5-mut`}>
            {q ? "No certificate matches your search." : "You don't have any certificates yet. When your school issues you one, it will appear here."}
          </div>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4 p-0 max-[760px]:grid-cols-1">
            {certs.map((c) => {
              const ready = c.pdfStatus === "READY" && c.pdfUrl;
              return (
                <li key={c.certCode} className="k5-ctcert relative rounded-[26px] p-2.5 shadow-[0_6px_0_#C9930A]" style={{ background: "linear-gradient(135deg, #FFE7A3, #F2C14E 45%, #FFE7A3)" }}>
                  <div className="box-border flex h-full flex-col gap-2.5 rounded-[18px] border-2 border-dashed border-[#D9A73A] bg-[#FFFBEE] px-[18px] pb-4 pt-[18px] text-[#3A2A00]">
                    <div className="flex items-center gap-3">
                      <Seal />
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {schoolName && <span className="text-xs font-black uppercase tracking-[0.08em] text-[#8A5A00]">{schoolName}</span>}
                        <h3 className="m-0 font-k5-display text-[22px] font-semibold leading-[1.15]">{certificateTitle(c)}</h3>
                      </div>
                    </div>
                    <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[15px]">
                      <dt className="font-extrabold text-[#8A5A00]">Awarded to</dt>
                      <dd className="m-0 font-black [overflow-wrap:anywhere]">{c.recipientName}</dd>
                      <dt className="font-extrabold text-[#8A5A00]">Issued</dt>
                      <dd className="m-0 font-black">{certDate(c.issueDate)}</dd>
                      <dt className="font-extrabold text-[#8A5A00]">Certificate ID</dt>
                      <dd className="m-0">
                        <span className="rounded-lg bg-[#FFF1CC] px-2.5 py-0.5 font-mono text-sm font-extrabold [overflow-wrap:anywhere]">{c.certCode}</span>
                      </dd>
                    </dl>
                    {!ready && <p className="m-0 text-sm font-extrabold text-[#8A5A00]">Your PDF is being prepared. Please check back in a few minutes.</p>}
                    <div className="mt-1 flex flex-wrap gap-2">
                      {ready && (
                        <a href={c.pdfUrl} target="_blank" rel="noopener noreferrer" className={PRIMARY}>
                          <Download className="h-[18px] w-[18px]" strokeWidth={2.8} aria-hidden="true" /> Download PDF
                        </a>
                      )}
                      <a href={c.verifyUrl} target="_blank" rel="noopener noreferrer" className={SECONDARY}>
                        <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Verify
                      </a>
                      <button type="button" onClick={() => onCopy(c.verifyUrl)} className={SECONDARY}>
                        <Link2 className="h-[18px] w-[18px]" strokeWidth={2.6} aria-hidden="true" /> Copy link
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {form.open && <RequestDialog form={form} />}
      {sent && (
        <Overlay onClose={onSentClose} label="Request sent">
          <div className="flex flex-col items-center gap-3 px-1 py-2 text-center">
            <span aria-hidden="true" className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-[#13C37A] shadow-[0_6px_0_#0E8F59]">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5L19 7" />
              </svg>
            </span>
            <p className="m-0 font-k5-display text-[22px] font-semibold leading-[1.35] text-[#0E5A31]">Your request has been sent to the school. You will see it here once it is approved.</p>
            <button type="button" onClick={onSentClose} className={`${PRIMARY} mt-1`}>Done</button>
          </div>
        </Overlay>
      )}
    </div>
  );
}
