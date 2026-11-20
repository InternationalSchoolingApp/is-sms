/*
 * The "Teacher / School" choice of the School Diary - legacy chatWith select (parentSchoolDiaryContent.js) + chatFilter()
 * + getChatUserList(): a student / parent sees one kind of conversation at a time, Teacher first. The server marks each
 * thread chatWithRole = "TEACHER" (the other person is a teacher) or "SCHOOL" (anyone else).
 */
// `messageKey`: the option's text in the "diary" namespace (t(option.messageKey)); `label` stays English.
export const DIARY_CHAT_WITH = [
  { value: "TEACHER", label: "Teacher", messageKey: "chatWith.teacher" },
  { value: "SCHOOL", label: "School", messageKey: "chatWith.school" },
];

export const DEFAULT_DIARY_CHAT_WITH = "TEACHER";

export function filterThreadsByChatWith(threads, chatWith) {
  return threads.filter((thread) => thread.chatWithRole === chatWith);
}

/**
 * Legacy empty text: "No recent diary entries available with teacher" / "... with school".
 * Pass `t` = useTranslations("diary") for the dashboard language (diary.empty.*); without it the text is English.
 */
export function noDiaryEntriesText(chatWith, t) {
  const role = String(chatWith || DEFAULT_DIARY_CHAT_WITH).toUpperCase();
  if (t && (role === "TEACHER" || role === "SCHOOL")) return t(role === "SCHOOL" ? "empty.school" : "empty.teacher");
  return `No recent diary entries available with ${String(chatWith || DEFAULT_DIARY_CHAT_WITH).toLowerCase()}`;
}
