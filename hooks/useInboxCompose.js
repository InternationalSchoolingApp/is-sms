"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  COMPOSE_CLOSED, REPLY_ERROR, SEND_ERROR, charCount, composeProblem, composeWarnings, fileProblem, fillTemplate, isDraftDirty, replaceWithTemplate,
  templateGroups, templateKind, tooManyPeople,
} from "@/utils/inbox";
import { isSessionExpiredError } from "@/utils/sessionState";

const EMPTY_DRAFT = { reply: null, to: [], subject: "", message: "", files: [] };
const draftFor = (reply) => (reply ? { ...EMPTY_DRAFT, reply, to: [reply.to], subject: reply.subject || "" } : EMPTY_DRAFT);

/**
 * "Write a message" and Reply — the existing page's compose (is-rest-api inbox.js), without its "Check before
 * sending" dialog: its two warnings are shown beside Send instead. Used through hooks/useInbox.js (inbox.compose).
 *
 * Rules kept from the existing page: closing keeps what was written, only Discard clears it; a reply has its
 * person and subject fixed; starting something else while a draft is unsent keeps the draft and says so; a refusal
 * or a failed send leaves everything in the form; a send whose email copy failed is told as a warning.
 * `mailbox` is the backend's answer about who this user may write to (Book); `source` sends (live or dummy).
 */
export function useInboxCompose({ source, scope, mailbox, schoolName, reloadMailbox, onSent }) {
  const [isOpen, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState(null); // { field, message }
  const [note, setNote] = useState("");
  const [isSending, setSending] = useState(false);
  const [isLoadingReply, setLoadingReply] = useState(false);

  const max = mailbox?.maxRecipients || 10;
  const isReply = Boolean(draft.reply);

  // Templates follow who the message is for (one kind of person, else all); a reply has none. No templates, or a
  // failed call, simply leaves the picker out — as on the existing page.
  const kind = templateKind(draft.to);
  const templatesQuery = useQuery({
    queryKey: [...scope, "templates", kind],
    queryFn: () => source.templates(kind).catch((failure) => (isSessionExpiredError(failure) ? Promise.reject(failure) : [])),
    enabled: isOpen && !isReply,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const patch = (changes) => {
    setDraft((current) => ({ ...current, ...changes }));
    setError(null);
  };

  const start = (reply) => {
    const same = reply ? draft.reply?.inReplyToId === reply.inReplyToId : !draft.reply;
    if (!same && isDraftDirty(draft)) {
      setNote(`${draft.reply ? "You have an unsent reply." : "You have an unsent message."} Send it, or choose Discard and start again.`);
    } else {
      if (!same) setDraft(draftFor(reply));
      setNote("");
    }
    setError(null);
    setOpen(true);
    // The list of people is read again each time a new message is started, as on the existing page.
    if (!reply) reloadMailbox?.();
  };

  const picked = new Set(draft.to.map((person) => person.userId));
  return {
    isOpen,
    isReply,
    title: isReply ? "Reply" : "New message",
    from: mailbox?.writer?.name ? `From: ${mailbox.writer.name}${mailbox.writer.role ? ` · ${mailbox.writer.role}` : ""}` : "",
    initial: (mailbox?.writer?.name || "?").trim().charAt(0).toUpperCase(),
    draft,
    // People still to choose from; the whole list arrives at once for a student, so typing narrows it here.
    people: (mailbox?.contacts || []).filter((person) => !picked.has(person.userId)),
    max,
    hint: `Open the list to see everyone you can write to, or type a name to narrow it. Up to ${max} people.`,
    error,
    note,
    warnings: composeWarnings(draft),
    counter: charCount(draft.message),
    templateGroups: isReply ? [] : templateGroups(templatesQuery.data, kind),
    /** Puts a template into the subject and message; asks first when that would replace something written. */
    applyTemplate: (template) => {
      if (!template || isReply) return;
      if ((draft.subject.trim() || draft.message.trim()) && !window.confirm(replaceWithTemplate(template.title))) return;
      const names = { people: draft.to, writerName: mailbox?.writer?.name || "", schoolName };
      patch({ subject: fillTemplate(template.subject, names).slice(0, 200), message: fillTemplate(template.body, names).slice(0, 10_000) });
    },
    isSending,
    isLoadingReply,

    open: () => {
      if (mailbox && !mailbox.canCompose) return toast.error(mailbox.reason || COMPOSE_CLOSED);
      start(null);
    },
    openReply: async (emailId) => {
      if (isLoadingReply) return;
      setLoadingReply(true);
      try {
        start(await source.replyDraft(emailId));
      } catch (failure) {
        if (!isSessionExpiredError(failure)) toast.error(failure?.message || REPLY_ERROR);
      } finally {
        setLoadingReply(false);
      }
    },
    /** Close keeps the draft (it is there again when the panel reopens). */
    close: () => setOpen(false),
    discard: () => {
      setDraft(EMPTY_DRAFT);
      setError(null);
      setNote("");
      setOpen(false);
    },

    setSubject: (subject) => !isReply && patch({ subject }),
    setMessage: (message) => patch({ message }),
    addPerson: (person) => {
      if (isReply || picked.has(person.userId)) return;
      if (draft.to.length >= max) return setError({ field: "to", message: tooManyPeople(max) });
      patch({ to: [...draft.to, person] });
    },
    removePerson: (userId) => !isReply && patch({ to: draft.to.filter((person) => person.userId !== userId) }),
    addFiles: (chosen) => {
      const files = [...draft.files, ...Array.from(chosen || [])];
      const problem = fileProblem(files);
      // A file that cannot be attached is not added; the reason is shown and what was there stays.
      if (problem) return setError({ field: "files", message: problem });
      patch({ files });
    },
    removeFile: (index) => patch({ files: draft.files.filter((_, i) => i !== index) }),

    send: async () => {
      if (isSending) return;
      const problem = composeProblem({ ...draft, reply: isReply });
      if (problem) return setError(problem);
      setSending(true);
      setError(null);
      try {
        const result = await source.send({
          to: draft.to.map((person) => person.userId),
          subject: draft.subject.trim(),
          message: draft.message,
          inReplyToId: draft.reply?.inReplyToId ?? null,
          files: draft.files,
        });
        setDraft(EMPTY_DRAFT);
        setNote("");
        setOpen(false);
        // sent === false: the message is in their Inbox, but the email copy could not go out.
        if (result?.sent) toast.success(result.message || "Message sent");
        else toast.error(result?.message || SEND_ERROR);
        onSent?.();
      } catch (failure) {
        if (!isSessionExpiredError(failure)) setError({ field: "send", message: failure?.message || SEND_ERROR });
      } finally {
        setSending(false);
      }
    },
  };
}
