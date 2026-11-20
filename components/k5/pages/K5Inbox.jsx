"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Filter, Inbox as InboxIcon, Mail, Megaphone, MessageCircle, Paperclip, PenLine, Search, Send, Settings, Star, X } from "lucide-react";
import { K5_CARD } from "@/components/k5/home/k5Bits";
import { K5Loading, K5Sk } from "@/components/k5/K5Skeletons";
import { K5InboxCompose, K5InboxSettings } from "@/components/k5/pages/K5InboxCompose";
import { CHANNEL_TINT, CM_BTN, CM_BTN_PRIMARY, K5InboxReader, useK5InboxText } from "@/components/k5/pages/K5InboxReader";
import { usePicoContentReady } from "@/components/k5/pico/picoEvents";
import { useDashboardContext } from "@/hooks/useDashboardContext";
import { labelKey } from "@/i18n/labels";
import {
  DATE_PRESETS, DEFAULT_INBOX_FILTERS, INBOX_CATEGORIES, NO_SUBJECT, READ_OPTIONS,
  activeFilterCount, initialsOf, plainText, splitSender,
} from "@/utils/inbox";

const FOLDER_ICONS = { ALL: InboxIcon, EMAIL: Mail, NOTIFICATION: Bell, ANNOUNCEMENT: Megaphone, WHATSAPP: MessageCircle, SENT: Send };
const UNREAD_KEY = { ALL: "TOTAL", EMAIL: "EMAIL", NOTIFICATION: "NOTIFICATION", ANNOUNCEMENT: "ANNOUNCEMENT" };
const FIELD = "k5-cm-in min-h-[50px] w-full rounded-[14px] border-[3px] border-k5-line bg-k5-card px-2.5 text-[16px] font-extrabold text-k5-ink";
// utils/inbox DATE_PRESETS by value -> k5Inbox.filters.dates.<key>.
const DATE_KEYS = { 7: "last7", 30: "last30", 90: "last90", YEAR: "thisYear" };

/** utils/inbox sentRow, with its English words translated (t: the k5Inbox translator). */
function sentRowText(item, t) {
  const names = (item.recipients || []).map((r) => r.name);
  const count = Math.max(item.recipientCount || 0, names.length);
  const to = names.length ? (count > 3 ? t("andMore", { list: names.slice(0, 3).join(", "), count: count - 3 }) : names.join(", ")) : t("sent.nobody");
  const notSent = (item.recipients || []).filter((r) => r.state === "NOT_SENT").map((r) => r.name);
  const notSentCount = Math.max(item.notSentCount || 0, notSent.length);
  const notes = [];
  if (item.progress) notes.push(t("sent.progress", { done: item.progress.done, total: item.progress.total }));
  else if (item.state === "SENDING") notes.push(t("sent.sending"));
  if (notSentCount) notes.push(notSentCount > 5 ? t("sent.notSentCount", { count: notSentCount }) : t("sent.notSentTo", { names: notSent.join(", ") }));
  return { to, first: names[0] || "", note: notes.join(" "), failed: notSentCount > 0 };
}

const ROW_GRID = "grid-cols-[40px_minmax(120px,210px)_minmax(0,1fr)_auto] max-[760px]:grid-cols-[40px_minmax(0,1fr)_auto]";

