"use server";

import { backendRequest } from "@/utils/backendRequest";

/**
 * School e-mail (Outlook) activation reminder on the dashboard (legacy studentDashboardContent.js renderOutlookModalOnDashboard):
 *   {school}/dashboard/additinal-layer-details          { userId }  -> details.outlookSetupPending, email, password, needsAzureCreation
 *   {school}/api/v1/is-outlook-account-active           { userId }  -> passwordUpdated "Y" once the student has set a password
 *   {school}/dashboard/create-azure-user                { userId }  -> details.email / password of the new account
 *   {school}/dashboard/update-azure-credentials-viewed  { userId }  -> marks the credentials as seen before Outlook opens
 * The user is always the token user. Each call returns { ok, data } or { ok: false, message }.
 */

const FAILED = "This could not be done just now. Please try again in a minute.";
const okStatus = (answer) => String(answer?.status ?? "") === "1";

/** { pending, email, password, needsAzureCreation } - pending is false when the setup is done or never needed. */
export async function loadOutlookReminder() {
  const layer = await backendRequest({ path: "dashboard/additinal-layer-details", buildBody: (me) => ({ userId: me.userId }) });
  if (!layer.ok) return { ok: false, message: layer.message || FAILED };
  const details = okStatus(layer.data) ? layer.data.details || {} : {};
  if (!details.outlookSetupPending) return { ok: true, data: { pending: false } };
  // Ask before ever opening the popup: a password already set means it never shows.
  if ((await isOutlookActivated()).data?.activated) return { ok: true, data: { pending: false } };
  const azure = details.azureDetails || {};
  return {
    ok: true,
    data: {
      pending: true,
      email: details.email || azure.email || "",
      password: details.password || azure.password || "",
      needsAzureCreation: Boolean(details.needsAzureCreation),
    },
  };
}

/** { activated } - false on any failure (the next check tries again). */
export async function isOutlookActivated() {
  const result = await backendRequest({ path: "api/v1/is-outlook-account-active", buildBody: (me) => ({ userId: me.userId }) });
  return { ok: result.ok, data: { activated: result.ok && result.data?.passwordUpdated === "Y" } };
}

/**
 * The "Activate" button: create the Microsoft 365 account first when it does not exist yet (answers the new email /
 * password), otherwise mark the credentials viewed. Outlook itself is opened by the browser afterwards.
 */
export async function activateOutlook({ needsAzureCreation } = {}) {
  if (needsAzureCreation) {
    const created = await backendRequest({ path: "dashboard/create-azure-user", buildBody: (me) => ({ userId: me.userId }) });
    if (!created.ok) return { ok: false, message: created.message || FAILED };
    if (!okStatus(created.data)) return { ok: false, message: created.data?.message || "Unable to create school email account. Please try again." };
    const details = created.data.details || {};
    return { ok: true, data: { email: details.email || "", password: details.password || "", created: true } };
  }
  const viewed = await backendRequest({ path: "dashboard/update-azure-credentials-viewed", buildBody: (me) => ({ userId: me.userId }) });
  if (!viewed.ok) return { ok: false, message: viewed.message || FAILED };
  if (!okStatus(viewed.data)) return { ok: false, message: viewed.data?.message || "Unable to proceed" };
  return { ok: true, data: { created: false } };
}
