"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, Eye, EyeOff, FileText, IdCard, Info, Save } from "lucide-react";
import toast from "react-hot-toast";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { ConfirmDialog, EditableParents, EditablePersonal } from "@/components/k5/pages/K5ProfileEditors";
import { K5PhotoDialog } from "@/components/k5/pages/K5PhotoDialog";
import { SchoolEmailEditor, WithdrawalEditor } from "@/components/k5/pages/K5ProfileP5";
import { CustomFields } from "@/components/k5/pages/K5ProfileCustomFields";
import { EditableDocuments } from "@/components/k5/pages/K5ProfileDocs";
import { DocumentVerification } from "@/components/k5/pages/K5ProfileDocVerification";
import { EditablePreviousSchool, EditableSports, EditableTiming, ProgressReportPicker } from "@/components/k5/pages/K5ProfileEditorsP3";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { subjectStyle } from "@/utils/k5Calendar";

// Base + one colour set each (two bg-/border- utilities on one element would fight).
const BTN_BASE =
  "flex min-h-12 cursor-pointer items-center gap-2 rounded-full border-[3px] px-[18px] font-k5-display text-[17px] font-semibold disabled:cursor-default disabled:opacity-45";
const PILL_BTN = `${BTN_BASE} border-k5-line bg-k5-card text-k5-ink shadow-[0_4px_0_var(--k5-line)]`;
const ACCENT_PILL_BTN = `${BTN_BASE} border-k5-ac bg-k5-ac text-white shadow-[0_4px_0_var(--k5-acd)]`;
const SMALL_BTN =
  "inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-none px-[18px] font-k5-display text-base font-semibold text-white no-underline disabled:cursor-default disabled:opacity-50";
const GREEN_BTN = `${SMALL_BTN} bg-[#13803F] shadow-[0_4px_0_#0B5A2B]`;
const ACCENT_BTN = `${SMALL_BTN} bg-k5-ac shadow-[0_4px_0_var(--k5-acd)]`;
// Mockup .pfg3 / .pfg2: 3 (2 on laptops) and 2 columns, one column on phones.
const GRID3 = "grid grid-cols-3 gap-x-4 gap-y-3.5 max-[1180px]:grid-cols-2 max-[600px]:grid-cols-1";
const GRID2 = "grid grid-cols-2 gap-x-4 gap-y-3.5 max-[600px]:grid-cols-1";
const H3 = "m-0 font-k5-display text-xl font-semibold text-k5-ink";
const HR = <hr className="my-1 h-[3px] rounded-[3px] border-none bg-k5-line" />;

