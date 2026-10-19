/**
 * The "Talk to Us" chat SSO link — getAnnouncementAndNewsContent() in
 * masterContent.js:
 *
 *   var data = {u: UNIQUEUUID, e: DEPLOYMENT_MODE, d: new Date().getTime()};
 *   var chatPayload = btoa(unescape(encodeURIComponent(JSON.stringify(data))));
 *   var chatUrl = `${CHAT_URL}/sign-in?uuid=${UNIQUEUUID}+&p=` + chatPayload;
 *
 * This is a DIFFERENT encoding than this project's own encodePayload
 * (btoa(encodeURI(...))) — it's not decoded by our backend's AesUtil, it's
 * decoded by the separate chat app at CHAT_URL, which expects the classic
 * unescape(encodeURIComponent(...)) UTF-8-safe base64 idiom. The stray "+"
 * right after the uuid (before the "&") is legacy's own literal text, not a
 * URL-encoding artifact — kept exactly as-is so the link matches what the
 * chat app has always been linked to.
 */
function base64EncodeUtf8(value) {
  return btoa(unescape(encodeURIComponent(value)));
}

export function buildChatSignInUrl({ chatUrl, uniqueId, deploymentMode }) {
  if (!chatUrl || !uniqueId) return "";
  const chatPayload = base64EncodeUtf8(JSON.stringify({ u: uniqueId, e: deploymentMode || "", d: Date.now() }));
  return `${chatUrl}/sign-in?uuid=${uniqueId}+&p=${chatPayload}`;
}
