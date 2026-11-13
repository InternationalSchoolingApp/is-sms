"use client";

import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useDummyStudent } from "@/hooks/useDummyStudent";
import { useStudentDashboardData } from "@/hooks/useStudentDashboardData";
import { useInboxCompose } from "@/hooks/useInboxCompose";
import {
  acknowledgeInboxAnnouncement, getComposeContacts, getComposeTemplates, getEmailSettings, getInboxUnread, getReplyDraft, listInbox, listInboxSent,
  markAllInboxRead, openInboxAnnouncement, openInboxEmail, openInboxNotification, saveEmailSetting, toggleInboxStar,
} from "@/services/inboxApi";
import { resolveTimeZone } from "@/utils/attendanceDates";
import { getDummyInbox } from "@/utils/dummyInbox";
import {
  DEFAULT_INBOX_FILTERS, EMPTY_INBOX, EMPTY_SENT, INBOX_FOLDERS, SEND_ERROR, SEND_UNREACHABLE, SENT_FOLDER, SETTING_OFF, SETTING_ON, emailSettingRows,
  inboxListRequest, listSummary, shownFileName,
} from "@/utils/inbox";
import { getBrowserTimezone } from "@/utils/calendarEvents";
import { SessionExpiredError, isSessionExpired, isSessionExpiredError, markSessionExpired } from "@/utils/sessionState";

/**
 * Inbox (Communication) — everything the page does, for both looks (components/student/inbox, components/k5/pages).
 * The page only draws what this returns and calls its actions; it never talks to a server itself.
 *
 * Two sources answer the same calls in the same shapes:
 *   live  — services/inboxApi.js (Server Actions) plus the two routes under /api/inbox for the email text and files;
 *   dummy — utils/dummyInbox.js for a demo student (hooks/useDummyStudent.js), nothing leaves the browser.
 * Rules copied from the existing page (is-rest-api inbox.js): filters apply on "Apply", a folder change reloads at
 * once from page 1, opening an item marks it read, and the unread count follows after open / mark all as read.
 */

const ATTACHMENT_ERROR = "This attachment cannot be opened just now. Please try again later.";
const BODY_ERROR = "This email could not be shown just now.";

/** A Server Action answer -> its data, or an Error carrying the server's own message. */
async function ask(action) {
  if (isSessionExpired()) throw new SessionExpiredError();
  const result = await action();
  if (result?.ok) return result.data;
  if (result?.sessionExpired) {
    markSessionExpired();
    throw new SessionExpiredError();
  }
  throw new Error(result?.message || "Your inbox could not be loaded just now. Please try again in a minute.");
}

/** A route under /api/inbox (a page fetch, so the tab's account header goes with it). */
async function fetchRoute(path, payload, fallback) {
  if (isSessionExpired()) throw new SessionExpiredError();
  const response = await fetch(`${path}?payload=${encodeURIComponent(payload)}`, { cache: "no-store" });
  if (response.status === 401) {
    markSessionExpired();
    throw new SessionExpiredError();
  }
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.message || fallback);
  return response;
}

const liveInbox = {
  dummy: false,
  list: (request) => ask(() => listInbox(request)),
  unread: () => ask(() => getInboxUnread()),
  async openEmail(id) {
    const email = await ask(() => openInboxEmail({ id }));
    // The email's own HTML is fetched as text and shown in a sandboxed frame (never put into the page).
    const bodyHtml = email.contentPayload
      ? await fetchRoute("/api/inbox/email-content", email.contentPayload, BODY_ERROR).then((r) => r.text()).catch((error) => {
          if (isSessionExpiredError(error)) throw error;
          return "";
        })
      : "";
    return { ...email, bodyHtml };
  },
  openNotification: (id) => ask(() => openInboxNotification({ id })),
  openAnnouncement: (id) => ask(() => openInboxAnnouncement({ id })),
  acknowledge: (id) => ask(() => acknowledgeInboxAnnouncement({ id })),
  markAllRead: () => ask(() => markAllInboxRead()),
  star: (channel, id) => ask(() => toggleInboxStar({ channel, id })),
  downloadAttachment: (attachment) => fetchRoute("/api/inbox/attachment", attachment.payload, ATTACHMENT_ERROR).then((r) => r.blob()),
  contacts: () => ask(() => getComposeContacts()),
  replyDraft: (id) => ask(() => getReplyDraft({ id })),
  sent: (request) => ask(() => listInboxSent(request)),
  emailSettings: () => ask(() => getEmailSettings()),
  saveEmailSetting: (key, on) => ask(() => saveEmailSetting({ key, on })),
  templates: (recipientKind) => ask(() => getComposeTemplates({ recipientKind })),
  /** Multipart to app/api/inbox/send (files do not fit a Server Action). -> the backend's send result. */
  async send({ to, subject, message, inReplyToId, files }) {
    if (isSessionExpired()) throw new SessionExpiredError();
    const form = new FormData();
    form.append("to", JSON.stringify(to));
    form.append("subject", subject);
    form.append("message", message);
    if (inReplyToId) form.append("inReplyToId", String(inReplyToId));
    files.forEach((file) => form.append("files", file, file.name));
    let response;
    try {
      response = await fetch("/api/inbox/send", { method: "POST", body: form });
    } catch {
      throw new Error(SEND_UNREACHABLE);
    }
    if (response.status === 401) {
      markSessionExpired();
      throw new SessionExpiredError();
    }
    const answer = await response.json().catch(() => null);
    if (!response.ok || !answer?.data) throw new Error(answer?.message || SEND_ERROR);
    return answer.data;
  },
};

