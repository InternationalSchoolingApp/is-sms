/*
 * Small rules of the School Diary screens, from legacy parentSchoolDiary*.js.
 */

/**
 * Is this message the viewer's own - legacy parentSchoolDiaryIsOutgoing(): the sender is the signed-in user (senderUserId /
 * senderId), else the sender has the viewer's role, else the sender's name is the viewer's name.
 */
export function isOwnDiaryMessage(message, { userId, role = "STUDENT", userName } = {}) {
  if (!message) return false;
  if (userId != null && userId !== "") {
    if (message.senderUserId != null && String(message.senderUserId) === String(userId)) return true;
    if (message.senderId != null && String(message.senderId) === String(userId)) return true;
  }
  const messageRole = String(message.senderRole || "").trim().toUpperCase();
  if (messageRole && role && messageRole === String(role).trim().toUpperCase()) return true;
  const messageName = String(message.senderName || "").trim().toLowerCase();
  const viewerName = String(userName || "").trim().toLowerCase();
  return Boolean(messageName && viewerName && messageName === viewerName);
}

/** Legacy getUserInitialsCommon(): first letter of the first and the last word ("ST" when there is no name). */
export function diaryInitials(name, fallback = "ST") {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return fallback;
  const first = words[0].charAt(0).toUpperCase();
  const last = words.length > 1 ? words[words.length - 1].charAt(0).toUpperCase() : "";
  return first + last || fallback;
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits a message into plain parts and @mentions - legacy parentSchoolDiaryHighlightMentions(): the names the message
 * mentions (longest first) are matched as "@name" followed by a space, the end or . , ! ?; with no mention list any
 * "@word" that starts the text or follows a space is a mention. -> [{ text, mention }]
 */
export function splitDiaryMentions(message, mentions) {
  const text = String(message ?? "");
  if (!text) return [];
  const names = (Array.isArray(mentions) ? mentions : [])
    .map((mention) => mention?.userName || mention?.email || "")
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const pattern = names.length ? new RegExp(`@(?:${names.map(escapeRegex).join("|")})(?=\\s|$|[.,!?])`, "g") : /@[-\w.]+/g;
  const parts = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index;
    if (!names.length && start > 0 && !/\s/.test(text[start - 1])) continue;
    if (start > last) parts.push({ text: text.slice(last, start), mention: false });
    parts.push({ text: match[0], mention: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false });
  return parts;
}
