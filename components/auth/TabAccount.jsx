/**
 * Which signed-in user this tab works for, the way SMS's accountAuth.js does it (SMS plan section 27):
 * several users can be signed in to one browser, and every call the page makes says whose it is.
 *
 * Rendered by the root layout as an inline script, so it runs before Next.js's own scripts:
 *   - when the server rendered this page for a user, it remembers that user in this tab's sessionStorage
 *     (each tab has its own; other tabs are not affected). The public enrollment start page forgets it
 *     (AccountCreationForm), so a new student's signup is not sent as the tab's earlier user;
 *   - it adds an X-Account header with that user to every same-origin fetch of the page: server actions
 *     and step-to-step navigations go through fetch, so the proxy (proxy.js) knows the account without the
 *     URL saying it.
 * A full page load cannot carry a header: there the proxy uses the chooser pick, a user id in the path, or
 * the browser's only account, and otherwise shows /account/choose (as SMS does).
 *
 * Server Component: no client bundle, just the script.
 */
const ACCOUNT_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function TabAccount({ account }) {
  const known = typeof account === "string" && ACCOUNT_ID.test(account) ? account : null;
  const script = `(function () {
  var KEY = "isx-account";
  var known = ${JSON.stringify(known)};
  try {
    if (known) window.sessionStorage.setItem(KEY, known);
  } catch (e) {}
  if (window.__isxTabAccountInstalled || typeof window.fetch !== "function") return;
  window.__isxTabAccountInstalled = true;
  var originalFetch = window.fetch.bind(window);
  function tabAccount() {
    try {
      return window.sessionStorage.getItem(KEY);
    } catch (e) {
      return known;
    }
  }
  function sameOrigin(url) {
    try {
      return new URL(url, window.location.href).origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }
  window.fetch = function (input, init) {
    var account = tabAccount();
    var url = typeof input === "string" ? input : input instanceof URL ? input.href : input && input.url;
    if (!account || !/^[A-Za-z0-9_-]{1,64}$/.test(account) || !sameOrigin(url)) {
      return originalFetch(input, init);
    }
    var options = Object.assign({}, init || {});
    var headers = new Headers(options.headers || (input instanceof Request ? input.headers : undefined) || {});
    if (!headers.has("X-Account")) headers.set("X-Account", account);
    options.headers = headers;
    return originalFetch(input, options);
  };
})();`;
  return <script id="isx-tab-account" dangerouslySetInnerHTML={{ __html: script }} />;
}