/** A Sent row in the shape of an inbox row, so the same list and reader show it (it opens as the email it is). */
const sentAsItem = (item) => ({ channel: "EMAIL", id: item.id, at: item.at, title: item.subject, sender: "", read: true, starred: false, attachments: item.attachments, undelivered: false, sent: item });

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const say = (error) => {
  if (!isSessionExpiredError(error)) toast.error(error?.message || "Your inbox could not be loaded just now. Please try again in a minute.");
};

/** The inbox source for this student (live or dummy), the key that scopes its cached answers, and the time zone. */
function useInboxSource() {
  const { context, isK5, isMiddle, isHigh } = useDashboardContext();
  const dummy = useDummyStudent();
  const dashboardData = useStudentDashboardData({ schoolUUID: context?.schoolUUID, userId: context?.userId });
  const userId = context?.userId;
  const band = !isK5 || isHigh ? "high" : isMiddle ? "middle" : "elementary";
  const studentName = context?.userName || "";
  const schoolName = context?.schoolName || "";

  const source = useMemo(
    () => (dummy.enabled ? getDummyInbox({ key: `${userId}|${band}|${dummy.key}`, band, studentName, schoolName }) : liveInbox),
    [dummy.enabled, dummy.key, userId, band, studentName, schoolName],
  );
  // Dummy messages are placed around the viewer's own clock, so dummy mode shows them in the browser's zone.
  const timeZone = resolveTimeZone(dummy.enabled ? getBrowserTimezone() : dashboardData.userTimezone);
  const ready = Boolean(userId) && dummy.settled && (dummy.enabled || !dashboardData.isLoading);
  return { source, ready, timeZone, schoolName, scope: ["inbox", userId, dummy.key] };
}

