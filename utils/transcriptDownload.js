import { markSessionExpired } from "@/utils/sessionState";
import { TAB_ACCOUNT_STORAGE_KEY } from "@/components/auth/TabAccount";

// The backend pages that give a Student Transcript document (see app/api/transcript/download/route.js).
const DOWNLOADABLE = /\/dashboard\/(student-transcript-view-after-publish|view-diploma|transcript-verification-page)\//;
const FAILED = "The document could not be downloaded right now. Please try again.";
// Making the PDF takes the backend a while (the transcript up to about half a minute); this is only the limit of waiting.
const WAIT_MS = 5 * 60_000;

/** True for the three real document links (not the demo page of dummy mode, which is just opened). */
export const isDownloadableTranscriptLink = (href) => DOWNLOADABLE.test(String(href || ""));

const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, "0")).join("");

/**
 * Saves a Student Transcript document (Transcript / Diploma / Academic Verification) as a file instead of opening it in a tab.
 *
 * The browser itself does the download: a hidden frame goes to app/api/transcript/download (which makes the PDF on the backend
 * for the signed-in student and answers with Content-Disposition: attachment). That keeps the click as the student's own action -
 * a file saved by script after a long wait is what browsers block, which is why the Academic Verification one (the slowest to
 * make) did not come through - and the file streams straight to disk. The promise settles when the file has started to arrive
 * (the route sets a cookie named after the token we sent) or fails when the route answers with an error, which loads into the
 * frame as a little JSON document (a real download never does).
 */
export function downloadTranscriptDocument({ href, name }) {
  return new Promise((resolve, reject) => {
    const token = newToken();
    const frame = document.createElement("iframe");
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    frame.style.display = "none";
    const started = Date.now();
    let settled = false;
    let poll = null;

    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      document.cookie = `tdl-${token}=; Path=/; Max-Age=0`;
      setTimeout(() => frame.remove(), 3000);
      if (error) reject(error);
      else resolve();
    };

    poll = setInterval(() => {
      if (document.cookie.includes(`tdl-${token}=`)) finish();
      else if (Date.now() - started > WAIT_MS) finish(new Error(FAILED));
    }, 300);

    frame.onload = () => {
      // Something loaded into the frame: the route answered with an error message, not a file.
      let body = null;
      try {
        body = JSON.parse(frame.contentDocument?.body?.innerText || "null");
      } catch {
        body = null;
      }
      if (body?.sessionExpired) markSessionExpired();
      finish(new Error(body?.message || FAILED));
    };

    // A frame cannot carry the X-Account header the page adds to its fetches, so it says whose document this is in the address.
    let account = "";
    try {
      account = window.sessionStorage.getItem(TAB_ACCOUNT_STORAGE_KEY) || "";
    } catch {
      account = "";
    }
    frame.src = `/api/transcript/download?url=${encodeURIComponent(href)}&name=${encodeURIComponent(name || "document")}&token=${token}${account ? `&account=${encodeURIComponent(account)}` : ""}`;
    document.body.appendChild(frame);
  });
}
