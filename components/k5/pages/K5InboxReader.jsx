"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, ChevronLeft, Download, FileText, Paperclip, Reply, Star } from "lucide-react";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { getAttachmentUrl } from "@/utils/announcementAttachment";
import { labelKey } from "@/i18n/labels";
import { useLocaleTag } from "@/i18n/dateLocale";
import { resolveTimeZone, todayYmd } from "@/utils/attendanceDates";
import {
  EMPTY_INBOX, EMPTY_SENT, NO_SUBJECT, SEND_ERROR, SEND_UNREACHABLE, categoryLabel, initialsOf, plainText, shownFileName,
  splitSender,
} from "@/utils/inbox";

// Channel colour of the design (CH): the avatar and the type chip of a message.
export const CHANNEL_TINT = { EMAIL: "bg-k5-bt", NOTIFICATION: "bg-k5-yt", ANNOUNCEMENT: "bg-k5-vt", WHATSAPP: "bg-k5-gt" };
export const CM_BTN =
  "k5-cm-btn k5h-cm-btn inline-flex min-h-[48px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-line bg-k5-card px-[18px] text-[16px] font-black text-k5-ink shadow-[0_4px_0_var(--k5-line)] disabled:cursor-default disabled:opacity-45";
export const CM_BTN_PRIMARY =
  "k5-cm-btn k5h-cm-btn k5h-cm-btnp inline-flex min-h-[48px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 text-[16px] font-black text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-45";

// English that utils/inbox and hooks/useInbox(Compose) hand these pages, by text -> k5Inbox.known.<key>. Anything
// else (the backend's own messages, names, subjects) is shown as it is.
const KNOWN_TEXT = {
  [NO_SUBJECT]: "noSubject",
  [EMPTY_INBOX]: "emptyInbox",
  [EMPTY_SENT]: "emptySent",
  [SEND_ERROR]: "sendError",
  [SEND_UNREACHABLE]: "sendUnreachable",
  "Your inbox could not be loaded just now. Please try again in a minute.": "loadError",
  "This email could not be shown just now.": "bodyError",
  "Please choose at least one person to write to.": "chooseSomeone",
  "Please add a subject.": "addSubject",
  "Please write your message.": "writeMessage",
  "You can attach at most 3 files to one message.": "maxFiles",
  "No attachment found: your message mentions an attachment or a file, but nothing is attached.": "warnAttachment",
  "Something is still to fill in: the subject or message has a word in <angle> or [square] brackets from the template.": "warnTemplate",
  "You have an unsent reply. Send it, or choose Discard and start again.": "unsentReply",
  "You have an unsent message. Send it, or choose Discard and start again.": "unsentMessage",
  "To a teacher": "toTeacher",
  "To the school office": "toOffice",
  "To a student": "toStudent",
  "To a parent": "toParent",
  "To a school admin": "toAdmin",
  "To anyone": "toAnyone",
  Attachment: "attachment",
  School: "school",
};
const KNOWN_PATTERNS = [
  [/^The file "(.+)" cannot be attached\. /, "fileType"],
  [/^The file "(.+)" is larger than 5 MB\./, "fileTooBig"],
  [/^The file "(.+)" is empty\./, "fileEmpty"],
];
const TOO_MANY = /^You can write to at most (\d+) people in one message\.$/;

const partsIn = (epoch, timeZone, tag, options) => new Intl.DateTimeFormat(tag, { timeZone: resolveTimeZone(timeZone), ...options }).format(new Date(epoch));

/**
 * The inbox words of utils/inbox, in the dashboard language: tx(text) for the known English strings, channel / folder /
 * category names, and utils/inbox rowTime / fullTime with the language's month and day names (same time zone rules).
 */
