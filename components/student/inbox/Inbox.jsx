"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Download, FileText, Filter, Inbox as InboxIcon, Mail, Megaphone, MessageCircle, Paperclip, PenLine, Reply, Send, Settings, Star } from "lucide-react";
import { K5Inbox } from "@/components/k5/pages/K5Inbox";
import { InboxCompose, InboxSettings } from "@/components/student/inbox/InboxCompose";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { useInbox } from "@/hooks/useInbox";
import { getAttachmentUrl } from "@/utils/announcementAttachment";
import {
  DATE_PRESETS, DEFAULT_INBOX_FILTERS, INBOX_CATEGORIES, INBOX_SUBTITLE, NO_SUBJECT, READ_OPTIONS, UNDELIVERED_NOTICE,
  UNDELIVERED_ROW, WHATSAPP_NOTE, WHATSAPP_UNDELIVERED, activeFilterCount, categoryLabel, channelLabel, fullTime, initialsOf, plainText, rowTime,
  sentRow, sentToLine, shownFileName, splitSender,
} from "@/utils/inbox";

const FOLDER_ICONS = { ALL: InboxIcon, EMAIL: Mail, NOTIFICATION: Bell, ANNOUNCEMENT: Megaphone, WHATSAPP: MessageCircle, SENT: Send };
const UNREAD_KEY = { ALL: "TOTAL", EMAIL: "EMAIL", NOTIFICATION: "NOTIFICATION", ANNOUNCEMENT: "ANNOUNCEMENT" };
const TINT = { EMAIL: "bg-blue-50", NOTIFICATION: "bg-amber-50", ANNOUNCEMENT: "bg-violet-50", WHATSAPP: "bg-green-50" };
const BTN = "inline-flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-white px-3.5 text-sm font-semibold text-black disabled:cursor-default disabled:opacity-45";
const BTN_PRIMARY = "inline-flex min-h-10 cursor-pointer items-center gap-2 whitespace-nowrap rounded-md border border-primary bg-primary px-4 text-sm font-semibold text-white disabled:cursor-default disabled:opacity-45";
const FIELD = "min-h-10 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm text-black outline-none focus:border-primary";
const CARD = "rounded-[10px] border border-slate-200 bg-white";

