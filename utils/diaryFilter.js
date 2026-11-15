/*
 * The "Teacher / School" choice of the School Diary - legacy chatWith select (parentSchoolDiaryContent.js) + chatFilter()
 * + getChatUserList(): a student / parent sees one kind of conversation at a time, Teacher first. The server marks each
 * thread chatWithRole = "TEACHER" (the other person is a teacher) or "SCHOOL" (anyone else).
 */
export const DIARY_CHAT_WITH = [
  { value: "TEACHER", label: "Teacher" },
  { value: "SCHOOL", label: "School" },
];

export const DEFAULT_DIARY_CHAT_WITH = "TEACHER";

export function filterThreadsByChatWith(threads, chatWith) {
  return threads.filter((thread) => thread.chatWithRole === chatWith);
}

/** Legacy empty text: "No recent diary entries available with teacher" / "... with school". */
export function noDiaryEntriesText(chatWith) {
  return `No recent diary entries available with ${String(chatWith || DEFAULT_DIARY_CHAT_WITH).toLowerCase()}`;
}