/** { EMAIL, NOTIFICATION, ANNOUNCEMENT, TOTAL } unread in the last 30 days — the badge on the menu and the folders. */
export function useInboxUnread({ enabled = true } = {}) {
  const { source, ready, scope } = useInboxSource();
  const query = useQuery({
    queryKey: [...scope, "unread"],
    queryFn: () => source.unread(),
    enabled: enabled && ready,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  return query.data ?? { EMAIL: 0, NOTIFICATION: 0, ANNOUNCEMENT: 0, TOTAL: 0 };
}

export function useInbox() {
  const { source, ready, timeZone, schoolName, scope } = useInboxSource();
  const queryClient = useQueryClient();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [folder, setFolderState] = useState("ALL");
  const [filters, setFilters] = useState(DEFAULT_INBOX_FILTERS);
  const [page, setPage] = useState(1);
  const [opened, setOpened] = useState(null); // the list row that is open in the reader
  const [downloading, setDownloading] = useState("");

  const isSent = folder === SENT_FOLDER.key;
  const request = useMemo(() => inboxListRequest({ folder, filters, page, timeZone }), [folder, filters, page, timeZone]);
  const listQuery = useQuery({
    // The Sent folder is its own call; only the dates and the search apply to it, as on the existing page.
    queryKey: [...scope, "list", request],
    queryFn: async () => {
      if (!isSent) return source.list(request);
      const sent = await source.sent({ from: request.from, to: request.to, search: request.search, page: request.page, pageSize: request.pageSize });
      return { ...sent, items: (sent.items || []).map(sentAsItem) };
    },
    enabled: ready,
    // The rows stay while the next page / folder loads; an older answer can never replace a newer one.
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const unread = useInboxUnread();

  // Who this student may write to. Any failure reads as "writing is off": no Write button, no Sent folder.
  const mailboxQuery = useQuery({
    queryKey: [...scope, "mailbox"],
    queryFn: () => source.contacts().catch((error) => (isSessionExpiredError(error) ? Promise.reject(error) : null)),
    enabled: ready,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const mailbox = mailboxQuery.data ?? null;

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: [...scope, "list"] });
    queryClient.invalidateQueries({ queryKey: [...scope, "unread"] });
  };

  // Opening: emails, notifications and announcements are fetched (and marked read by that call);
  // a WhatsApp row has nothing more on the server, so it opens from the list as it is.
  const itemQuery = useQuery({
    queryKey: [...scope, "item", opened?.channel, opened?.id],
    queryFn: async () => {
      const detail =
        opened.channel === "EMAIL" ? await source.openEmail(opened.id)
        : opened.channel === "NOTIFICATION" ? await source.openNotification(opened.id)
        : opened.channel === "ANNOUNCEMENT" ? await source.openAnnouncement(opened.id)
        : {};
      if (opened.channel !== "WHATSAPP") refresh();
      return detail;
    },
    enabled: ready && Boolean(opened),
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const starMutation = useMutation({
    mutationFn: (item) => source.star(item.channel, item.id),
    onSuccess: (data, item) => {
      setOpened((current) => (current && current.channel === item.channel && current.id === item.id ? { ...current, starred: data.starred } : current));
      queryClient.invalidateQueries({ queryKey: [...scope, "list"] });
    },
    onError: say,
  });
  const markAllMutation = useMutation({ mutationFn: () => source.markAllRead(), onSuccess: refresh, onError: say });
  const acknowledgeMutation = useMutation({
    mutationFn: (id) => source.acknowledge(id),
    onSuccess: () => queryClient.setQueryData([...scope, "item", opened?.channel, opened?.id], (detail) => (detail ? { ...detail, acknowledged: true, justAcknowledged: true } : detail)),
    onError: say,
  });

  // Email settings: read each time the panel opens; a change is saved at once and the panel shows the backend's answer.
  const settingsKey = [...scope, "email-settings"];
  const settingsQuery = useQuery({
    queryKey: settingsKey,
    queryFn: () => source.emailSettings(),
    enabled: ready && settingsOpen,
    staleTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const settingMutation = useMutation({
    mutationFn: ({ key, on }) => source.saveEmailSetting(key, on),
    onSuccess: (settings, { on }) => {
      queryClient.setQueryData(settingsKey, settings);
      toast.success(on ? SETTING_ON : SETTING_OFF);
    },
    onError: say,
  });

  const compose = useInboxCompose({
    source,
    scope,
    schoolName,
    mailbox,
    reloadMailbox: () => mailboxQuery.refetch(),
    onSent: () => queryClient.invalidateQueries({ queryKey: [...scope, "list"] }),
  });

  const data = listQuery.data;
  const items = data?.items ?? [];
  const summary = listSummary({ total: data?.total ?? 0, page: data?.page ?? page, pageSize: data?.pageSize ?? request.pageSize, lastPage: data?.lastPage ?? 1, shown: items.length });
  return {
    ready,
    timeZone,
    isDummy: source.dummy,

    // Write a message / Reply / the Sent folder exist only where the school has writing switched on.
    mailbox: { isLoaded: mailboxQuery.isFetched, enabled: Boolean(mailbox?.enabled), canCompose: Boolean(mailbox?.canCompose), reason: mailbox?.reason || "" },
    compose,
    folders: mailbox?.enabled ? [...INBOX_FOLDERS, SENT_FOLDER] : INBOX_FOLDERS,
    settings: {
      isOpen: settingsOpen,
      open: () => setSettingsOpen(true),
      close: () => setSettingsOpen(false),
      isLoading: settingsQuery.isLoading,
      error: settingsQuery.error && !isSessionExpiredError(settingsQuery.error) ? settingsQuery.error.message : "",
      rows: emailSettingRows(settingsQuery.data),
      savingKey: settingMutation.isPending ? settingMutation.variables?.key : "",
      change: (key, on) => !settingMutation.isPending && settingMutation.mutate({ key, on }),
    },
    isSent,

    folder,
    setFolder: (next) => {
      setFolderState(next);
      setPage(1);
      setOpened(null);
    },
    filters,
    applyFilters: (next) => {
      setFilters({ ...DEFAULT_INBOX_FILTERS, ...next });
      setPage(1);
      setOpened(null);
    },

    list: {
      isLoading: !ready || listQuery.isLoading,
      isFetching: listQuery.isFetching,
      error: listQuery.error && !isSessionExpiredError(listQuery.error) ? listQuery.error.message : "",
      items,
      total: data?.total ?? 0,
      page: data?.page ?? page,
      lastPage: data?.lastPage ?? 1,
      summary: isSent && summary.count ? { ...summary, count: `${(data?.total ?? 0).toLocaleString()} sent` } : summary,
      emptyText: isSent ? EMPTY_SENT : EMPTY_INBOX,
      retry: () => listQuery.refetch(),
    },
    goToPage: (next) => next >= 1 && next <= (data?.lastPage ?? 1) && setPage(next),

    unread,
    markAllRead: () => markAllMutation.mutate(),
    isMarkingAll: markAllMutation.isPending,

    opened,
    openItem: (item) => setOpened(item),
    closeItem: () => setOpened(null),
    reader: {
      isLoading: Boolean(opened) && itemQuery.isLoading,
      error: itemQuery.error && !isSessionExpiredError(itemQuery.error) ? itemQuery.error.message : "",
      detail: itemQuery.data ?? null,
    },

    toggleStar: (item) => !starMutation.isPending && starMutation.mutate(item),
    acknowledge: () => opened && acknowledgeMutation.mutate(opened.id),
    isAcknowledging: acknowledgeMutation.isPending,

    downloading,
    downloadAttachment: async (attachment) => {
      if (downloading) return;
      setDownloading(attachment.name);
      try {
        saveBlob(await source.downloadAttachment(attachment), shownFileName(attachment.name));
      } catch (error) {
        say(error);
      } finally {
        setDownloading("");
      }
    },
  };
}
