const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

function tabAccount() {
  try {
    const account = window.sessionStorage.getItem("isx-account");
    return account && ACCOUNT_ID.test(account) ? account : null;
  } catch {
    return null;
  }
}

/**
 * Browser side of the teacher document upload: POST {school}/teacher-registration/document-upload (a Route Handler, see
 * app/[school]/teacher-registration/document-upload/route.js) as multipart. XMLHttpRequest rather than fetch, because
 * fetch cannot report upload progress. Resolves with the parsed answer ({ status: "1", fileType, originalName,
 * fileUrl } on success, { status: "0", message } on a refusal, { status: "3" } when the session is out) and never
 * rejects: a network failure or an unreadable answer is a { status: "0", message }.
 *
 * `onProgress(percent)` is called with 0-100 while the file goes up; `signal` (an AbortSignal) cancels the request.
 */
export function uploadTeacherDocument({ school, file, fileType, onProgress, signal }) {
  return new Promise((resolve) => {
    const failure = (message) => resolve({ status: "0", message });
    const form = new FormData();
    form.append("fileType", String(fileType));
    form.append("file", file, file.name);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/${encodeURIComponent(school)}/teacher-registration/document-upload`);
    // The page's own fetch calls carry X-Account (components/auth/TabAccount.jsx patches window.fetch); an
    // XMLHttpRequest does not, so without it a browser that holds two accounts cannot tell whose tab this is and the
    // route answers "session out". Same value, same source: this tab's sessionStorage.
    const account = tabAccount();
    if (account) xhr.setRequestHeader("X-Account", account);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      try {
        resolve(JSON.parse(xhr.responseText));
      } catch {
        failure("We couldn't upload the document. Please try again.");
      }
    };
    xhr.onerror = () => failure("We couldn't upload the document. Please check your connection and try again.");
    xhr.onabort = () => failure("The upload was cancelled.");
    if (signal) {
      if (signal.aborted) return failure("The upload was cancelled.");
      signal.addEventListener("abort", () => xhr.abort(), { once: true });
    }
    xhr.send(form);
  });
}
