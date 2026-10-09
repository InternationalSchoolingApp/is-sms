"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Check, FileUp, MessageCircle, Plus, Send, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useAdvisorChat,
  useAdvisorStart,
  useAdvisorSuggestions,
  useApplySuggestions,
  useConfirmMarksheet,
  useDismissSuggestions,
  useMarksheetUpload,
} from "@/hooks/useCourseAdvisor";
import { prepareMarksheetFiles } from "@/utils/marksheetFiles";

const STATUS_SUCCESS = "1";
const STATUS_SESSION_OUT = "3";
const GENERIC_ERROR = "Something went wrong. Please check your connection and try again.";
const BANDS = [
  { value: "strong", label: "Strong" },
  { value: "average", label: "Average" },
  { value: "weak", label: "Needs work" },
  { value: "unknown", label: "Not sure" },
];
const QUICK_QUESTIONS = [
  "What's the difference between Honors and AP?",
  "Which elective fits my goals?",
  "Is my course load too heavy?",
];
const ACTION_BADGE = {
  ADD: "Add",
  UPGRADE: "Upgrade",
  REPLACE: "Swap",
  ADDITIONAL: "Try this",
};

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** Reveals text a few characters at a time; shows it whole when motion is reduced. */
function TypedText({ text, delay = 0 }) {
  const reduced = usePrefersReducedMotion();
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (reduced) return undefined;
    let timer;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        setShown((n) => {
          if (n >= text.length) {
            clearInterval(timer);
            return n;
          }
          return n + 2;
        });
      }, 18);
    }, delay);
    return () => {
      clearTimeout(start);
      clearInterval(timer);
    };
  }, [text, delay, reduced]);
  if (reduced) return <span>{text}</span>;
  return (
    <span>
      {text.slice(0, shown)}
      {shown < text.length && <span className="sr-only">{text.slice(shown)}</span>}
    </span>
  );
}