function PlainFilters({ inbox }) {
  const [draft, setDraft] = useState(inbox.filters);
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  return (
    <form
      id="inbox-filters"
      className={`${CARD} grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3 p-4`}
      onSubmit={(event) => {
        event.preventDefault();
        inbox.applyFilters(draft);
      }}
    >
      <label className="flex flex-col gap-1 text-sm font-semibold text-black">
        Search
        <input type="search" maxLength={200} value={draft.search} onChange={(e) => set({ search: e.target.value })} placeholder="Name, subject or words" className={FIELD} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-black">
        Date
        <select value={draft.date} onChange={(e) => set({ date: e.target.value })} className={FIELD}>
          {DATE_PRESETS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      {!inbox.isSent && (
        <>
      <label className="flex flex-col gap-1 text-sm font-semibold text-black">
        Show
        <select value={draft.read} onChange={(e) => set({ read: e.target.value })} className={FIELD}>
          {READ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm font-semibold text-black">
        Email category
        <select value={draft.category} onChange={(e) => set({ category: e.target.value })} className={FIELD}>
          <option value="">Any category</option>
          {INBOX_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <div className="flex flex-col gap-1.5 text-sm text-black">
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={draft.withAttachments} onChange={(e) => set({ withAttachments: e.target.checked })} className="h-4 w-4 accent-primary" />
          With attachments
        </label>
        <label className="flex cursor-pointer items-center gap-2">
          <input type="checkbox" checked={draft.starred} onChange={(e) => set({ starred: e.target.checked })} className="h-4 w-4 accent-primary" />
          Starred
        </label>
      </div>
        </>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => {
            setDraft(DEFAULT_INBOX_FILTERS);
            inbox.applyFilters(DEFAULT_INBOX_FILTERS);
          }}
          className={`${BTN} flex-1 justify-center`}
        >
          Reset
        </button>
        <button type="submit" className={`${BTN_PRIMARY} flex-1 justify-center`}>Apply</button>
      </div>
    </form>
  );
}

function PlainReader({ inbox }) {
  const { opened, reader, timeZone } = inbox;
  const detail = reader.detail;
  const channel = opened.channel;
  const title = detail?.subject || detail?.title || opened.title || (channel === "WHATSAPP" ? "WhatsApp message" : NO_SUBJECT);
  const { name, role } = splitSender(detail?.sender || opened.sender);
  const category = channel === "EMAIL" ? detail?.category || opened.category : "";
  const attachments = channel === "EMAIL" ? detail?.attachments || [] : [];
  const announcementFile = channel === "ANNOUNCEMENT" ? getAttachmentUrl(detail?.attachment) : null;
  const notice = "m-0 rounded-md border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-sm text-black";
  return (
    <article className="flex flex-col gap-4 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button type="button" onClick={inbox.closeItem} className={BTN}>
          <ChevronLeft className="h-4 w-4 text-primary" aria-hidden="true" />
          Back to inbox
        </button>
        {!opened.sent && (
          <button type="button" aria-pressed={Boolean(opened.starred)} onClick={() => inbox.toggleStar(opened)} className={BTN}>
            <Star className={`h-4 w-4 ${opened.starred ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} aria-hidden="true" />
            {opened.starred ? "Remove star" : "Star"}
          </button>
        )}
      </div>
      {reader.isLoading ? (
        <div role="status" aria-busy="true" className="flex flex-col gap-3">
          <span className="sr-only">Opening the message…</span>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
      ) : reader.error ? (
        <p role="alert" className="m-0 rounded-md bg-red-50 px-3.5 py-2.5 text-sm font-semibold text-red-700">{reader.error}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold text-black ${TINT[channel]}`}>{channelLabel(channel)}</span>
              {category && <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-black">{categoryLabel(category)}</span>}
            </div>
            <h2 className="m-0 text-xl font-bold text-black [overflow-wrap:anywhere]">{title}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-3">
            <span aria-hidden="true" className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-sm font-bold text-black ${TINT[channel]}`}>{initialsOf(name)}</span>
            <div className="flex min-w-0 flex-[1_1_220px] flex-col">
              <span className="font-semibold text-black">
                {name}
                {role && <span className="font-normal text-black/60"> · {role}</span>}
              </span>
              <span className="text-xs text-black/60 [overflow-wrap:anywhere]">{opened.sent ? `To: ${sentToLine(opened.sent)}` : "to me"}</span>
            </div>
            <span className="text-xs font-semibold text-black/60">{fullTime(detail?.at || opened.at, timeZone)}</span>
          </div>
          {detail?.inReplyTo && (
            <p className="m-0 text-sm text-black/60">
              In reply to{" "}
              {detail.inReplyTo.visible ? (
                <button type="button" onClick={() => inbox.openItem({ channel: "EMAIL", id: detail.inReplyTo.id, title: detail.inReplyTo.subject })} className="cursor-pointer border-none bg-transparent p-0 font-semibold text-primary underline">
                  {detail.inReplyTo.subject || NO_SUBJECT}
                </button>
              ) : (
                "an earlier message"
              )}
            </p>
          )}
          {channel === "EMAIL" && (detail?.undelivered ?? opened.undelivered) && <p role="note" className={notice}>{UNDELIVERED_NOTICE}</p>}
          {channel === "EMAIL" &&
            (detail?.bodyHtml ? (
              <iframe title={title} sandbox="allow-same-origin allow-popups" referrerPolicy="no-referrer" srcDoc={`<base target="_blank">${detail.bodyHtml}`} className="h-[480px] w-full rounded-md border border-slate-200 bg-white" />
            ) : (
              <div className="whitespace-pre-line text-sm leading-relaxed text-black [overflow-wrap:anywhere]">{detail?.bodyText || "The text of this email is not available."}</div>
            ))}
          {(channel === "NOTIFICATION" || channel === "ANNOUNCEMENT") && <div className="whitespace-pre-line text-sm leading-relaxed text-black [overflow-wrap:anywhere]">{plainText(detail?.message)}</div>}
          {channel === "WHATSAPP" && (
            <>
              <p className={opened.undelivered ? notice : "m-0 text-sm text-black"}>
                {opened.preview}
                {opened.undelivered && WHATSAPP_UNDELIVERED}
              </p>
              <p className="m-0 text-sm text-black/60">{WHATSAPP_NOTE}</p>
            </>
          )}
          {(attachments.length > 0 || announcementFile) && (
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-black">
                <Paperclip className="h-4 w-4 text-slate-400" aria-hidden="true" />
                Attachments
              </span>
              <div className="flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <button key={file.name} type="button" disabled={Boolean(inbox.downloading)} onClick={() => inbox.downloadAttachment(file)} className={BTN}>
                    <FileText className="h-4 w-4 text-red-600" aria-hidden="true" />
                    {inbox.downloading === file.name ? "Preparing…" : shownFileName(file.name)}
                    <Download className="h-4 w-4 text-primary" aria-hidden="true" />
                  </button>
                ))}
                {announcementFile && (
                  <a href={announcementFile} target="_blank" rel="noopener noreferrer" className={`${BTN} no-underline`}>
                    <FileText className="h-4 w-4 text-red-600" aria-hidden="true" />
                    Attachment
                  </a>
                )}
              </div>
            </div>
          )}
          {channel === "EMAIL" && detail?.canReply && inbox.mailbox.enabled && (
            <div>
              <button type="button" disabled={inbox.compose.isLoadingReply} onClick={() => inbox.compose.openReply(detail.id)} className={BTN_PRIMARY}>
                <Reply className="h-4 w-4" aria-hidden="true" />
                Reply
              </button>
            </div>
          )}
          {channel === "ANNOUNCEMENT" && detail?.requiresAck &&
            (detail.acknowledged ? (
              <p role="status" className="m-0 rounded-md bg-green-50 px-3.5 py-2.5 text-sm font-semibold text-green-700">
                {detail.justAcknowledged ? "Thank you. You confirmed you have read this." : "You confirmed you have read this."}
              </p>
            ) : (
              <div className={`${notice} flex flex-wrap items-center gap-3`}>
                <span className="flex-[1_1_240px] font-semibold">The school asked you to confirm you have read this.</span>
                <button type="button" disabled={inbox.isAcknowledging} onClick={inbox.acknowledge} className={BTN_PRIMARY}>I have read this</button>
              </div>
            ))}
        </>
      )}
    </article>
  );
}

function PlainList({ inbox }) {
  const { list } = inbox;
  const folderUnread = inbox.unread[UNREAD_KEY[inbox.folder]] || 0;
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-sm">
        <span aria-live="polite" className="font-semibold text-black">
          {list.isLoading ? "Loading…" : list.total ? `${list.summary.count}${folderUnread ? ` · ${folderUnread} unread` : ""}` : "No messages"}
        </span>
        <span className="text-black/60">{list.summary.range}</span>
      </div>
      {list.summary.note && <p className="m-0 border-b border-slate-200 bg-amber-50 px-4 py-2 text-xs text-black">{list.summary.note}</p>}
      {list.isLoading ? (
        <div role="status" aria-busy="true">
          <span className="sr-only">Loading your inbox…</span>
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <Skeleton className="h-9 w-9 flex-none rounded-full" />
              <Skeleton className="h-4 w-32 flex-none" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      ) : list.error ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-4 py-8 text-center">
          <p className="m-0 text-sm text-black/60">{list.error}</p>
          <button type="button" onClick={list.retry} className={BTN}>Try again</button>
        </div>
      ) : list.items.length === 0 ? (
        <p className="m-0 px-4 py-8 text-center text-sm text-black/50">{list.emptyText}</p>
      ) : (
        <div role="list" className={list.isFetching ? "opacity-60" : ""}>
          {list.items.map((item) => {
            if (item.sent) {
              const row = sentRow(item.sent);
              return (
                <div key={`SENT:${item.id}`} role="listitem" className="border-b border-slate-200 bg-slate-50">
                  <button type="button" onClick={() => inbox.openItem(item)} className="grid w-full cursor-pointer grid-cols-[minmax(110px,230px)_minmax(0,1fr)_auto] items-center gap-3 border-none bg-transparent px-4 py-2.5 text-left text-sm text-black max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1">
                    <span className="truncate font-medium">To: {row.to}</span>
                    <span className="min-w-0 truncate max-md:col-span-2 max-md:row-start-2 max-md:line-clamp-2 max-md:whitespace-normal">
                      <span className="font-medium">{item.title || NO_SUBJECT}</span>
                      {row.note && <span className={row.failed ? "font-semibold text-red-700" : "text-black/60"}> · {row.note}</span>}
                    </span>
                    <span className="flex items-center gap-2 justify-self-end whitespace-nowrap text-xs text-black/60 max-md:col-start-2 max-md:row-start-1">
                      {item.attachments && <Paperclip role="img" aria-label="Attachments" className="h-3.5 w-3.5 text-slate-400" />}
                      {rowTime(item.at, inbox.timeZone)}
                    </span>
                  </button>
                </div>
              );
            }
            const { name } = splitSender(item.sender);
            const unread = !item.read;
            const time = rowTime(item.at, inbox.timeZone);
            const title = item.title || NO_SUBJECT;
            return (
              <div key={`${item.channel}:${item.id}`} role="listitem" className={`flex items-stretch border-b border-slate-200 ${unread ? "bg-white shadow-[inset_3px_0_0_var(--primary)]" : "bg-slate-50"}`}>
                <button type="button" aria-pressed={item.starred} aria-label={item.starred ? "Remove star" : "Star"} onClick={() => inbox.toggleStar(item)} className="flex w-11 flex-none cursor-pointer items-center justify-center border-none bg-transparent p-0">
                  <Star className={`h-4 w-4 ${item.starred ? "fill-amber-400 text-amber-400" : "text-slate-400"}`} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => inbox.openItem(item)}
                  aria-label={`${unread ? "Unread, " : ""}${channelLabel(item.channel)}, ${name}, ${title}, ${time}`}
                  className="grid min-w-0 flex-1 cursor-pointer grid-cols-[36px_minmax(110px,190px)_minmax(0,1fr)_auto] items-center gap-3 border-none bg-transparent py-2.5 pl-0 pr-4 text-left text-sm text-black max-md:grid-cols-[36px_minmax(0,1fr)_auto] max-md:gap-y-1"
                >
                  <span aria-hidden="true" className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${TINT[item.channel]}`}>{initialsOf(name)}</span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className={`truncate ${unread ? "font-bold" : "font-medium"}`}>{name}</span>
                    <span className={`self-start rounded-full px-2 text-[11px] font-semibold ${TINT[item.channel]}`}>{channelLabel(item.channel)}</span>
                  </span>
                  <span className="min-w-0 truncate max-md:col-span-2 max-md:col-start-2 max-md:row-start-2 max-md:line-clamp-2 max-md:whitespace-normal">
                    <span className={unread ? "font-bold" : "font-medium"}>{title}</span>
                    {item.preview && <span className="text-black/60"> – {plainText(item.preview)}</span>}
                    {item.undelivered && item.channel === "EMAIL" && <span className="font-semibold text-red-700"> · {UNDELIVERED_ROW}</span>}
                  </span>
                  <span className={`flex items-center gap-2 justify-self-end whitespace-nowrap text-xs max-md:col-start-3 max-md:row-start-1 ${unread ? "font-bold text-black" : "text-black/60"}`}>
                    {item.attachments && <Paperclip role="img" aria-label="Attachments" className="h-3.5 w-3.5 text-slate-400" />}
                    {unread && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-primary" />}
                    {time}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
      <nav aria-label="Pages" className="flex items-center justify-between gap-2 px-4 py-3">
        <button type="button" disabled={list.page <= 1} onClick={() => inbox.goToPage(list.page - 1)} className={BTN}>
          <ChevronLeft className="h-4 w-4 text-primary" aria-hidden="true" />
          Newer
        </button>
        {list.total > 0 && <span className="text-xs text-black/60">Page {list.page} of {list.lastPage}</span>}
        <button type="button" disabled={list.page >= list.lastPage} onClick={() => inbox.goToPage(list.page + 1)} className={BTN}>
          Older
          <ChevronRight className="h-4 w-4 text-primary" aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}

/**
 * Inbox (Communication > Inbox, pageLink "inbox") — the existing page (is-rest-api inbox.js) in Next.js: emails,
 * notifications, announcements and WhatsApp messages from the school, with folders, filters, pages, stars and the
 * open message. Students with a grade look (K–5 Playful, 6–8 Balanced, 9–12 Mature) get K5Inbox; everyone else this
 * plain layout in the standard shell. Both draw the same hook (hooks/useInbox.js).
 * `openCompose` (pageLink "inbox-compose") opens the page with "Write a message" open.
 */
export function Inbox({ openCompose = false }) {
  const { isK5 } = useDashboardContext();
  const inbox = useInbox();
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Arriving through Communication > Compose: the panel opens once the backend has said who may be written to
  // (and says why not, when writing is off) — the existing page's initInbox({ compose: true }).
  const arrived = useRef(false);
  const mailboxLoaded = inbox.mailbox.isLoaded;
  const openComposePanel = inbox.compose.open;
  useEffect(() => {
    if (!openCompose || !mailboxLoaded || arrived.current) return;
    arrived.current = true;
    openComposePanel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openCompose, mailboxLoaded]);

  if (isK5) return <K5Inbox inbox={inbox} />;

  const filterCount = activeFilterCount(inbox.filters);
  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 px-1">
        <span className="flex h-11 w-11 flex-none items-center justify-center rounded-[10px] bg-primary/10">
          <InboxIcon className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
        <div className="flex min-w-0 flex-[1_1_260px] flex-col">
          <h1 className="m-0 text-lg font-bold text-black sm:text-xl">Inbox</h1>
          <p className="m-0 text-sm text-black/60">{INBOX_SUBTITLE}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {inbox.mailbox.canCompose && (
            <button type="button" onClick={inbox.compose.open} className={BTN_PRIMARY}>
              <PenLine className="h-4 w-4" aria-hidden="true" />
              Write a message
            </button>
          )}
          <button type="button" aria-haspopup="dialog" onClick={inbox.settings.open} className={BTN}>
            <Settings className="h-4 w-4 text-primary" aria-hidden="true" />
            Email settings
          </button>
          <button type="button" disabled={inbox.isMarkingAll} onClick={inbox.markAllRead} className={BTN}>
            <CheckCheck className="h-4 w-4 text-primary" aria-hidden="true" />
            Mark all as read
          </button>
          <button type="button" aria-expanded={filtersOpen} aria-controls="inbox-filters" onClick={() => setFiltersOpen((v) => !v)} className={BTN}>
            <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
            Filters
            {filterCount > 0 && <span className="rounded-full bg-primary px-1.5 text-xs text-white">{filterCount}</span>}
          </button>
        </div>
      </div>

      <div className="flex items-start gap-4 max-md:flex-col max-md:items-stretch">
        <nav aria-label="Folders" className={`${CARD} flex flex-[0_0_210px] flex-col gap-1 p-2 max-md:flex-none max-md:flex-row max-md:overflow-x-auto`}>
          {inbox.folders.map((folder) => {
            const Icon = FOLDER_ICONS[folder.key];
            const selected = inbox.folder === folder.key;
            const count = inbox.unread[UNREAD_KEY[folder.key]] || 0;
            return (
              <button
                key={folder.key}
                type="button"
                aria-current={selected ? "true" : undefined}
                onClick={() => inbox.setFolder(folder.key)}
                className={`flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-md border-none px-3 text-left text-sm text-black max-md:w-auto max-md:flex-none ${selected ? "bg-primary/10 font-bold" : "bg-transparent font-medium hover:bg-slate-100"}`}
              >
                <Icon className={`h-[18px] w-[18px] flex-none ${selected ? "text-primary" : "text-slate-500"}`} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{folder.label}</span>
                {count > 0 && (
                  <span className="flex-none text-xs font-semibold">
                    {count > 99 ? "99+" : count}
                    <span className="sr-only"> unread</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {filtersOpen && <PlainFilters inbox={inbox} />}
          <section aria-label={inbox.opened ? "Message" : "Messages"} className={`${CARD} overflow-hidden`}>
            {inbox.opened ? <PlainReader inbox={inbox} /> : <PlainList inbox={inbox} />}
          </section>
        </div>
      </div>
      <InboxCompose compose={inbox.compose} />
      <InboxSettings settings={inbox.settings} />
    </div>
  );
}
