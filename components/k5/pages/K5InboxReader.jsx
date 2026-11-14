"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, Download, FileText, Paperclip, Reply, Star } from "lucide-react";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { getAttachmentUrl } from "@/utils/announcementAttachment";
import {
  NO_SUBJECT, UNDELIVERED_NOTICE, WHATSAPP_NOTE, WHATSAPP_UNDELIVERED, categoryLabel, channelLabel, fullTime, initialsOf, plainText,
  sentToLine, shownFileName, splitSender,
} from "@/utils/inbox";

// Channel colour of the design (CH): the avatar and the type chip of a message.
export const CHANNEL_TINT = { EMAIL: "bg-k5-bt", NOTIFICATION: "bg-k5-yt", ANNOUNCEMENT: "bg-k5-vt", WHATSAPP: "bg-k5-gt" };
export const CM_BTN =
  "k5-cm-btn k5h-cm-btn inline-flex min-h-[48px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-line bg-k5-card px-[18px] text-[16px] font-black text-k5-ink shadow-[0_4px_0_var(--k5-line)] disabled:cursor-default disabled:opacity-45";
export const CM_BTN_PRIMARY =
  "k5-cm-btn k5h-cm-btn k5h-cm-btnp inline-flex min-h-[48px] cursor-pointer items-center gap-2 whitespace-nowrap rounded-full border-[3px] border-k5-ac bg-k5-ac px-5 text-[16px] font-black text-white shadow-[0_4px_0_var(--k5-acd)] disabled:cursor-default disabled:opacity-45";

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
  return (
    <K5Loading label="Opening the message" className="flex flex-col gap-4">
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
  if (!detail.requiresAck) return null;
  if (detail.acknowledged) {
    return (
      <p role="status" className="m-0 flex items-center gap-2 rounded-[14px] bg-k5-gt px-4 py-3 text-[16px] font-black text-k5-gx">
        <Check className="h-5 w-5 flex-none" strokeWidth={3} aria-hidden="true" />
        {detail.justAcknowledged ? "Thank you. You confirmed you have read this." : "You confirmed you have read this."}
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3">
      <span className="flex-[1_1_240px] text-[16px] font-black text-k5-yx">The school asked you to confirm you have read this.</span>
      <button type="button" disabled={busy} onClick={onAcknowledge} className={CM_BTN_PRIMARY}>
        I have read this
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
  const detail = reader.detail;
  const channel = opened.channel;
  const title = detail?.subject || detail?.title || opened.title || (channel === "WHATSAPP" ? "WhatsApp message" : NO_SUBJECT);
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
          Back to inbox
        </button>
        {!opened.sent && (
          <button type="button" aria-pressed={Boolean(opened.starred)} onClick={() => inbox.toggleStar(opened)} className={CM_BTN}>
            <Star className={`h-5 w-5 flex-none ${opened.starred ? "fill-k5-hi text-k5-hi" : "text-k5-mut"}`} strokeWidth={2} aria-hidden="true" />
            {opened.starred ? "Remove star" : "Star"}
          </button>
        )}
      </div>

      {reader.isLoading ? (
        <ReaderSkeleton />
      ) : reader.error ? (
        <p role="alert" className="m-0 rounded-[14px] bg-k5-rt px-4 py-3 text-[16px] font-black text-k5-ri">{reader.error}</p>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-[3px] text-[14px] font-black text-k5-ink ${CHANNEL_TINT[channel]}`}>{channelLabel(channel)}</span>
              {category && <span className="rounded-full bg-k5-soft px-3 py-[3px] text-[14px] font-black text-k5-ink">{categoryLabel(category)}</span>}
            </div>
            <h2 className="m-0 font-k5-display text-[26px] font-semibold leading-[1.2] [overflow-wrap:anywhere]">{title}</h2>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-b-[3px] border-k5-line pb-3.5">
            <span aria-hidden="true" className={`flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full text-[15px] font-extrabold text-k5-ink ${CHANNEL_TINT[channel]}`}>
              {initialsOf(name)}
            </span>
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
              <span className="font-black">
                {name}
                {role && <span className="font-extrabold text-k5-mut"> · {role}</span>}
              </span>
              <span className="text-[14px] text-k5-mut [overflow-wrap:anywhere]">{opened.sent ? `To: ${sentToLine(opened.sent)}` : "to me"}</span>
            </div>
            <span className="text-[14px] font-black text-k5-mut">{fullTime(at, timeZone)}</span>
          </div>

          {detail?.inReplyTo && (
            <p className="m-0 text-[14px] font-extrabold text-k5-mut">
              In reply to{" "}
              {detail.inReplyTo.visible ? (
                <button type="button" onClick={() => inbox.openItem({ channel: "EMAIL", id: detail.inReplyTo.id, title: detail.inReplyTo.subject })} className="cursor-pointer border-none bg-transparent p-0 font-black text-k5-ac underline">
                  {detail.inReplyTo.subject || NO_SUBJECT}
                </button>
              ) : (
                "an earlier message"
              )}
            </p>
          )}

          {channel === "EMAIL" && undelivered && (
            <p role="note" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-[16px] font-extrabold text-k5-yx">{UNDELIVERED_NOTICE}</p>
          )}

          {channel === "EMAIL" &&
            (detail?.bodyHtml ? (
              <EmailFrame html={detail.bodyHtml} title={title} />
            ) : (
              <div className="max-w-[760px] whitespace-pre-line text-[17px] leading-[1.6] [overflow-wrap:anywhere]">{detail?.bodyText || "The text of this email is not available."}</div>
            ))}

          {(channel === "NOTIFICATION" || channel === "ANNOUNCEMENT") && (
            <div className="max-w-[760px] whitespace-pre-line text-[17px] leading-[1.6] [overflow-wrap:anywhere]">{plainText(detail?.message)}</div>
          )}

          {channel === "WHATSAPP" && (
            <>
              {opened.undelivered ? (
                <p role="note" className="m-0 rounded-[14px] border-[3px] border-k5-yb bg-k5-yt px-4 py-3 text-[16px] font-extrabold text-k5-yx">
                  {opened.preview}
                  {WHATSAPP_UNDELIVERED}
                </p>
              ) : (
                <p className="m-0 text-[17px] leading-[1.6]">{opened.preview}</p>
              )}
              <p className="m-0 text-[16px] font-extrabold text-k5-mut">{WHATSAPP_NOTE}</p>
            </>
          )}

          {(attachments.length > 0 || announcementFile) && (
            <div className="flex flex-col gap-2.5">
              <span className="flex items-center gap-1.5 text-[16px] font-black">
                <Paperclip className="h-4 w-4 flex-none text-k5-mut" strokeWidth={2.3} aria-hidden="true" />
                Attachments
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
                    <span className="[overflow-wrap:anywhere]">{inbox.downloading === file.name ? "Preparing…" : shownFileName(file.name)}</span>
                    <Download className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.4} aria-hidden="true" />
                    <span className="sr-only">Download</span>
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
                    Attachment
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
                Reply
              </button>
            </div>
          )}

          {channel === "ANNOUNCEMENT" && detail && <Acknowledge detail={detail} onAcknowledge={inbox.acknowledge} busy={inbox.isAcknowledging} />}
        </>
      )}
    </article>
  );
}