/** Live checklist while the AI works: steps tick over on a timer, the last one waits for the answer. */
function ThinkingChecklist({ steps, finished }) {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (finished) return undefined;
    const timer = setInterval(() => setActive((i) => Math.min(i + 1, steps.length - 1)), 1300);
    return () => clearInterval(timer);
  }, [finished, steps.length]);
  return (
    <ul className="space-y-2" aria-live="polite">
      {steps.map((label, index) => {
        const done = finished || index < active;
        const current = !finished && index === active;
        return (
          <li key={label} className={`flex items-center gap-2 text-sm ${done || current ? "text-black" : "text-slate-400"}`}>
            <span
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                done ? "border-[#0f8a74] bg-[#0f8a74] text-white" : current ? "ai-spin border-[#0f8a74] border-t-transparent" : "border-slate-300"
              }`}
            >
              {done && <Check className="h-3 w-3" strokeWidth={4} />}
            </span>
            {label}
          </li>
        );
      })}
    </ul>
  );
}

function ShimmerCards({ count = 3 }) {
  return (
    <div className="mt-4 space-y-2" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="ai-shimmer h-16 rounded-lg" />
      ))}
    </div>
  );
}

function ConsentNote({ text }) {
  if (!text) return null;
  return <p className="text-[11px] leading-snug text-slate-600">{text}</p>;
}

function Chip({ selected, onClick, children, multi }) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
        selected ? "border-primary bg-primary text-white" : "border-slate-300 bg-white text-black hover:border-primary"
      }`}
    >
      {children}
    </button>
  );
}

function MarksheetTable({ marksheet, onChange }) {
  const rows = marksheet.subjects;
  function update(index, patch) {
    onChange({ ...marksheet, subjects: rows.map((row, i) => (i === index ? { ...row, ...patch } : row)) });
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-600">
            <th className="py-1 pr-2 font-semibold">Subject</th>
            <th className="py-1 pr-2 font-semibold">Result</th>
            <th className="py-1 pr-2 font-semibold">How you did</th>
            <th className="py-1" aria-label="Remove" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t border-slate-100">
              <td className="py-1.5 pr-2">
                <input
                  aria-label="Subject"
                  value={row.name}
                  onChange={(e) => update(index, { name: e.target.value })}
                  className="h-8 w-full rounded-md border border-slate-300 px-2 outline-none focus:border-primary"
                />
              </td>
              <td className="py-1.5 pr-2">
                <input
                  aria-label="Result"
                  value={row.score ? `${row.score}${row.maxScore ? `/${row.maxScore}` : ""}` : row.letterGrade || ""}
                  onChange={(e) => {
                    const [score, maxScore] = e.target.value.split("/");
                    update(index, { score: score ?? "", maxScore: maxScore ?? "", letterGrade: "" });
                  }}
                  className="h-8 w-24 rounded-md border border-slate-300 px-2 outline-none focus:border-primary"
                />
              </td>
              <td className="py-1.5 pr-2">
                <select
                  aria-label="How you did"
                  value={row.band}
                  onChange={(e) => update(index, { band: e.target.value })}
                  className="h-8 rounded-md border border-slate-300 bg-white px-2 outline-none focus:border-primary"
                >
                  {BANDS.map((band) => (
                    <option key={band.value} value={band.value}>
                      {band.label}
                    </option>
                  ))}
                </select>
              </td>
              <td className="py-1.5 text-right">
                <button
                  type="button"
                  aria-label={`Remove ${row.name || "subject"}`}
                  onClick={() => onChange({ ...marksheet, subjects: rows.filter((_, i) => i !== index) })}
                  className="rounded p-1 text-slate-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button
        type="button"
        onClick={() => onChange({ ...marksheet, subjects: [...rows, { name: "", score: "", maxScore: "", letterGrade: "", band: "unknown" }] })}
        className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-primary"
      >
        <Plus className="h-4 w-4" /> Add a subject
      </button>
    </div>
  );
}

function SuggestionCard({ suggestion, checked, onToggle, index, extra, onNoThanks, busy }) {
  return (
    <li
      className={`ai-rise rounded-lg border px-3 py-2.5 ${extra ? "border-[#0f8a74] bg-[#e2f5f0]" : "border-slate-200 bg-white"}`}
      style={{ animationDelay: `${index * 140}ms` }}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={checked}
          onCheckedChange={onToggle}
          aria-label={`Include ${suggestion.title}`}
          className="mt-0.5"
          disabled={busy}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-black">{suggestion.title}</span>
            <span
              className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${
                extra ? "bg-[#0f8a74] text-white" : "bg-[#e6f3ff] text-primary"
              }`}
            >
              {ACTION_BADGE[suggestion.action] || "AI pick"}
            </span>
          </div>
          {suggestion.category && <p className="text-xs text-slate-600">{suggestion.category}</p>}
          {suggestion.reason && (
            <p className="mt-1 text-sm text-slate-800">
              <TypedText text={suggestion.reason} delay={index * 140 + 250} />
            </p>
          )}
          {suggestion.feeNote && <p className="mt-1 text-xs font-semibold text-amber-700">{suggestion.feeNote}</p>}
          {extra && (
            <button
              type="button"
              onClick={onNoThanks}
              disabled={busy}
              className="mt-1.5 text-xs font-semibold text-slate-600 underline hover:text-black"
            >
              No thanks
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Typing">
      {[0, 1, 2].map((i) => (
        <span key={i} className="ai-rise h-1.5 w-1.5 rounded-full bg-slate-400" style={{ animationDelay: `${i * 150}ms`, animationIterationCount: "infinite", animationDirection: "alternate" }} />
      ))}
    </span>
  );
}

/**
 * The AI Suggester. Every server call starts from a click in here; closing it
 * leaves Step 3 exactly as it was. Applied changes go through the backend's
 * normal course-save path and come back as a fresh course-details response,
 * which onApplied hands to Stage3 to show.
 */
export function AiAdvisorDialog({ open, onClose, context, school, program, gradeName, onApplied, onSessionExpired }) {
  const start = useAdvisorStart({ context });
  const upload = useMarksheetUpload({ school, program });
  const confirmMarks = useConfirmMarksheet({ context });
  const suggest = useAdvisorSuggestions({ context });
  const apply = useApplySuggestions({ context });
  const dismiss = useDismissSuggestions({ context });
  const chat = useAdvisorChat({ context });

  const [step, setStep] = useState("loading");
  const [setup, setSetup] = useState(null);
  const [notice, setNotice] = useState("");
  const [marksheet, setMarksheet] = useState(null);
  const [marksheetId, setMarksheetId] = useState(null);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [checked, setChecked] = useState(new Set());
  const [pending, setPending] = useState(null);
  // Chat: [{ role: "student" | "advisor", text, recommendationId?, suggestions?, checked? }]
  const [chatLog, setChatLog] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [cameFrom, setCameFrom] = useState("questions");
  const chatEnd = useRef(null);
  const fileInput = useRef(null);
  const startedRef = useRef(false);

  const busy = start.isPending || upload.isPending || confirmMarks.isPending || suggest.isPending || apply.isPending || chat.isPending;

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: "end" });
  }, [chatLog.length, chat.isPending]);

  function sessionOut() {
    onClose();
    onSessionExpired?.();
  }

  useEffect(() => {
    if (!open || startedRef.current) return;
    startedRef.current = true;
    start
      .mutateAsync()
      .then((response) => {
        if (response.status === STATUS_SESSION_OUT) return sessionOut();
        if (response.status !== STATUS_SUCCESS) {
          setNotice(response.message || GENERIC_ERROR);
          return setStep("error");
        }
        setSetup(response);
        setStep(response.marksheetEnabled ? "marksheet" : "questions");
      })
      .catch(() => {
        setNotice(GENERIC_ERROR);
        setStep("error");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleFiles(fileList) {
    setNotice("");
    const prepared = await prepareMarksheetFiles(fileList, { maxFiles: setup?.marksheetMaxFiles || 3 });
    if (prepared.error) {
      setNotice(prepared.error);
      return;
    }
    setStep("reading");
    try {
      const response = await upload.mutateAsync(prepared.files);
      if (response.status === STATUS_SESSION_OUT) return sessionOut();
      if (response.status !== STATUS_SUCCESS) {
        setNotice(response.message || GENERIC_ERROR);
        setStep("marksheet");
        return;
      }
      setMarksheet({
        marksheetId: response.marksheetId,
        board: response.board,
        gradeLevel: response.gradeLevel,
        confidence: response.confidence,
        message: response.message,
        subjects: response.subjects || [],
      });
      setStep("confirmMarks");
    } catch {
      setNotice("We couldn't read your marksheet right now. You can continue without it.");
      setStep("marksheet");
    }
  }

  async function handleConfirmMarks() {
    const subjects = marksheet.subjects.filter((row) => row.name.trim());
    if (subjects.length === 0) {
      setNotice("Please keep at least one subject, or skip this step.");
      return;
    }
    try {
      const response = await confirmMarks.mutateAsync({
        marksheetId: marksheet.marksheetId,
        board: marksheet.board,
        gradeLevel: marksheet.gradeLevel,
        subjects,
      });
      if (response.status === STATUS_SESSION_OUT) return sessionOut();
      if (response.status !== STATUS_SUCCESS) {
        setNotice(response.message || GENERIC_ERROR);
        return;
      }
      setMarksheetId(response.marksheetId);
      setNotice("");
      setStep("questions");
    } catch {
      setNotice(GENERIC_ERROR);
    }
  }

  function toggleAnswer(question, value) {
    setAnswers((prev) => {
      const current = prev[question.id] || [];
      if (!question.multi) return { ...prev, [question.id]: current.includes(value) ? [] : [value] };
      return {
        ...prev,
        [question.id]: current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
      };
    });
  }

  async function handleSuggest() {
    setNotice("");
    setStep("thinking");
    try {
      const response = await suggest.mutateAsync({ answers, marksheetId });
      if (response.status === STATUS_SESSION_OUT) return sessionOut();
      if (response.status !== STATUS_SUCCESS) {
        setNotice(response.message || GENERIC_ERROR);
        setStep("error");
        return;
      }
      const suggestions = response.suggestions || [];
      setResult({ ...response, suggestions });
      // Regular suggestions start ticked; the extra "try this" course is the student's own choice.
      setChecked(new Set(suggestions.filter((s) => s.action !== "ADDITIONAL").map((s) => s.itemId)));
      setStep("suggestions");
    } catch {
      setNotice(GENERIC_ERROR);
      setStep("error");
    }
  }

  /** source: the suggestion set the items belong to (the suggester's, or one chat answer's). */
  async function handleApply(itemIds, confirmations = [], source = result) {
    if (itemIds.length === 0) {
      toast.error("Please pick at least one suggestion.");
      return;
    }
    try {
      const response = await apply.mutateAsync({ recommendationId: source.recommendationId, itemIds, confirmations });
      if (response.status === STATUS_SESSION_OUT) return sessionOut();
      if (response.statusCode === "CONFIRMATION_REQUIRED") {
        setPending({ itemIds, required: response.confirmationsRequired || [], given: confirmations, source, returnTo: step });
        // Answers already shown should not type out again when the student comes back.
        setChatLog((log) => log.map((entry) => ({ ...entry, fresh: false })));
        setStep("confirm");
        return;
      }
      if (response.status !== STATUS_SUCCESS) {
        toast.error(response.message || GENERIC_ERROR);
        return;
      }
      const appliedIds = new Set(response.appliedItemIds || []);
      const landed = source.suggestions.filter((s) => appliedIds.has(s.itemId)).map((s) => s.subjectId);
      onApplied?.(response.courseDetails, landed);
      if (appliedIds.size > 0) toast.success(response.message || "Suggestions added");
      (response.skipped || []).forEach((s) => {
        const title = source.suggestions.find((x) => x.itemId === s.itemId)?.title;
        toast.error(title ? `${title}: ${s.reason}` : s.reason);
      });
      onClose();
    } catch {
      toast.error(GENERIC_ERROR);
    }
  }

  function openChat() {
    setCameFrom(step);
    setStep("chat");
  }

  async function handleAsk(text) {
    const question = (text ?? chatInput).trim();
    if (!question || chat.isPending) return;
    const history = chatLog.map(({ role, text: t }) => ({ role, text: t }));
    setChatLog((log) => [...log.map((entry) => ({ ...entry, fresh: false })), { role: "student", text: question }]);
    setChatInput("");
    try {
      const response = await chat.mutateAsync({ question, history, marksheetId });
      if (response.status === STATUS_SESSION_OUT) return sessionOut();
      if (response.status !== STATUS_SUCCESS) {
        setChatLog((log) => [...log, { role: "advisor", text: response.message || GENERIC_ERROR, failed: true }]);
        return;
      }
      const suggestions = response.suggestions || [];
      setChatLog((log) => [
        ...log,
        {
          role: "advisor",
          fresh: true,
          text: response.answer,
          recommendationId: response.recommendationId,
          suggestions,
          // Same rule as the suggester: a paid extra course is never pre-ticked.
          checked: new Set(suggestions.filter((s) => s.action !== "ADDITIONAL").map((s) => s.itemId)),
        },
      ]);
    } catch {
      setChatLog((log) => [...log, { role: "advisor", text: GENERIC_ERROR, failed: true }]);
    }
  }

  function toggleChatSuggestion(index, itemId) {
    setChatLog((log) =>
      log.map((entry, i) => {
        if (i !== index) return entry;
        const checked = new Set(entry.checked);
        checked.has(itemId) ? checked.delete(itemId) : checked.add(itemId);
        return { ...entry, checked };
      })
    );
  }

  function dropChatSuggestion(index, itemId) {
    const entry = chatLog[index];
    dismiss.mutate({ recommendationId: entry.recommendationId, itemIds: [itemId] });
    setChatLog((log) =>
      log.map((e, i) => {
        if (i !== index) return e;
        const checked = new Set(e.checked);
        checked.delete(itemId);
        return { ...e, checked, suggestions: e.suggestions.filter((s) => s.itemId !== itemId) };
      })
    );
  }

  function handleNoThanks(suggestion) {
    dismiss.mutate({ recommendationId: result.recommendationId, itemIds: [suggestion.itemId] });
    setResult((prev) => ({ ...prev, suggestions: prev.suggestions.filter((s) => s.itemId !== suggestion.itemId) }));
    setChecked((prev) => {
      const next = new Set(prev);
      next.delete(suggestion.itemId);
      return next;
    });
  }

  const thinkingSteps = [
    ...(marksheetId ? ["Reading your results"] : []),
    `Checking the ${gradeName || "grade"} rules`,
    "Matching your interests",
    "Choosing courses for you",
  ];
  const regular = result?.suggestions.filter((s) => s.action !== "ADDITIONAL") || [];
  const extras = result?.suggestions.filter((s) => s.action === "ADDITIONAL") || [];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !apply.isPending && onClose()}>
      <DialogContent className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <DialogHeader className="shrink-0 border-b px-4 py-3 pr-12">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0f8a74] text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            AI Suggester <span className="text-[#9a5b00]">*</span>
          </DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {step === "loading" && (
            <>
              <ThinkingChecklist steps={["Getting a few questions ready"]} finished={false} />
              <ShimmerCards count={2} />
            </>
          )}

          {step === "error" && (
            <div className="space-y-3">
              <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-black">{notice || GENERIC_ERROR}</p>
              {!/choose your courses/i.test(notice) && (
                <p className="text-sm text-slate-700">You can still choose your courses yourself on this page.</p>
              )}
            </div>
          )}

          {step === "marksheet" && (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-black">Add last year&apos;s marksheet (optional)</h3>
                <p className="text-sm text-slate-700">We&apos;ll read your marks to suggest the right level for each subject.</p>
              </div>
              {setup?.confirmedMarksheet && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-[#e6f3ff] px-3 py-2">
                  <p className="text-sm text-black">
                    We already have your marksheet ({setup.confirmedMarksheet.subjects?.length || 0} subjects).
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      setMarksheetId(setup.confirmedMarksheet.marksheetId);
                      setStep("questions");
                    }}
                  >
                    Use it
                  </Button>
                </div>
              )}
              <label
                className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center hover:border-primary"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  handleFiles(e.dataTransfer.files);
                }}
              >
                <FileUp className="h-7 w-7 text-primary" />
                <span className="text-sm font-semibold text-black">Upload a PDF or photo</span>
                <span className="text-xs text-slate-600">Up to {setup?.marksheetMaxFiles || 3} files · PDF, JPG, PNG</span>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(e) => {
                    handleFiles(e.target.files);
                    e.target.value = "";
                  }}
                />
              </label>
              {notice && <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-black">{notice}</p>}
              <ConsentNote text={setup?.consentNote} />
            </div>
          )}

          {step === "reading" && (
            <>
              <ThinkingChecklist steps={["Uploading your marksheet", "Reading subjects and marks", "Checking the results"]} finished={false} />
              <ShimmerCards count={3} />
            </>
          )}

          {step === "confirmMarks" && marksheet && (
            <div className="space-y-3">
              <div>
                <h3 className="text-base font-semibold text-black">Is this right?</h3>
                <p className="text-sm text-slate-700">{marksheet.message || "Fix anything we read wrong."}</p>
              </div>
              {marksheet.confidence === "low" && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-black">
                  The file was hard to read. Please check every row carefully.
                </p>
              )}
              <MarksheetTable marksheet={marksheet} onChange={setMarksheet} />
              {notice && <p className="text-sm text-red-600">{notice}</p>}
              <ConsentNote text={setup?.consentNote} />
            </div>
          )}

          {step === "questions" && setup && (
            <div className="space-y-5">
              <p className="text-sm text-slate-700">A few quick questions. Skip any you like.</p>
              {setup.questions.map((question) => (
                <fieldset key={question.id} className="space-y-2">
                  <legend className="text-sm font-semibold text-black">{question.text}</legend>
                  <div className="flex flex-wrap gap-2" role={question.multi ? "group" : "radiogroup"}>
                    {question.options.map((option) => (
                      <Chip
                        key={option.value}
                        multi={question.multi}
                        selected={(answers[question.id] || []).includes(option.value)}
                        onClick={() => toggleAnswer(question, option.value)}
                      >
                        {option.label}
                      </Chip>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          )}

          {step === "thinking" && (
            <>
              <ThinkingChecklist steps={thinkingSteps} finished={false} />
              <ShimmerCards count={3} />
            </>
          )}

          {step === "suggestions" && result && (
            <div className="space-y-4">
              {result.summary && (
                <p className="ai-rise rounded-lg bg-[#e6f3ff] px-3 py-2 text-sm text-black">
                  <TypedText text={result.summary} />
                </p>
              )}
              {result.suggestions.length === 0 ? (
                <p className="text-sm text-black">{result.message || "Your current courses already look like a good fit."}</p>
              ) : (
                <>
                  {regular.length > 0 && (
                    <ul className="space-y-2">
                      {regular.map((s, index) => (
                        <SuggestionCard
                          key={s.itemId}
                          suggestion={s}
                          index={index}
                          checked={checked.has(s.itemId)}
                          busy={busy}
                          onToggle={() =>
                            setChecked((prev) => {
                              const next = new Set(prev);
                              next.has(s.itemId) ? next.delete(s.itemId) : next.add(s.itemId);
                              return next;
                            })
                          }
                        />
                      ))}
                    </ul>
                  )}
                  {extras.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-black">Want to try one more?</p>
                      <ul className="space-y-2">
                        {extras.map((s, index) => (
                          <SuggestionCard
                            key={s.itemId}
                            suggestion={s}
                            index={regular.length + index}
                            extra
                            checked={checked.has(s.itemId)}
                            busy={busy}
                            onNoThanks={() => handleNoThanks(s)}
                            onToggle={() =>
                              setChecked((prev) => {
                                const next = new Set(prev);
                                next.has(s.itemId) ? next.delete(s.itemId) : next.add(s.itemId);
                                return next;
                              })
                            }
                          />
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
              <ConsentNote text={setup?.consentNote} />
            </div>
          )}

          {step === "chat" && (
            <div className="space-y-3">
              {chatLog.length === 0 && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">Ask anything about choosing your courses.</p>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_QUESTIONS.map((q) => (
                      <Chip key={q} multi selected={false} onClick={() => handleAsk(q)}>
                        {q}
                      </Chip>
                    ))}
                  </div>
                </div>
              )}
              <ul className="space-y-3" aria-live="polite">
                {chatLog.map((entry, index) => (
                  <li key={index} className={`ai-rise flex ${entry.role === "student" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        entry.role === "student"
                          ? "rounded-br-sm bg-primary text-white"
                          : entry.failed
                            ? "rounded-bl-sm border border-amber-300 bg-amber-50 text-black"
                            : "rounded-bl-sm bg-slate-100 text-black"
                      }`}
                    >
                      <p className="whitespace-pre-line">
                        {entry.fresh ? <TypedText text={entry.text} /> : entry.text}
                      </p>
                      {entry.suggestions?.length > 0 && (
                        <div className="mt-2 space-y-2">
                          <ul className="space-y-2">
                            {entry.suggestions.map((s, i) => (
                              <SuggestionCard
                                key={s.itemId}
                                suggestion={s}
                                index={i}
                                extra={s.action === "ADDITIONAL"}
                                checked={entry.checked.has(s.itemId)}
                                busy={busy}
                                onToggle={() => toggleChatSuggestion(index, s.itemId)}
                                onNoThanks={() => dropChatSuggestion(index, s.itemId)}
                              />
                            ))}
                          </ul>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleApply([...entry.checked], [], entry)}
                            disabled={busy || entry.checked.size === 0}
                          >
                            {apply.isPending ? "Adding…" : `Apply (${entry.checked.size})`}
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
                {chat.isPending && (
                  <li className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-3 py-2.5">
                      <TypingDots />
                    </div>
                  </li>
                )}
              </ul>
              <div ref={chatEnd} />
              <ConsentNote text={setup?.consentNote} />
            </div>
          )}

          {step === "confirm" && pending && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-black">Please confirm</h3>
              <ul className="space-y-2">
                {pending.required.map((c, index) => (
                  <li key={`${c.itemId}-${c.type}-${index}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-black">
                    {c.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 flex-row flex-wrap justify-end gap-2 border-t bg-white px-4 py-3">
          {step === "marksheet" && (
            <Button type="button" variant="outline" onClick={() => setStep("questions")}>
              Skip this step
            </Button>
          )}
          {step === "confirmMarks" && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep("questions")} disabled={busy}>
                Skip marksheet
              </Button>
              <Button type="button" onClick={handleConfirmMarks} disabled={busy}>
                {confirmMarks.isPending ? "Saving…" : "Looks right"}
              </Button>
            </>
          )}
          {step === "questions" && (
            <Button type="button" onClick={handleSuggest} disabled={busy} className="bg-[#0f8a74] hover:bg-[#0f8a74]/90">
              <Sparkles className="h-4 w-4" /> Get suggestions
            </Button>
          )}
          {step === "suggestions" && setup?.chatEnabled && (
            <Button type="button" variant="ghost" onClick={openChat} disabled={busy} className="mr-auto text-[#0f8a74]">
              <MessageCircle className="h-4 w-4" /> Ask a question
            </Button>
          )}
          {step === "chat" && (
            <form
              className="flex w-full items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                handleAsk();
              }}
            >
              {cameFrom !== "chat" && (
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(cameFrom)} disabled={chat.isPending}>
                  Back
                </Button>
              )}
              <input
                id="ai-advisor-question"
                aria-label="Your question"
                value={chatInput}
                maxLength={500}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask about your courses…"
                className="h-9 min-w-0 flex-1 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-primary"
              />
              <Button type="submit" size="sm" disabled={!chatInput.trim() || chat.isPending} aria-label="Send">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          )}
          {step === "suggestions" && result?.suggestions.length > 0 && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleApply(result.suggestions.map((s) => s.itemId))}
                disabled={busy}
              >
                Apply all
              </Button>
              <Button type="button" onClick={() => handleApply([...checked])} disabled={busy || checked.size === 0}>
                {apply.isPending ? "Adding…" : `Apply selected (${checked.size})`}
              </Button>
            </>
          )}
          {step === "confirm" && pending && (
            <>
              <Button type="button" variant="outline" onClick={() => setStep(pending.returnTo || "suggestions")} disabled={busy}>
                Back
              </Button>
              <Button
                type="button"
                onClick={() =>
                  handleApply(
                    pending.itemIds,
                    [...new Set([...pending.given, ...pending.required.map((c) => c.type)])],
                    pending.source
                  )
                }
                disabled={busy}
              >
                {apply.isPending ? "Adding…" : "Confirm & add"}
              </Button>
            </>
          )}
          {(step === "error" || (step === "suggestions" && result?.suggestions.length === 0)) && (
            <Button type="button" onClick={onClose}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