export function useK5InboxText() {
  const t = useTranslations("k5Inbox");
  const tag = useLocaleTag();
  const tx = useCallback(
    (text) => {
      if (!text) return text;
      if (KNOWN_TEXT[text]) return t(`known.${KNOWN_TEXT[text]}`);
      for (const [pattern, key] of KNOWN_PATTERNS) {
        const match = pattern.exec(text);
        if (match) return t(`known.${key}`, { name: match[1] });
      }
      const many = TOO_MANY.exec(text);
      return many ? t("known.tooManyPeople", { max: Number(many[1]) }) : text;
    },
    [t],
  );
  return useMemo(
    () => ({
      t,
      tx,
      channel: (channel) => (t.has(`channels.${labelKey(channel)}`) ? t(`channels.${labelKey(channel)}`) : t("channels.message")),
      folder: (folder) => (t.has(`folders.${labelKey(folder.key)}`) ? t(`folders.${labelKey(folder.key)}`) : folder.label),
      category: (category) => (t.has(`categories.${labelKey(category)}`) ? t(`categories.${labelKey(category)}`) : categoryLabel(category)),
      /** A row's time: "9:12 AM" today, "Oct 21" this year, "Oct 21, 2025" before that — in the student's time zone. */
      rowTime: (epoch, timeZone, now = new Date()) => {
        if (!epoch) return "";
        const zone = resolveTimeZone(timeZone);
        const day = todayYmd(zone, new Date(epoch));
        const today = todayYmd(zone, now);
        if (day === today) return partsIn(epoch, zone, tag, { hour: "numeric", minute: "2-digit" });
        if (day.slice(0, 4) === today.slice(0, 4)) return partsIn(epoch, zone, tag, { month: "short", day: "numeric" });
        return partsIn(epoch, zone, tag, { month: "short", day: "numeric", year: "numeric" });
      },
      /** The reader's time: "Thu, Oct 22, 2026, 9:12 AM" in the student's time zone. */
      fullTime: (epoch, timeZone) =>
        epoch ? partsIn(epoch, timeZone, tag, { weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "",
    }),
    [t, tx, tag],
  );
}

/**
 * The email's own HTML, shown in a frame that cannot run scripts or touch the page (sandbox, no allow-scripts).
 * The HTML arrives as text (hooks/useInbox.js) and is given to the frame with srcdoc; links open in a new tab.
 */
function EmailFrame({ html, title }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(480);
  const fit = () => {
    try {
      const doc = ref.current?.contentDocument;
      if (doc?.body) setHeight(Math.min(Math.max(doc.body.scrollHeight + 32, 120), 3000));
    } catch {
      // the frame keeps its default height
    }
  };
  useEffect(() => {
    const timer = setTimeout(fit, 600); // pictures inside the email may arrive after "load"
    return () => clearTimeout(timer);
  }, [html]);
  return (
    <iframe
      ref={ref}
      title={title}
      sandbox="allow-same-origin allow-popups"
      referrerPolicy="no-referrer"
      srcDoc={`<base target="_blank">${html}`}
      onLoad={fit}
      style={{ height }}
      className="w-full rounded-[14px] border-[3px] border-k5-line bg-white"
    />
  );
}

function ReaderSkeleton() {
  const t = useTranslations("k5Inbox");
  return (
    <K5Loading label={t("reader.opening")} className="flex flex-col gap-4">
      <K5Sk className="h-7 w-2/3" />
      <div className="flex items-center gap-3">
        <K5Sk className="h-[46px] w-[46px] flex-none rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <K5Sk className="h-4 w-56 max-w-full" />
          <K5Sk className="h-3 w-20" />
        </div>
      </div>
      <K5Sk className="h-4 w-full" />
      <K5Sk className="h-4 w-11/12" />
      <K5Sk className="h-4 w-3/5" />
    </K5Loading>
  );
}

/** "I have read this" for an announcement that asks for it (the existing page's acknowledge block). */
function Acknowledge({ detail, onAcknowledge, busy }) {
  const t = useTranslations("k5Inbox");
  if (!detail.requiresAck) return null;
  if (detail.acknowledged) {
    return (
      <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-k5-gt px-4 py-3 text-[16px] font-black text-k5-gx">
        <Check className="h-5 w-5 flex-none" strokeWidth={3} aria-hidden="true" />
        {detail.justAcknowledged ? t("reader.ackThanks") : t("reader.ackDone")}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3">
      <span className="flex-[1_1_240px] text-[16px] font-black text-k5-yx">{t("reader.ackAsk")}</span>
      <button type="button" disabled={busy} onClick={onAcknowledge} className={CM_BTN_PRIMARY}>
        {t("reader.ackButton")}
      </button>
    </div>
  );
}

/**
 * The open message, in place of the list (designs: .cmread): Back to inbox, Star, the type and category chips, the
 * subject, who wrote it and when, the text, attachments. Emails, notifications and announcements come from the
 * server (and are marked read by that call); a WhatsApp message shows what the list already had.
 */
export function K5InboxReader({ inbox }) {
  const { opened, reader, timeZone } = inbox;
  const text = useK5InboxText();
  const { t, tx } = text;
  const tc = useTranslations("common");
  const detail = reader.detail;
  const channel = opened.channel;
  const title = detail?.subject || detail?.title || opened.title || (channel === "WHATSAPP" ? t("reader.whatsappMessage") : tx(NO_SUBJECT));
  // utils/inbox sentToLine, with its English words translated.
  const sentToLine = (item) => {
    const people = (item.recipients || []).map((r) =>
      r.state === "NOT_SENT" ? t("reader.personNotSent", { name: r.name }) : r.state === "SENDING" ? t("reader.personSending", { name: r.name }) : r.name,
    );
    const more = (item.recipientCount || 0) - people.length;
    return more > 0 ? t("andMore", { list: people.join(", "), count: more }) : people.join(", ");
  };
  const { name, role } = splitSender(detail?.sender || opened.sender);
  const at = detail?.at || opened.at;
  const category = channel === "EMAIL" ? detail?.category || opened.category : "";
  const attachments = channel === "EMAIL" ? detail?.attachments || [] : [];
  const announcementFile = channel === "ANNOUNCEMENT" ? getAttachmentUrl(detail?.attachment) : null;
  const undelivered = detail?.undelivered ?? opened.undelivered;

  return (
    <article className="flex flex-col gap-4 px-[22px] pb-[22px] pt-[18px] max-[760px]:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <button type="button" onClick={inbox.closeItem} className={CM_BTN}>
          <ChevronLeft className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.6} aria-hidden="true" />
          {t("reader.back")}
        </button>
        {!opened.sent && (
          <button type="button" aria-pressed={Boolean(opened.starred)} onClick={() => inbox.toggleStar(opened)} className={CM_BTN}>
            <Star className={`h-5 w-5 flex-none ${opened.starred ? "fill-k5-hi text-k5-hi" : "text-k5-mut"}`} strokeWidth={2} aria-hidden="true" />
            {opened.starred ? t("removeStar") : t("star")}
          </button>
        )}
      </div>

      {reader.isLoading ? (
        <ReaderSkeleton />
      ) : reader.error ? (
        <p role="alert" className="m-0 rounded-[14px] bg-k5-rt px-4 py-3 text-[16px] font-black text-k5-ri">{tx(reader.error)}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-[3px] text-[14px] font-black text-k5-ink ${CHANNEL_TINT[channel]}`}>{text.channel(channel)}</span>
              {category && <span className="rounded-full bg-k5-soft px-3 py-[3px] text-[14px] font-black text-k5-ink">{text.category(category)}</span>}
            </div>
            <h2 className="m-0 font-k5-display text-[26px] font-semibold leading-[1.2] [overflow-wrap:anywhere]">{title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-k5-line pb-3.5">
            <span aria-hidden="true" className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-k5-ink ${CHANNEL_TINT[channel]}`}>
              {initialsOf(name)}
            </span>
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
              <span className="font-black">
                {tx(name)}
                {role && <span className="font-extrabold text-k5-mut"> · {role}</span>}
              </span>
              <span className="text-[14px] text-k5-mut [overflow-wrap:anywhere]">{opened.sent ? t("to", { names: sentToLine(opened.sent) }) : t("reader.toMe")}</span>
            </div>
            <span className="text-[14px] font-black text-k5-mut">{text.fullTime(at, timeZone)}</span>
          </div>

          {detail?.inReplyTo && (
            <p className="m-0 text-[14px] font-extrabold text-k5-mut">
              {detail.inReplyTo.visible
                ? t.rich("reader.inReplyTo", {
                    subject: detail.inReplyTo.subject || tx(NO_SUBJECT),
                    link: (chunks) => (
                      <button type="button" onClick={() => inbox.openItem({ channel: "EMAIL", id: detail.inReplyTo.id, title: detail.inReplyTo.subject })} className="cursor-pointer border-none bg-transparent p-0 font-black text-k5-ac underline">
                        {chunks}
                      </button>
                    ),
                  })
                : t("reader.inReplyToEarlier")}
            </p>
          )}

          {channel === "EMAIL" && undelivered && (
            <p role="note" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-[16px] font-extrabold text-k5-yx">{t("reader.undelivered")}</p>
          )}

          {channel === "EMAIL" &&
            (detail?.bodyHtml ? (
              <EmailFrame html={detail.bodyHtml} title={title} />
            ) : (
              <div className="max-w-[760px] whitespace-pre-line text-[17px] leading-[1.6] [overflow-wrap:anywhere]">{detail?.bodyText || t("reader.noBody")}</div>
            ))}

          {(channel === "NOTIFICATION" || channel === "ANNOUNCEMENT") && (
            <div className="max-w-[760px] whitespace-pre-line text-[17px] leading-[1.6] [overflow-wrap:anywhere]">{plainText(detail?.message)}</div>
          )}

          {channel === "WHATSAPP" && (
            <>
              {opened.undelivered ? (
                <p role="note" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-[16px] font-extrabold text-k5-yx">
                  {opened.preview}
                  {" "}
                  {t("reader.whatsappUndelivered")}
                </p>
              ) : (
                <p className="m-0 text-[17px] leading-[1.6]">{opened.preview}</p>
              )}
              <p className="m-0 text-[16px] font-extrabold text-k5-mut">{t("reader.whatsappNote")}</p>
            </>
          )}

          {(attachments.length > 0 || announcementFile) && (
            <div className="flex flex-col gap-2.5">
              <span className="flex items-center gap-1.5 text-[16px] font-black">
                <Paperclip className="h-4 w-4 flex-none text-k5-mut" strokeWidth={2.3} aria-hidden="true" />
                {t("attachments")}
              </span>
              <div className="flex flex-wrap gap-2.5">
                {attachments.map((file) => (
                  <button
                    key={file.name}
                    type="button"
                    disabled={Boolean(inbox.downloading)}
                    onClick={() => inbox.downloadAttachment(file)}
                    className="k5-cm-file k5h-cm-file flex min-h-[52px] cursor-pointer items-center gap-2.5 rounded-[18px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 text-left text-[14px] font-black text-k5-ink disabled:cursor-default"
                  >
                    <FileText className="h-[22px] w-[22px] flex-none text-k5-red" strokeWidth={2} aria-hidden="true" />
                    <span className="[overflow-wrap:anywhere]">{inbox.downloading === file.name ? t("reader.preparing") : tx(shownFileName(file.name))}</span>
                    <Download className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.4} aria-hidden="true" />
                    <span className="sr-only">{tc("actions.download")}</span>
                  </button>
                ))}
                {announcementFile && (
                  <a
                    href={announcementFile}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="k5-cm-file k5h-cm-file flex min-h-[52px] items-center gap-2.5 rounded-[18px] border-[3px] border-k5-line bg-k5-soft px-3.5 py-2 text-[14px] font-black text-k5-ink no-underline"
                  >
                    <FileText className="h-[22px] w-[22px] flex-none text-k5-red" strokeWidth={2} aria-hidden="true" />
                    {t("known.attachment")}
                    <Download className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.4} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Only a message a person wrote can be answered, and only where the school has writing switched on. */}
          {channel === "EMAIL" && detail?.canReply && inbox.mailbox.enabled && (
            <div>
              <button type="button" disabled={inbox.compose.isLoadingReply} onClick={() => inbox.compose.openReply(detail.id)} className={CM_BTN_PRIMARY}>
                <Reply className="h-[18px] w-[18px] flex-none" strokeWidth={2.4} aria-hidden="true" />
                {t("reader.reply")}
              </button>
            </div>
          )}

          {channel === "ANNOUNCEMENT" && detail && <Acknowledge detail={detail} onAcknowledge={inbox.acknowledge} busy={inbox.isAcknowledging} />}
        </>
      )}
    </article>
  );
}