/** "Inbox" title. Playful: a card with an 84px tile. Balanced / Mature (Middle / High.dc.html): no card, a smaller tile. */
function InboxHeader({ inbox, filtersOpen, onFilters }) {
  const { isMiddle } = useDashboardContext();
  const t = useTranslations("k5Inbox");
  const filterCount = activeFilterCount(inbox.filters);
  return (
    <div className={isMiddle ? "flex flex-wrap items-center gap-4" : `${K5_CARD} flex flex-wrap items-center gap-4 px-[22px] py-[18px]`}>
      <span className={`flex flex-none items-center justify-center bg-k5-bt ${isMiddle ? "k5-cm-tile h-[62px] w-[62px]" : "h-[84px] w-[84px] rounded-[22px]"}`} style={isMiddle ? { borderRadius: 14 } : undefined}>
        <InboxIcon className={isMiddle ? "h-[34px] w-[34px] text-k5-bi" : "h-12 w-12 text-k5-bi"} strokeWidth={2.2} aria-hidden="true" />
      </span>
      <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-1">
        <h1 className={`k5-cm-h1 m-0 font-k5-display font-semibold leading-[1.05] ${isMiddle ? "text-[30px]" : "text-[34px]"}`}>{t("title")}</h1>
        <p className={`k5-cm-sub m-0 font-extrabold text-k5-mut ${isMiddle ? "text-[16px]" : "text-[18px]"}`}>{t("subtitle")}</p>
      </div>
      <div className="flex flex-wrap gap-2.5 max-[760px]:w-full max-[760px]:[&>button]:flex-1 max-[760px]:[&>button]:justify-center">
        <button type="button" aria-haspopup="dialog" onClick={inbox.settings.open} className={CM_BTN}>
          <Settings className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2} aria-hidden="true" />
          {t("emailSettings")}
        </button>
        <button type="button" disabled={inbox.isMarkingAll} onClick={inbox.markAllRead} className={CM_BTN}>
          <CheckCheck className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.3} aria-hidden="true" />
          {t("markAllRead")}
        </button>
        <button type="button" aria-expanded={filtersOpen} aria-controls="k5-cm-filters" onClick={onFilters} className={`${CM_BTN} ${filtersOpen ? "border-k5-ac" : ""}`}>
          <Filter className="h-[18px] w-[18px] flex-none text-k5-ac" strokeWidth={2.2} aria-hidden="true" />
          {t("filters.title")}
          {filterCount > 0 && <span className="rounded-full bg-k5-ac px-2 text-[13px] font-black text-white">{filterCount}</span>}
        </button>
      </div>
    </div>
  );
}

