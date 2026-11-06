"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Check, FileText, IdCard, User } from "lucide-react";
import { K5Profile } from "@/components/k5/pages/K5Profile";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useProfileActions } from "@/hooks/useProfileActions";
import { useProfileEditor } from "@/hooks/useProfileEditor";
import { useStudentProfile } from "@/hooks/useStudentProfile";

/**
 * My Profile (P1, read-only) — the signed-in student's own profile from profile-view-content-new
 * (services/profileApi.js -> utils/profileModel.js). K–5 students get the playful page (K5Profile);
 * everyone else a plain read-only page with the same sections. Editing, OTP, uploads and the withdrawal
 * flow follow in P2–P5 (docs/migration/grade_k5_dashboard_plan.html section 19).
 */
export function MyProfile() {
  const router = useRouter();
  const { context, isK5 } = useDashboardContext();
  const { model, profile, studentStandardId, isLoading, error, refetch } = useStudentProfile({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  // P2: personal + parent details are editable on the K–5 page when the backend gives the right to edit.
  const canEdit = Boolean(isK5 && model?.rightToEdit && studentStandardId);
  const editor = useProfileEditor({ profile, studentStandardId, refetch, enabled: canEdit });
  // P3: lists that save at once (class times, calling times, activities, documents).
  const actions = useProfileActions({ studentStandardId, refetch, callingSlots: model?.parents?.callingSlots });
  const [downloading, setDownloading] = useState(false);

  const back = () => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else if (context?.schoolUUID) router.push(`/${context.schoolUUID}/student`);
  };

  // The card is made by the backend for this user only; /api/profile/id-card opens it with the user's token.
  const downloadIdCard = async () => {
    const link = model?.academic?.idCardUrl;
    if (!link || downloading) return;
    let search = "";
    try {
      search = new URL(link).search;
    } catch {
      search = link.includes("?") ? link.slice(link.indexOf("?")) : "";
    }
    setDownloading(true);
    try {
      const response = await fetch(`/api/profile/id-card${search}`, { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message || "The ID card could not be downloaded.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `student-id-card${model.academic.studentId ? `-${model.academic.studentId}` : ""}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      toast.error(e?.message || "The ID card could not be downloaded.");
    } finally {
      setDownloading(false);
    }
  };

  const loading = !context || isLoading;
  if (isK5) {
    return <K5Profile model={model} isLoading={loading} error={error} onRetry={() => refetch()} onBack={back} onDownloadIdCard={downloadIdCard} downloading={downloading} editor={canEdit ? editor : null} actions={canEdit ? actions : null} />;
  }
  return <PlainProfile model={model} isLoading={loading} error={error} onRetry={() => refetch()} onDownloadIdCard={downloadIdCard} downloading={downloading} />;
}

const CARD = "rounded-[10px] border border-slate-200 bg-white p-4";

function Row({ label, value }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <span className="min-h-9 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-black [overflow-wrap:anywhere]">{value || "—"}</span>
    </div>
  );
}

function Grid({ children }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

function Chips({ items }) {
  if (!items.length) return <p className="text-sm text-slate-500">None</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span key={item.label} className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${item.on ? "border-primary bg-primary/10 text-primary" : "border-slate-200 text-slate-500"}`}>
          {item.on && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          {item.label}
        </span>
      ))}
    </div>
  );
}

function Section({ n, title, pct, children, action }) {
  return (
    <section className={CARD}>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-sm font-bold text-primary">{n}</span>
        <h2 className="flex-1 text-base font-semibold text-black">{title}</h2>
        {pct !== null && <span className="text-sm font-semibold text-slate-500">{pct}%</span>}
        {action}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function ParentRows({ title, p }) {
  return (
    <>
      <h3 className="text-sm font-semibold text-black">{title}</h3>
      <Grid>
        <Row label="First Name" value={p.firstName} />
        <Row label="Middle Name" value={p.middleName} />
        <Row label="Last Name" value={p.lastName} />
        <Row label="Phone Number" value={p.phone} />
        <Row label="Email" value={p.email} />
        <Row label="Facebook" value={p.facebook} />
        <Row label="Country" value={p.country} />
        <Row label="State" value={p.state} />
        <Row label="City" value={p.city} />
        <Row label="Occupation" value={p.occupation} />
        <Row label="Date of Birth" value={p.dob} />
      </Grid>
    </>
  );
}

function PlainProfile({ model, isLoading, error, onRetry, onDownloadIdCard, downloading }) {
  if (isLoading) return <div className={`${CARD} text-sm text-slate-500`}>Loading your profile…</div>;
  if (error || !model) {
    return (
      <div className={`${CARD} flex flex-col items-start gap-3`}>
        <p className="text-sm text-red-600">{error?.message?.replace(/^[A-Z_0-9]+:\s*/, "") || "Your profile could not be loaded."}</p>
        <button type="button" onClick={onRetry} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">
          Try again
        </button>
      </div>
    );
  }
  const { header, personal: p, parents: g, academic: a, timing, sports, schoolEmail, sections } = model;
  const pctOf = (key) => sections.find((s) => s.key === key)?.pct ?? null;
  const numberOf = (key) => sections.findIndex((s) => s.key === key) + 1;
  return (
    <div className="flex flex-col gap-4">
      <div className={`${CARD} flex flex-wrap items-center gap-4`}>
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
          {header.initials || <User className="h-7 w-7" aria-hidden="true" />}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold text-black">{header.name || "My Profile"}</h1>
          <p className="text-sm text-slate-500">{["My Profile", header.grade, header.studentId].filter(Boolean).join(" · ")}</p>
          <div className="mt-2 flex max-w-sm items-center gap-2">
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Profile complete" aria-valuenow={model.pct} aria-valuemin={0} aria-valuemax={100}>
              <span className="block h-full rounded-full bg-primary" style={{ width: `${model.pct}%` }} />
            </span>
            <span className="text-sm font-semibold">{model.pct}% complete</span>
          </div>
        </div>
      </div>

      <Section n={numberOf("personal")} title="Personal Information" pct={pctOf("personal")}>
        <Grid>
          <Row label="First Name" value={p.firstName} />
          <Row label="Middle Name" value={p.middleName} />
          <Row label="Last Name" value={p.lastName} />
          <Row label="Gender" value={p.gender} />
          <Row label="Date of Birth" value={p.dob} />
          <Row label="Phone" value={p.phone} />
          <Row label="Alternate Phone" value={p.altPhone} />
          <Row label="Email" value={p.email} />
          <Row label="Alternate Email" value={p.altEmail} />
          <Row label="Country" value={p.country} />
          <Row label="State" value={p.state} />
          <Row label="City" value={p.city} />
          <Row label="Timezone" value={p.timezone} />
          <Row label="Nationality" value={p.nationality} />
          <Row label="Address" value={p.address} />
        </Grid>
        <h3 className="text-sm font-semibold text-black">Hobbies</h3>
        <Chips items={p.hobbies} />
        <h3 className="text-sm font-semibold text-black">Social Media Links</h3>
        <Grid>
          {p.social.map((link) => (
            <Row key={link.label} label={`${link.label} Profile URL`} value={link.url} />
          ))}
        </Grid>
      </Section>

      <Section n={numberOf("parents")} title="Parent/Guardian Information" pct={pctOf("parents")}>
        <ParentRows title="Mother's Detail" p={g.mother} />
        <ParentRows title="Father's Detail" p={g.father} />
        <ParentRows title="Guardian's Details" p={g.guardian} />
        <Grid>
          <Row label="Type of Relation (Primary Parent)" value={g.relation} />
          <Row label="Wedding Anniversary Date" value={g.anniversary} />
          <Row label="Communication Preferred Timing" value={g.callingTimes.join(", ")} />
        </Grid>
        <h3 className="text-sm font-semibold text-black">Communication</h3>
        <Chips items={g.channels} />
      </Section>

      <Section
        n={numberOf("academic")}
        title="Academic Information"
        pct={pctOf("academic")}
        action={
          a.idCardUrl ? (
            <button type="button" onClick={onDownloadIdCard} disabled={downloading} className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
              <IdCard className="h-4 w-4" aria-hidden="true" /> Download Student ID Card
            </button>
          ) : null
        }
      >
        <Grid>
          <Row label="Student ID" value={a.studentId} />
          <Row label="Academic Year Start Date" value={a.academicYearStart} />
          <Row label="Enrollment Date" value={a.enrollmentDate} />
          <Row label="Learning Program" value={a.learningProgram} />
          <Row label="Grade" value={a.grade} />
          <Row label="LMS Platform" value={a.lms} />
          <Row label="Previous/Current School Name" value={a.previousSchool} />
          <Row label="Previous/Current Grade Name" value={a.previousGrade} />
          <Row label="Previous/Current School Graduation Year" value={a.graduationYear} />
          <Row label="Previous/Current School Country" value={a.previousCountry} />
          <Row label="CTI Taken Recommended Grade" value={a.ctiRecommendedGrade} />
        </Grid>
        <h3 className="text-sm font-semibold text-black">Courses</h3>
        <Chips items={a.courses.map((c) => ({ label: c.code ? `${c.name} (${c.code})` : c.name, on: true }))} />
        <h3 className="text-sm font-semibold text-black">Documents</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {a.documents.map((d) => (
            <div key={d.key} className="flex flex-col gap-1">
              <span className="text-xs font-semibold text-slate-500">{d.label}</span>
              {d.url ? (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md border border-primary px-3 py-2 text-sm font-semibold text-primary">
                  <FileText className="h-4 w-4" aria-hidden="true" /> View
                </a>
              ) : (
                <span className="rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500">Not uploaded</span>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section n={numberOf("timing")} title="Live Classes - Preferred Timing" pct={pctOf("timing")}>
        {timing.slots.length ? (
          <Grid>
            {timing.slots.map((slot) => (
              <Row key={slot.id ?? slot.start} label="Start time - End time" value={`${slot.start} - ${slot.end}`} />
            ))}
          </Grid>
        ) : (
          <p className="text-sm text-slate-500">No preferred class time added yet.</p>
        )}
      </Section>

      <Section n={numberOf("sports")} title="Sport & Extra Curriculars" pct={pctOf("sports")}>
        <Row label="Takes part in sport or extracurricular activities" value={sports.participates ? "Yes" : "No"} />
        {sports.joined.length > 0 && (
          <Grid>
            {sports.joined.map((row) => (
              <Row key={row.id ?? row.title} label={row.title || "Activity"} value={[row.start, row.end, row.place].filter(Boolean).join(" · ")} />
            ))}
          </Grid>
        )}
        <h3 className="text-sm font-semibold text-black">Extracurricular activities</h3>
        <Chips items={sports.clubs} />
      </Section>

      <Section n={numberOf("schoolEmail")} title="Student School Email Account" pct={null}>
        {schoolEmail.active ? (
          <Grid>
            <Row label="Email" value={schoolEmail.email} />
          </Grid>
        ) : (
          <p className="text-sm text-slate-500">Your school user ID is not active yet.</p>
        )}
      </Section>
    </div>
  );
}