/** One read-only value (mockup .pfl + .pfin.pfro). */
function Field({ label, value, mono, children, wide, floating = false }) {
  const empty = !children && !value;
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 text-sm font-black text-k5-mut ${wide ? "col-span-full" : ""}`}>
      {!floating && <span>{label}</span>}
      <span
        className={`${floating ? "relative" : ""} flex min-h-[50px] items-center gap-2 rounded-[14px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 text-base font-extrabold [overflow-wrap:anywhere] ${empty ? "text-k5-mut" : "text-k5-ink"} ${mono ? "font-mono" : "font-k5-body"}`}
      >
        {floating && <span className="pointer-events-none absolute start-3 top-0 -translate-y-1/2 bg-k5-soft px-1 text-xs font-black text-k5-ac">{label}</span>}
        {children || value || "—"}
      </span>
    </div>
  );
}

/** "Verified" (accent, mockup .pfverd) / "WhatsApp" / "Emergency" marks under a value. */
function Mark({ children }) {
  return (
    <span className="inline-flex min-h-7 items-center gap-1 rounded-full border-2 border-k5-ac bg-k5-act px-2.5 text-[13px] font-black text-k5-acx">
      <Check className="h-3.5 w-3.5" strokeWidth={3.4} aria-hidden="true" />
      {children}
    </span>
  );
}

function ValueWithMarks({ label, value, marks, floating = false }) {
  const shown = marks.filter(([on]) => on);
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Field label={label} value={value} floating={floating} />
      {value && shown.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {shown.map(([, text]) => (
            <Mark key={text}>{text}</Mark>
          ))}
        </div>
      )}
    </div>
  );
}

/** Read-only chip (mockup .pfchip): chosen ones in the look's accent. */
function Chip({ on, children }) {
  return (
    <span
      className={`flex min-h-11 items-center gap-2 rounded-full border-[3px] py-1 pe-4 ps-3 text-[15px] font-black text-k5-ink ${on ? "border-k5-ac bg-k5-act" : "border-k5-line bg-k5-card"}`}
    >
      <span
        aria-hidden="true"
        className={`flex h-5 w-5 flex-none items-center justify-center rounded-md border-2 ${on ? "border-k5-ac bg-k5-ac text-white" : "border-k5-line bg-k5-card"}`}
      >
        {on && <Check className="h-3.5 w-3.5" strokeWidth={3.6} />}
      </span>
      <span className="sr-only">{on ? "Yes: " : "No: "}</span>
      {children}
    </span>
  );
}

function Note({ children }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-[18px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-[15px] font-extrabold leading-[1.45] text-k5-ink">
      <span aria-hidden="true" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full bg-[#FFC531] font-k5-display text-lg font-bold text-[#3A2A00]">
        i
      </span>
      <span className="min-w-0 pt-0.5">{children}</span>
    </div>
  );
}

/** Mockup nav ring: accent when mostly done, yellow when started, grey when empty. */
function Ring({ pct }) {
  const C = 2 * Math.PI * 15;
  const color = pct >= 70 ? "var(--k5-ac)" : pct > 0 ? "#E8A200" : "var(--k5-line)";
  return (
    <span className="relative block h-10 w-10 flex-none" aria-hidden="true">
      <svg width="40" height="40" viewBox="0 0 40 40" className="block -rotate-90">
        <circle cx="20" cy="20" r="15" fill="none" strokeWidth="5" style={{ stroke: "var(--k5-line)" }} />
        <circle
          cx="20"
          cy="20"
          r="15"
          fill="none"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${((C * pct) / 100).toFixed(1)} ${C.toFixed(1)}`}
          style={{ stroke: color, transition: "stroke-dasharray .4s" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black tracking-[-0.02em]">{pct}%</span>
    </span>
  );
}

function ParentBlock({ title, p }) {
  return (
    <>
      <h3 className={H3}>{title}</h3>
      <div className={GRID3}>
        <Field label="First Name" value={p.firstName} floating />
        <Field label="Middle Name" value={p.middleName} floating />
        <Field label="Last Name" value={p.lastName} floating />
        <ValueWithMarks label="Phone Number" value={p.phone} marks={[[p.whatsApp, "WhatsApp"], [p.emergency, "Emergency Contact"]]} floating />
        <Field label="Email" value={p.email} floating />
        <Field label="Facebook" value={p.facebook} floating />
        <Field label="Country" value={p.country} floating />
        <Field label="State" value={p.state} floating />
        <Field label="City" value={p.city} floating />
        <Field label="Occupation" value={p.occupation} floating />
        <Field label="Date of Birth" value={p.dob} floating />
      </div>
    </>
  );
}

function PersonalSection({ m }) {
  const p = m.personal;
  return (
    <>
      <div className={GRID3}>
        <Field label="First Name" value={p.firstName} />
        <Field label="Middle Name" value={p.middleName} />
        <Field label="Last Name" value={p.lastName} />
        <Field label="Gender" value={p.gender} />
        <Field label="Date of Birth" value={p.dob} floating />
        <ValueWithMarks label="Phone" value={p.phone} marks={[[p.phoneWhatsApp, "WhatsApp"], [p.phoneVerified, "Verified"]]} />
        <ValueWithMarks label="Alternate Phone" value={p.altPhone} marks={[[p.altPhoneWhatsApp, "WhatsApp"]]} />
        <ValueWithMarks label="Email" value={p.email} marks={[[p.emailVerified, "Verified"]]} />
        <ValueWithMarks label="Alternate Email" value={p.altEmail} marks={[[p.altEmailVerified, "Verified"]]} />
        <Field label="Country" value={p.country} />
        <Field label="State" value={p.state} />
        <Field label="City" value={p.city} />
        <Field label="Timezone" value={p.timezone} />
        <Field label="Nationality" value={p.nationality} />
      </div>
      <Field label="Address" value={p.address} />
      {HR}
      <h3 className={H3}>Hobbies</h3>
      {p.hobbies.length ? (
        <div className="flex flex-wrap gap-2.5">
          {p.hobbies.map((h) => (
            <Chip key={h.label} on={h.on}>
              {h.label}
            </Chip>
          ))}
        </div>
      ) : (
        <p className="m-0 text-base font-extrabold text-k5-mut">No hobbies added yet.</p>
      )}
      {HR}
      <h3 className={H3}>Social Media Links</h3>
      <div className={GRID2}>
        {p.social.map((link) => (
          <Field key={link.label} label={`${link.label} Profile URL`}>
            {link.url ? (
              <a href={/^https?:\/\//i.test(link.url) ? link.url : `https://${link.url}`} target="_blank" rel="noopener noreferrer" className="text-k5-acx underline">
                {link.url}
              </a>
            ) : null}
          </Field>
        ))}
      </div>
    </>
  );
}

function ParentsSection({ m }) {
  const g = m.parents;
  return (
    <>
      <ParentBlock title="Mother's Detail" p={g.mother} />
      {HR}
      <ParentBlock title="Father's Detail" p={g.father} />
      {HR}
      <ParentBlock title="Guardian's Details" p={g.guardian} />
      {HR}
      <div className={GRID3}>
        <Field label="Type of Relation (Primary Parent)" value={g.relation} floating />
        <Field label="Wedding Anniversary Date" value={g.anniversary} floating />
      </div>
      <h3 className={H3}>Communication</h3>
      <div className="flex flex-wrap gap-2.5">
        {g.channels.map((c) => (
          <Chip key={c.label} on={c.on}>
            {c.label}
          </Chip>
        ))}
      </div>
      {HR}
      <h3 className={H3}>Communication Preferred Timing</h3>
      {g.callingTimes.length ? (
        <div className="flex flex-wrap gap-2.5">
          {g.callingTimes.map((slot) => (
            <span key={slot} className="rounded-full border-[3px] border-k5-line bg-k5-soft px-4 py-2 text-[15px] font-black">
              {slot}
            </span>
          ))}
        </div>
      ) : (
        <p className="m-0 text-base font-extrabold text-k5-mut">No preferred timing added yet.</p>
      )}
    </>
  );
}

function AcademicSection({ m, editor, actions }) {
  const a = m.academic;
  return (
    <>
      <div className={GRID3}>
        <Field label="Student ID" value={a.studentId} mono />
        <Field label="Academic Year Start Date" value={a.academicYearStart} />
        <Field label="Enrollment Date" value={a.enrollmentDate} />
        <Field label="Learning Program" value={a.learningProgram} />
        <Field label="Grade" value={a.grade} />
        <Field label="LMS Platform" value={a.lms} />
      </div>
      <h3 className={H3}>{a.grade ? `Courses (${a.grade})` : "Courses"}</h3>
      <div className="flex flex-wrap gap-2.5">
        {a.courses.map((c) => {
          const s = subjectStyle(c.name);
          return (
            <span key={`${c.name}-${c.code}`} className={`flex min-h-10 items-center gap-2 rounded-full border-[3px] px-3.5 py-1 text-[15px] font-black text-k5-ink ${s.tile}`} style={{ borderColor: s.color }}>
              <span aria-hidden="true" className="h-3 w-3 flex-none rounded-full" style={{ background: s.color }} />
              {c.name}
              {c.code && <span className="font-extrabold text-k5-mut">({c.code})</span>}
            </span>
          );
        })}
      </div>
      {HR}
      {editor ? (
        <EditablePreviousSchool m={m} editor={editor} />
      ) : (
        <div className={GRID3}>
          <Field label="Previous/Current School Name" value={a.previousSchool} />
          <Field label="Previous/Current Grade Name" value={a.previousGrade} />
          <Field label="Previous/Current School Graduation Year" value={a.graduationYear} />
          <Field label="Previous/Current School Country" value={a.previousCountry} />
          <Field label="CTI Taken Recommended Grade" value={a.ctiRecommendedGrade} />
        </div>
      )}
      {HR}
      <h3 className={H3}>Documents</h3>
      {!a.documents.some((d) => d.url) && <Note>No submitted documents found for verification.</Note>}
      {actions ? (
        <EditableDocuments m={m} actions={actions} />
      ) : (
      <div className="grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
        {a.documents.map((d) => (
          <div key={d.key} className="flex flex-col gap-1.5 text-sm font-black text-k5-mut">
            <span>{d.label}</span>
            {d.url ? (
              <a
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[50px] items-center justify-center gap-2 rounded-[14px] border-[3px] border-k5-ac bg-k5-act px-3 text-base font-black text-k5-acx no-underline"
              >
                <FileText className="h-5 w-5 flex-none" aria-hidden="true" />
                View
                <span className="sr-only"> {d.label}</span>
              </a>
            ) : (
              <span className="flex min-h-[50px] items-center justify-center rounded-[14px] border-[3px] border-dashed border-k5-line bg-k5-soft px-3 text-base font-extrabold text-k5-mut">
                Not uploaded
              </span>
            )}
          </div>
        ))}
      </div>
      )}
      {HR}
      <h3 className={H3}>Document Verification</h3>
      <DocumentVerification />
      {editor && (
        <>
          {HR}
          <ProgressReportPicker editor={editor} />
        </>
      )}
    </>
  );
}

function TimingSection({ m }) {
  if (!m.timing.slots.length) return <p className="m-0 text-base font-extrabold text-k5-mut">No preferred class time added yet.</p>;
  return (
    <div className="flex flex-col gap-3.5">
      {m.timing.slots.map((slot) => (
        <div key={slot.id ?? `${slot.start}-${slot.end}`} className={GRID3}>
          <Field label="Start time" value={slot.start} />
          <Field label="End time" value={slot.end} />
        </div>
      ))}
    </div>
  );
}

function SportsSection({ m }) {
  const s = m.sports;
  return (
    <>
      <p className="m-0 text-[17px] font-extrabold">Do you take part in any sport or extracurricular activities?</p>
      <span
        className={`self-start rounded-full border-[3px] px-4 py-1.5 font-k5-display text-[17px] font-semibold ${s.participates ? "border-k5-ac bg-k5-act text-k5-acx" : "border-k5-line bg-k5-soft text-k5-mut"}`}
      >
        {s.participates ? "Yes" : "No"}
      </span>
      {s.joined.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {s.joined.map((row) => (
            <div key={row.id ?? row.title} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[18px] border-[3px] border-k5-line bg-k5-card px-4 py-3 text-[15px] font-extrabold">
              <strong className="font-k5-display text-[17px] font-semibold">{row.title || "Activity"}</strong>
              {(row.start || row.end) && <span className="text-k5-mut">{[row.start, row.end].filter(Boolean).join(" – ")}</span>}
              {row.place && <span className="text-k5-mut">{row.place}</span>}
            </div>
          ))}
        </div>
      )}
      {HR}
      <h3 className={H3}>Would you like to join any extracurricular activities?</h3>
      <div className="flex flex-wrap gap-2.5">
        {s.clubs.map((c) => (
          <Chip key={c.id ?? c.label} on={c.on}>
            {c.label}
          </Chip>
        ))}
      </div>
    </>
  );
}

function SchoolEmailSection({ m }) {
  const e = m.schoolEmail;
  const [show, setShow] = useState(false);
  if (!e.active) {
    return <Note>Your school user ID is not active yet. You will be able to activate it from here soon.</Note>;
  }
  return (
    <div className={GRID2}>
      <Field label="Email" value={e.email} />
      <Field label="Password">
        {e.password ? (
          <>
            <span className="min-w-0 flex-1 font-mono">{show ? e.password : "•".repeat(Math.min(12, e.password.length))}</span>
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide password" : "Show password"}
              className="flex h-9 w-9 flex-none cursor-pointer items-center justify-center rounded-[10px] border-none bg-transparent text-k5-acx"
            >
              {show ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
            </button>
          </>
        ) : null}
      </Field>
    </div>
  );
}

function WithdrawalSection({ m }) {
  return (
    <>
      <h3 className={H3}>Student Details</h3>
      <div className={GRID2}>
        <Field label="Student ID" value={m.academic.studentId} mono />
        <Field label="Full Name" value={m.header.name} />
        <Field label="Grade" value={m.academic.grade} />
        <Field label="Learning Program" value={m.academic.learningProgram} />
      </div>
      <Note>
        {m.withdrawal.inProgress
          ? "You have a withdrawal request in progress. The school will contact you about it."
          : "Withdrawal requests will open here soon. If you need help now, please contact the school."}
      </Note>
    </>
  );
}

// Sections 1 and 2 are editable when the page has an editor (P2); the rest stay read-only for now.
const SECTION_VIEWS = {
  personal: ({ m, editor, actions }) => (editor ? <EditablePersonal m={m} editor={editor} actions={actions} /> : <PersonalSection m={m} />),
  parents: ({ m, editor, actions }) => (editor ? <EditableParents m={m} editor={editor} actions={actions} /> : <ParentsSection m={m} />),
  academic: AcademicSection,
  timing: ({ m, actions }) => (actions ? <EditableTiming m={m} actions={actions} /> : <TimingSection m={m} />),
  sports: ({ m, editor, actions }) => (editor && actions ? <EditableSports m={m} editor={editor} actions={actions} /> : <SportsSection m={m} />),
  // P5: activate / reset the school e-mail and the withdrawal request flow when the page can edit.
  schoolEmail: ({ m, actions }) => (actions ? <SchoolEmailEditor m={m} refetch={actions.refetch} /> : <SchoolEmailSection m={m} />),
  withdrawal: ({ m, actions }) => (actions ? <WithdrawalEditor m={m} /> : <WithdrawalSection m={m} />),
};

function Avatar({ header, onPick }) {
  const [broken, setBroken] = useState(false);
  const ring = "shadow-[0_0_0_4px_var(--k5-card),0_0_0_7px_var(--k5-yB)]";
  return (
    <span className="relative flex-none">
      {onPick && (
        // Mockup: the round accent camera button on the avatar ("Change profile photo").
        <label
          title="Change profile photo"
          className="absolute -bottom-1 -end-1.5 z-[1] flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-card bg-k5-ac text-white focus-within:ring-4 focus-within:ring-k5-acl"
        >
          <Camera className="h-5 w-5" strokeWidth={2.4} aria-hidden="true" />
          <span className="sr-only">Change profile photo</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) onPick(file);
            }}
          />
        </label>
      )}
      {header.photo && !broken ? (
        // A user-uploaded S3 photo of any size: a plain <img> keeps it simple (no remote image config needed).
        // eslint-disable-next-line @next/next/no-img-element
        <img src={header.photo} alt="" onError={() => setBroken(true)} className={`block h-24 w-24 rounded-full bg-[#FFC531] object-cover ${ring}`} />
      ) : (
        <span aria-hidden="true" className={`flex h-24 w-24 items-center justify-center rounded-full bg-[#FFC531] font-k5-display text-[44px] font-bold text-[#1C2640] ${ring}`}>
          {header.initials}
        </span>
      )}
    </span>
  );
}

