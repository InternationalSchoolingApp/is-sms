import { Activity, Camera, Hand, Mic, Users } from "lucide-react";

/**
 * Class Quality screen body — renders the real per-student class-analytics
 * report from is-rest-api (via services/classQualityApi.js), replacing the
 * paused AI-written content.
 *
 * Presentational and server-renderable (no hooks): the page Server Component
 * fetches the report and passes the result in. States are handled the way the
 * enrollment screens do — the server decides and renders the right branch, so
 * there is no client-side loading spinner here.
 *
 * Props:
 *   report:  the backend `data` object ({ session, participantReports, averages }) or null.
 *   error:   a short error key from the action when the fetch did not succeed.
 *   message: the backend's reason when there is no report yet (status "0"), shown in the empty state.
 */
export function ClassQuality({ report, error, message }) {
  if (error) {
    return <StateCard tone="error" title="Couldn't load the Class Quality report" message={errorMessage(error)} />;
  }

  const participants = Array.isArray(report?.participantReports) ? report.participantReports : [];
  const averages = report?.averages || null;

  if (!report || participants.length === 0) {
    return (
      <StateCard
        tone="empty"
        title="No Class Quality data yet"
        message={
          (typeof message === "string" && message) ||
          "This class has no analytics report yet. Reports appear once the class-app has sent its signals for a completed session."
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <SessionHeader session={report.session} count={averages?.count ?? participants.length} />
      {averages && <AveragesSummary averages={averages} />}
      <ParticipantsTable participants={participants} />
    </div>
  );
}

/* ----------------------------- sections ----------------------------- */

function SessionHeader({ session, count }) {
  const started = formatDateTime(session?.startedAt);
  const ended = formatDateTime(session?.endedAt);
  return (
    <section className="rounded-2xl bg-white p-6 shadow-[0_4px_24px_rgba(15,23,42,0.08)] sm:p-7">
      <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">Class Quality</h1>
      <p className="mt-1.5 text-sm text-slate-600">
        {count} student{count === 1 ? "" : "s"}
        {started && (
          <>
            {" · "}
            {started}
            {ended ? ` – ${ended}` : ""}
          </>
        )}
      </p>
      {session?.externalId && (
        <p className="mt-1 text-xs text-slate-400">Session {session.externalId}</p>
      )}
    </section>
  );
}

function AveragesSummary({ averages }) {
  const cards = [
    {
      icon: Activity,
      label: "Avg attention",
      value: formatPercent(averages.avgAttentionPercent),
    },
    {
      icon: Camera,
      label: "Avg camera on",
      value: formatDuration(averages.avgCameraOnSeconds),
    },
    {
      icon: Hand,
      label: "Hands raised",
      value: formatCount(averages.handsRaised),
    },
    {
      icon: Mic,
      label: "Spoke 30s+",
      value: formatCount(averages.spoke30s),
    },
  ];
  return (
    <section>
      <h2 className="sr-only">Class averages</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(15,23,42,0.08)]"
          >
            <div className="flex items-center gap-2 text-slate-500">
              <c.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="text-xs font-medium">{c.label}</span>
            </div>
            <p className="mt-2 text-2xl font-extrabold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function ParticipantsTable({ participants }) {
  return (
    <section className="rounded-2xl bg-white shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
        <Users className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <h2 className="text-sm font-bold text-slate-900">Per-student breakdown</h2>
      </div>

      {/* Table on sm+, stacked cards on mobile — the table scrolls horizontally if it must. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Student</th>
              <th className="px-3 py-3 text-right">Present</th>
              <th className="px-3 py-3 text-right">Camera on</th>
              <th className="px-3 py-3 text-right">Attention</th>
              <th className="px-3 py-3 text-right">Speaking</th>
              <th className="px-3 py-3 text-right">Hand raised</th>
              <th className="px-5 py-3 text-right">Looked away</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {participants.map((p, i) => (
              <tr key={p.externalId || i} className="text-slate-700">
                <td className="px-5 py-3">
                  <span className="block font-semibold text-slate-900">{p.externalId || "—"}</span>
                  {p.role && <span className="block text-xs capitalize text-slate-400">{String(p.role).toLowerCase()}</span>}
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatDuration(p.presentSeconds)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatDuration(p.cameraOnSeconds)}</td>
                <td className="px-3 py-3 text-right">
                  <AttentionBadge percent={p.attentionPercent} />
                </td>
                <td className="px-3 py-3 text-right tabular-nums">{formatDuration(p.speakingSeconds)}</td>
                <td className="px-3 py-3 text-right tabular-nums">{formatDuration(p.handRaisedSeconds)}</td>
                <td className="px-5 py-3 text-right tabular-nums">{formatCount(p.lookedAwayCount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="divide-y divide-slate-100 sm:hidden">
        {participants.map((p, i) => (
          <li key={p.externalId || i} className="px-5 py-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-900">{p.externalId || "—"}</span>
              <AttentionBadge percent={p.attentionPercent} />
            </div>
            {p.role && <span className="text-xs capitalize text-slate-400">{String(p.role).toLowerCase()}</span>}
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
              <Stat label="Present" value={formatDuration(p.presentSeconds)} />
              <Stat label="Camera on" value={formatDuration(p.cameraOnSeconds)} />
              <Stat label="Speaking" value={formatDuration(p.speakingSeconds)} />
              <Stat label="Hand raised" value={formatDuration(p.handRaisedSeconds)} />
              <Stat label="Looked away" value={formatCount(p.lookedAwayCount)} />
            </dl>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ----------------------------- bits ----------------------------- */

function Stat({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="font-medium tabular-nums text-slate-700">{value}</dd>
    </div>
  );
}

function AttentionBadge({ percent }) {
  if (percent === null || percent === undefined || Number.isNaN(Number(percent))) {
    return <span className="text-slate-400">—</span>;
  }
  const value = Math.round(Number(percent));
  const tone =
    value >= 75
      ? "bg-emerald-50 text-emerald-700"
      : value >= 50
        ? "bg-amber-50 text-amber-700"
        : "bg-rose-50 text-rose-700";
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums ${tone}`}>
      {value}%
    </span>
  );
}

function StateCard({ tone, title, message }) {
  const ring = tone === "error" ? "border-rose-200" : "border-slate-200";
  return (
    <section className={`rounded-2xl border ${ring} bg-white p-8 text-center shadow-[0_4px_24px_rgba(15,23,42,0.08)]`}>
      <h1 className="text-lg font-extrabold text-slate-900">{title}</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{message}</p>
    </section>
  );
}

/* ----------------------------- formatting ----------------------------- */

/** Whole-second duration as mm:ss (or h:mm:ss past an hour). "—" when missing. */
function formatDuration(seconds) {
  const n = Number(seconds);
  if (!Number.isFinite(n) || n < 0) return "—";
  const total = Math.round(n);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function formatPercent(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${Math.round(n)}%`;
}

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return String(Math.round(n));
}

function formatDateTime(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  try {
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function errorMessage(error) {
  switch (error) {
    case "session-out":
      return "Your sign-in has ended. Please log in again.";
    case "no-session-id":
      return "No class session was specified. Open this screen with a session id.";
    case "not-found":
      return "No report exists for this class session.";
    default:
      return "Something went wrong fetching the report. Please try again in a moment.";
  }
}
