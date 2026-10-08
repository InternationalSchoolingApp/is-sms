"use client";

import { useEffect } from "react";
import { Toaster } from "react-hot-toast";

export function AppToaster() {
  useEffect(() => {
    let frame = 0;
    let observedDialog = null;
    const resizeObserver = new ResizeObserver(scheduleUpdate);

    function scheduleUpdate() {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updatePosition);
    }

    function updatePosition() {
      const dialogs = Array.from(document.querySelectorAll('[data-slot="dialog-content"]'));
      let activeDialog = null;
      for (const dialog of dialogs) {
        const rect = dialog.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) activeDialog = dialog;
      }

      if (observedDialog !== activeDialog) {
        if (observedDialog) resizeObserver.unobserve(observedDialog);
        observedDialog = activeDialog;
        if (observedDialog) resizeObserver.observe(observedDialog);
      }

      if (!activeDialog) {
        document.documentElement.style.removeProperty("--app-toast-top");
        return;
      }

      const toaster = document.querySelector("[data-rht-toaster]");
      const toastHeight = toaster?.firstElementChild?.getBoundingClientRect().height || 48;
      const dialogTop = activeDialog.getBoundingClientRect().top;
      const top = Math.max(8, dialogTop - toastHeight - 12);
      document.documentElement.style.setProperty("--app-toast-top", `${top}px`);
    }

    const mutationObserver = new MutationObserver(scheduleUpdate);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, true);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frame);
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate, true);
      document.documentElement.style.removeProperty("--app-toast-top");
    };
  }, []);

  return <Toaster position="top-center" containerStyle={{ top: "var(--app-toast-top, 30vh)" }} />;
}