/** Folder list (designs: .cmside). A column beside the list; a scrolling row on a phone. */
function Folders({ inbox }) {
  const text = useK5InboxText();
  return (
    <nav aria-label={text.t("folders.label")} className={`${K5_CARD} flex flex-col gap-1 p-2.5 max-[760px]:flex-row max-[760px]:overflow-x-auto max-[760px]:p-2`}>
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
            className={`k5h-cm-tab flex min-h-[46px] w-full cursor-pointer items-center gap-3 rounded-full border-none px-3.5 text-left text-[16px] text-k5-ink max-[760px]:w-auto max-[760px]:flex-none ${selected ? "bg-k5-act font-black" : "bg-transparent font-extrabold hover:bg-k5-soft"}`}
          >
            <Icon className={`h-[22px] w-[22px] flex-none ${selected ? "text-k5-ac" : folder.key === "WHATSAPP" ? "text-k5-gi" : "text-k5-mut"}`} strokeWidth={2.2} aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate">{text.folder(folder)}</span>
            {count > 0 && (
              <span className="flex-none text-[14px] font-extrabold">
                {count > 99 ? "99+" : count}
                <span className="sr-only"> {text.t("unread")}</span>
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

/** Filters card (designs: #cmFilBox). Nothing reloads until Apply, as on the existing page. */
function Filters({ inbox, onClose }) {
  const [draft, setDraft] = useState(inbox.filters);
  const set = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const label = "flex min-w-0 flex-col gap-1.5";
  const caption = "text-[16px] font-black";
  const text = useK5InboxText();
  const t = useTranslations("k5Inbox");
  const tc = useTranslations("common");
  return (
    <section id="k5-cm-filters" aria-labelledby="k5-cm-filters-title" className={`${K5_CARD} flex flex-col gap-4 px-5 py-[18px]`}>
      <div className="flex items-center justify-between gap-2.5">
        <h2 id="k5-cm-filters-title" className="m-0 flex items-center gap-2 font-k5-display text-[20px] font-semibold">
          <Filter className="h-[22px] w-[22px] flex-none text-k5-ac" strokeWidth={2.2} aria-hidden="true" />
          {t("filters.title")}
        </h2>
        <button type="button" aria-label={tc("actions.close")} onClick={onClose} className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border-[3px] border-k5-line bg-k5-card p-0 text-k5-ink">
          <X className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
        </button>
      </div>
      <form
        className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-end gap-3.5"
        onSubmit={(event) => {
          event.preventDefault();
          inbox.applyFilters(draft);
        }}
      >
        <label className={label}>
          <span className={caption}>{tc("actions.search")}</span>
          <span className={`${FIELD} flex items-center gap-2 px-3`}>
            <Search className="h-[18px] w-[18px] flex-none text-k5-mut" strokeWidth={2.6} aria-hidden="true" />
            <input type="search" maxLength={200} value={draft.search} onChange={(e) => set({ search: e.target.value })} placeholder={t("filters.searchPlaceholder")} className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-extrabold text-k5-ink outline-none" />
          </span>
        </label>
        <label className={label}>
          <span className={caption}>{t("filters.date")}</span>
          <select value={draft.date} onChange={(e) => set({ date: e.target.value })} className={`${FIELD} cursor-pointer`}>
            {DATE_PRESETS.map((o) => <option key={o.value} value={o.value}>{DATE_KEYS[o.value] ? t(`filters.dates.${DATE_KEYS[o.value]}`) : o.label}</option>)}
          </select>
        </label>
        {!inbox.isSent && (
          <>
        <label className={label}>
          <span className={caption}>{t("filters.show")}</span>
          <select value={draft.read} onChange={(e) => set({ read: e.target.value })} className={`${FIELD} cursor-pointer`}>
            {READ_OPTIONS.map((o) => <option key={o.value} value={o.value}>{t.has(`filters.read.${labelKey(o.value)}`) ? t(`filters.read.${labelKey(o.value)}`) : o.label}</option>)}
          </select>
        </label>
        <label className={label}>
          <span className={caption}>{t("filters.category")}</span>
          <select value={draft.category} onChange={(e) => set({ category: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">{t("filters.anyCategory")}</option>
            {INBOX_CATEGORIES.map((o) => <option key={o.value} value={o.value}>{text.category(o.value)}</option>)}
          </select>
        </label>
        <div className="flex min-w-0 flex-col gap-2 text-[16px] font-extrabold">
          <label className="flex min-h-[22px] cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={draft.withAttachments} onChange={(e) => set({ withAttachments: e.target.checked })} className="m-0 h-5 w-5 cursor-pointer accent-[var(--k5-ac)]" />
            {t("filters.withAttachments")}
          </label>
          <label className="flex min-h-[22px] cursor-pointer items-center gap-2.5">
            <input type="checkbox" checked={draft.starred} onChange={(e) => set({ starred: e.target.checked })} className="m-0 h-5 w-5 cursor-pointer accent-[var(--k5-ac)]" />
            {t("filters.starred")}
          </label>
        </div>
          </>
        )}
        <div className="flex min-w-0 gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(DEFAULT_INBOX_FILTERS);
              inbox.applyFilters(DEFAULT_INBOX_FILTERS);
            }}
            className={`${CM_BTN} flex-1 justify-center`}
          >
            {tc("actions.reset")}
          </button>
          <button type="submit" className={`${CM_BTN_PRIMARY} flex-1 justify-center`}>{tc("actions.apply")}</button>
        </div>
      </form>
    </section>
  );
}

/** A message the student wrote (Sent): who it went to, and anything that did not go out by email. */
function SentRow({ item, inbox }) {
  const text = useK5InboxText();
  const { t } = text;
  const row = sentRowText(item.sent, t);
  const time = text.rowTime(item.at, inbox.timeZone);
  const title = item.title || text.tx(NO_SUBJECT);
  return (
    <div role="listitem" className="flex items-stretch border-b-[3px] border-k5-line bg-k5-soft">
      <button
        type="button"
        onClick={() => inbox.openItem(item)}
        aria-label={t("sent.rowLabel", { to: row.to, title, time })}
        className={`grid min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent py-3 pl-[18px] pr-[18px] text-left text-[16px] text-k5-ink max-[760px]:gap-y-1 max-[760px]:px-3.5 ${ROW_GRID}`}
      >
        <span aria-hidden="true" className="k5h-cm-av flex h-10 w-10 items-center justify-center rounded-full bg-k5-card text-[13px] font-extrabold">{initialsOf(row.first)}</span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate font-extrabold">{t("to", { names: row.to })}</span>
          <span className="self-start rounded-full bg-k5-card px-[9px] py-px text-[11px] font-extrabold">{t("folders.sent")}</span>
        </span>
        <span className="min-w-0 truncate max-[760px]:col-span-2 max-[760px]:col-start-2 max-[760px]:row-start-2 max-[760px]:line-clamp-2 max-[760px]:whitespace-normal">
          <span className="font-extrabold">{title}</span>
          {row.note && <span className={`font-extrabold ${row.failed ? "text-k5-ri" : "text-k5-mut"}`}> · {row.note}</span>}
        </span>
        <span className="flex items-center gap-2 justify-self-end whitespace-nowrap text-[14px] font-extrabold text-k5-mut max-[760px]:col-start-3 max-[760px]:row-start-1">
          {item.attachments && <Paperclip role="img" aria-label={t("attachments")} className="h-4 w-4 flex-none text-k5-mut" strokeWidth={2.3} />}
          {time}
        </span>
      </button>
    </div>
  );
}

function Row({ item, inbox }) {
  const text = useK5InboxText();
  const { t } = text;
  const name = text.tx(splitSender(item.sender).name);
  const unread = !item.read;
  const time = text.rowTime(item.at, inbox.timeZone);
  const title = item.title || text.tx(NO_SUBJECT);
  return (
    <div role="listitem" className={`flex items-stretch border-b-[3px] border-k5-line ${unread ? "bg-k5-card shadow-[inset_4px_0_0_var(--k5-ac)]" : "bg-k5-soft"}`}>
      <button type="button" aria-pressed={item.starred} aria-label={item.starred ? t("removeStar") : t("star")} onClick={() => inbox.toggleStar(item)} className="flex w-12 flex-none cursor-pointer items-center justify-center border-none bg-transparent p-0">
        <Star className={`h-5 w-5 ${item.starred ? "fill-k5-hi text-k5-hi" : "text-k5-mut"}`} strokeWidth={2} aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => inbox.openItem(item)}
        aria-label={t(unread ? "row.labelUnread" : "row.label", { channel: text.channel(item.channel), name, title, time })}
        className={`grid min-w-0 flex-1 cursor-pointer items-center gap-3 border-none bg-transparent py-3 pl-0 pr-[18px] text-left text-[16px] text-k5-ink max-[760px]:gap-y-1 max-[760px]:pr-3.5 ${ROW_GRID}`}
      >
        <span aria-hidden="true" className={`k5h-cm-av flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-extrabold ${CHANNEL_TINT[item.channel]}`}>{initialsOf(name)}</span>
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className={`truncate ${unread ? "font-black" : "font-extrabold"}`}>{name}</span>
          <span className={`self-start rounded-full px-[9px] py-px text-[11px] font-extrabold ${CHANNEL_TINT[item.channel]}`}>{text.channel(item.channel)}</span>
        </span>
        <span className="min-w-0 truncate max-[760px]:col-span-2 max-[760px]:col-start-2 max-[760px]:row-start-2 max-[760px]:line-clamp-2 max-[760px]:whitespace-normal">
          <span className={unread ? "font-black" : "font-extrabold"}>{title}</span>
          {item.preview && <span className="font-extrabold text-k5-mut"> – {plainText(item.preview)}</span>}
          {item.undelivered && item.channel === "EMAIL" && <span className="font-black text-k5-ri"> · {t("row.undelivered")}</span>}
        </span>
        <span className={`flex items-center gap-2 justify-self-end whitespace-nowrap text-[14px] max-[760px]:col-start-3 max-[760px]:row-start-1 ${unread ? "font-black text-k5-ink" : "font-extrabold text-k5-mut"}`}>
          {item.attachments && <Paperclip role="img" aria-label={t("attachments")} className="h-4 w-4 flex-none text-k5-mut" strokeWidth={2.3} />}
          {unread && <span aria-hidden="true" className="h-[9px] w-[9px] rounded-full bg-k5-ac" />}
          {time}
        </span>
      </button>
    </div>
  );
}

function RowsSkeleton() {
  const t = useTranslations("k5Inbox");
  return (
    <K5Loading label={t("loading")} className="flex flex-col">
      {Array.from({ length: 6 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 border-b-[3px] border-k5-line px-4 py-3.5">
          <K5Sk className="h-5 w-5 flex-none rounded-full" />
          <K5Sk className="h-10 w-10 flex-none rounded-full" />
          <K5Sk className="h-4 w-36 flex-none max-[760px]:w-20" />
          <K5Sk className="h-4 flex-1" />
          <K5Sk className="h-4 w-14 flex-none" />
        </div>
      ))}
    </K5Loading>
  );
}

function MessageList({ inbox }) {
  const { list, unread, folder } = inbox;
  const folderUnread = unread[UNREAD_KEY[folder]] || 0;
  const text = useK5InboxText();
  const { t, tx } = text;
  const tc = useTranslations("common");
  // hooks/useInbox list.summary ("1–20 of 37", "The newest 200 are listed..."), with its words translated.
  const range = /^(\S+)–(\S+) of (\S+)$/.exec(list.summary.range || "");
  const newest = /^The newest (\S+) are listed/.exec(list.summary.note || "");
  const count = inbox.isSent ? t("list.sentCount", { count: list.total }) : t("list.messageCount", { count: list.total });
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-[3px] border-k5-line bg-k5-soft px-5 py-3">
        <span aria-live="polite" className="font-black">
          {list.isLoading ? tc("status.loading") : list.total ? (folderUnread ? t("list.countUnread", { count, unread: folderUnread }) : count) : t("list.none")}
        </span>
        <span className="text-[14px] font-black text-k5-mut">{range ? t("list.range", { from: range[1], to: range[2], total: range[3] }) : list.summary.range}</span>
      </div>
      {list.summary.note && <p className="m-0 border-b-[3px] border-k5-line bg-k5-yt px-5 py-2.5 text-[14px] font-extrabold text-k5-yx">{newest ? t("list.newestNote", { count: newest[1] }) : list.summary.note}</p>}

      {list.isLoading ? (
        <RowsSkeleton />
      ) : list.error ? (
        <div role="alert" className="flex flex-col items-center gap-3 px-5 py-9 text-center">
          <p className="m-0 font-k5-display text-[19px] font-semibold text-k5-mut">{tx(list.error)}</p>
          <button type="button" onClick={list.retry} className={CM_BTN}>{tc("actions.tryAgain")}</button>
        </div>
      ) : list.items.length === 0 ? (
        <p className="m-0 px-5 py-9 text-center font-k5-display text-[19px] font-semibold text-k5-mut">{tx(list.emptyText)}</p>
      ) : (
        <div role="list" className={`flex flex-col ${list.isFetching ? "opacity-60" : ""}`}>
          {list.items.map((item) => (item.sent ? <SentRow key={`SENT:${item.id}`} item={item} inbox={inbox} /> : <Row key={`${item.channel}:${item.id}`} item={item} inbox={inbox} />))}
        </div>
      )}

      <nav aria-label={t("list.pages")} className="flex items-center justify-between gap-2.5 px-5 py-3">
        <button type="button" disabled={list.page <= 1} onClick={() => inbox.goToPage(list.page - 1)} className={CM_BTN}>
          <ChevronLeft className="h-4 w-4 flex-none text-k5-ac" strokeWidth={2.6} aria-hidden="true" />
          {t("list.newer")}
        </button>
        {list.total > 0 && <span className="text-[14px] font-black text-k5-mut">{tc("table.page", { page: list.page, pages: list.lastPage })}</span>}
        <button type="button" disabled={list.page >= list.lastPage} onClick={() => inbox.goToPage(list.page + 1)} className={CM_BTN}>
          {t("list.older")}
          <ChevronRight className="h-4 w-4 flex-none text-k5-ac" strokeWidth={2.6} aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}

/**
 * Inbox in the Playful / Balanced / Mature looks (Playful, Middle and High .dc.html, page "comm"): the title with
 * Mark all as read and Filters, the folders beside the messages, and the open message in place of the list.
 * One markup for the three looks — app/k5-middle.css and app/k5-mature.css restyle it. All behaviour is in
 * hooks/useInbox.js.
 */
export function K5Inbox({ inbox }) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const text = useK5InboxText();
  const currentFolder = inbox.folders.find((f) => f.key === inbox.folder);
  usePicoContentReady(!inbox.list.isLoading);
  return (
    <div className="flex flex-col gap-4">
      <InboxHeader inbox={inbox} filtersOpen={filtersOpen} onFilters={() => setFiltersOpen((v) => !v)} />
      <div className="flex items-start gap-4 max-[760px]:flex-col max-[760px]:items-stretch">
        <div className="flex min-w-0 flex-[0_0_230px] flex-col gap-3.5 max-[760px]:flex-none">
          {inbox.mailbox.canCompose && (
            <button type="button" onClick={inbox.compose.open} className={`${CM_BTN_PRIMARY} min-h-[52px] w-full justify-center`}>
              <PenLine className="h-5 w-5 flex-none" strokeWidth={2.3} aria-hidden="true" />
              {text.t("writeMessage")}
            </button>
          )}
          <Folders inbox={inbox} />
        </div>
        <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">
          {filtersOpen && <Filters inbox={inbox} onClose={() => setFiltersOpen(false)} />}
          <section aria-label={inbox.opened ? text.t("message") : currentFolder && text.folder(currentFolder)} className={`${K5_CARD} flex flex-col overflow-hidden`}>
            {inbox.opened ? <K5InboxReader inbox={inbox} /> : <MessageList inbox={inbox} />}
          </section>
        </div>
      </div>
      <K5InboxCompose compose={inbox.compose} />
      <K5InboxSettings settings={inbox.settings} />
    </div>
  );
}