/**
 * K–5 look of My Profile (mockup "pgProfile"): hero with photo, name, grade, student ID and the completion bar;
 * a section list with a ring per section; one section at a time with Previous / Next. Sections 1–5 are editable when
 * the page gets an editor / actions (P2–P4: fields, lists, documents, OTP, photo); the withdrawal flow is P5.
 */
export function K5Profile({ model, isLoading, error, onRetry, onBack, onDownloadIdCard, downloading, downloadProgress, editor, actions }) {
  const [current, setCurrent] = useState(1);
  const [photoFile, setPhotoFile] = useState(null);
  const pickPhoto = (file) => {
    // The existing page (cropperImage.js cropImage, docType "Profile Image"): JPG / PNG only, max 5 MB, one message for both.
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type) || file.size > 5 * 1024 * 1024) return toast.error("Please upload files in JPG, PNG, and JPEG with max size of 5MB");
    setPhotoFile(file);
  };
  const savePhoto = async (blob) => {
    const ok = await actions?.uploadDocument("Profile Image", new File([blob], "profile.jpg", { type: "image/jpeg" }));
    if (ok) setPhotoFile(null);
  };
  usePicoContentReady(!isLoading);

  if (isLoading) {
    return (
      <div className={`${K5_CARD} flex min-h-[260px] items-center justify-center px-6 py-10 font-k5-display text-xl font-semibold text-k5-mut`} role="status">
        Loading your profile…
      </div>
    );
  }
  if (error || !model) {
    return (
      <div className={`${K5_CARD} flex flex-col items-center gap-4 px-6 py-10 text-center`} role="alert">
        <p className="m-0 font-k5-display text-xl font-semibold">We couldn&apos;t load your profile.</p>
        <p className="m-0 text-base font-extrabold text-k5-mut">{error?.message?.replace(/^[A-Z_0-9]+:\s*/, "") || "Please try again."}</p>
        <button type="button" onClick={onRetry} className={ACCENT_PILL_BTN}>
          Try again
        </button>
      </div>
    );
  }

  const sections = model.sections;
  const index = Math.max(0, sections.findIndex((s) => s.id === current));
  const section = sections[index];
  const View = SECTION_VIEWS[section.key];
  const go = (next) => {
    setCurrent(next.id);
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      // old browsers: no smooth scroll
    }
  };
  const meta = [model.header.grade, model.header.studentId].filter(Boolean);

  return (
    // relative: the hidden (sr-only, absolute) file inputs stay inside the page. Without it their containing block is the
    // document, so inside the regular dashboard's scrolling <main> they stretch the whole page and leave an empty area.
    <div className="relative flex flex-col gap-[18px]">
      <div className={`${K5_CARD} flex flex-wrap items-center gap-[18px] px-[22px] py-[18px]`}>
        <Avatar header={model.header} onPick={actions ? pickPhoto : null} />
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1.5">
          <h1 className="m-0 font-k5-display text-[34px] font-semibold leading-[1.05] [overflow-wrap:anywhere] max-[600px]:text-[28px]">{model.header.name || "My Profile"}</h1>
          <p className="m-0 text-[17px] font-extrabold text-k5-mut">
            My Profile
            {meta.map((item, i) => (
              <span key={item} className={i === meta.length - 1 && model.header.studentId ? "font-mono" : ""}>
                {" · "}
                {item}
              </span>
            ))}
          </p>
          <div className="mt-1 flex max-w-[440px] items-center gap-3">
            <span
              role="progressbar"
              aria-label="Profile complete"
              aria-valuenow={model.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="block h-4 flex-[1_1_auto] overflow-hidden rounded-full border-2 border-k5-line bg-k5-soft"
            >
              <span className="block h-full rounded-full bg-k5-ac transition-[width] duration-400" style={{ width: `${model.pct}%` }} />
            </span>
            <span className="whitespace-nowrap text-base font-black">{model.pct}% complete</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button type="button" onClick={onBack} className={`${PILL_BTN} ps-3`}>
            <ArrowLeft className="h-5 w-5" strokeWidth={2.8} aria-hidden="true" />
            Back
          </button>
          {editor && (
            <button
              type="button"
              onClick={editor.saveAll}
              disabled={!editor.dirtyCount || editor.busy}
              className={`${BTN_BASE} border-[#13803F] bg-[#13803F] text-white shadow-[0_4px_0_#0B5A2B]`}
            >
              <Save className="h-5 w-5" aria-hidden="true" />
              {editor.busy ? "Saving…" : editor.dirtyCount ? `Bulk Save (${editor.dirtyCount})` : "Bulk Save"}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[270px_minmax(0,1fr)] items-start gap-[18px] max-[900px]:grid-cols-1">
        <nav
          aria-label="My Profile"
          className={`${K5_CARD} sticky top-[100px] flex flex-col gap-1 p-2.5 max-[900px]:static max-[900px]:flex-row max-[900px]:overflow-x-auto max-[900px]:rounded-[20px] max-[900px]:p-2`}
        >
          {sections.map((s, i) => {
            const on = s.id === section.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => go(s)}
                aria-current={on ? "step" : undefined}
                className={`flex min-h-14 w-full cursor-pointer items-center gap-2.5 rounded-2xl border-[3px] px-2.5 py-1.5 text-start font-k5-body text-[15px] font-black text-k5-ink max-[900px]:w-auto max-[900px]:max-w-[220px] max-[900px]:flex-none ${on ? "border-k5-ac bg-k5-act" : "border-transparent bg-k5-card"}`}
              >
                <span
                  className={`flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full font-k5-display text-[15px] font-semibold ${on ? "bg-k5-ac text-white" : "bg-k5-soft text-k5-ink"}`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-[1_1_auto] leading-[1.2]">{s.title}</span>
                {s.pct !== null && <Ring pct={s.pct} />}
              </button>
            );
          })}
        </nav>

        <section aria-labelledby="k5-profile-h" className={`${K5_CARD} flex min-w-0 flex-col gap-4 px-[22px] py-5 max-[600px]:px-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[14px] bg-k5-act font-k5-display text-[22px] font-semibold text-k5-acx">{index + 1}</span>
            <h2 id="k5-profile-h" className="m-0 min-w-0 flex-[1_1_220px] font-k5-display text-[26px] font-semibold leading-[1.15] max-[600px]:text-[22px]">
              {section.title}
            </h2>
            {section.key === "academic" && model.academic.systemTrainingSkipped && <span className="text-sm font-black text-k5-mut">System Training Skipped</span>}
            {section.key === "academic" && model.academic.idCardUrl && model.academic.idCardAllowed && (
              <div className="flex min-w-[220px] flex-col gap-1.5">
                <button type="button" onClick={onDownloadIdCard} disabled={downloading} className={GREEN_BTN}>
                  <IdCard className="h-5 w-5" aria-hidden="true" />
                  Download Student ID Card
                </button>
                {downloading && (
                  <div className="flex flex-col gap-1" role="status" aria-live="polite">
                    <div className="flex items-center justify-between gap-2 text-xs font-black text-k5-mut">
                      <span>Downloading ID card...</span>
                      <span>{downloadProgress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-k5-soft" aria-hidden="true">
                      <div
                        className="h-full rounded-full bg-[#13803F] transition-[width] duration-200"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
            {section.key === "schoolEmail" &&
              !actions &&
              (model.schoolEmail.active ? (
                <a href="https://outlook.office.com" target="_blank" rel="noopener noreferrer" className={ACCENT_BTN}>
                  Open Outlook
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => toast("Activating your school user ID — coming soon", { icon: "🚧" })}
                  className={ACCENT_BTN}
                >
                  Activate your school user ID
                </button>
              ))}
          </div>

          <View m={model} editor={editor} actions={actions} />
          {/* The school's own fields for this section (Timing's are switched off on the existing page). */}
          {["personal", "parents", "academic", "sports"].includes(section.key) && <CustomFields fields={model.customFields?.[section.key]} editor={editor} actions={actions} />}

          {!model.rightToEdit && (
            <p className="m-0 flex items-center gap-2 text-sm font-extrabold text-k5-mut">
              <Info className="h-4 w-4 flex-none" aria-hidden="true" />
              Only the school can change these details.
            </p>
          )}

          <div className="mt-1 flex flex-wrap justify-between gap-2.5 border-t-[3px] border-k5-line pt-4">
            <button type="button" disabled={index === 0} onClick={() => go(sections[index - 1])} className={`${PILL_BTN} ps-3`}>
              <ArrowLeft className="h-5 w-5" strokeWidth={2.8} aria-hidden="true" />
              Previous
            </button>
            <button type="button" disabled={index === sections.length - 1} onClick={() => go(sections[index + 1])} className={`${ACCENT_PILL_BTN} pe-3`}>
              Next
              <ArrowRight className="h-5 w-5" strokeWidth={2.8} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
      <ConfirmDialog confirm={editor?.confirm} />
      <K5PhotoDialog key={photoFile ? `${photoFile.name}-${photoFile.size}-${photoFile.lastModified}` : "none"} file={photoFile} saving={actions?.busy === "doc:Profile Image"} onCancel={() => setPhotoFile(null)} onSave={savePhoto} />
    </div>
  );
}
