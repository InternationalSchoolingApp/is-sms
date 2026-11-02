"use client";

/**
 * Blocking modal shown when the ids in the add-enrollment URL do not belong to the logged-in user:
 * the {sessionUserId} segment is not the caller's own id (edited URL), or the backend answered E006
 * ("Not allowed") because the caller is not mapped to {parentId}.
 */
export function NotMappedModal({ onLogout }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="not-mapped-title"
        aria-describedby="not-mapped-desc"
        className="w-full max-w-md rounded-xl bg-white p-6 text-center shadow-xl"
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600">
          !
        </div>
        <h2 id="not-mapped-title" className="mb-2 text-xl font-semibold text-gray-900">
          Not mapped
        </h2>
        <p id="not-mapped-desc" className="mb-6 text-sm leading-relaxed text-gray-600">
          This enrollment link does not match your account. The parent and user details in the link are not mapped to
          the account you are signed in with, so you cannot add or view a student here. For the security of student
          data, please open the enrollment from your own dashboard using the &quot;Add child&quot; button.
        </p>
        <button
          type="button"
          onClick={onLogout}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
