"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type LeaveMode = "push" | "history-back";

type UsePageUnsavedLeaveGuardParams = {
  hasUnsavedChanges: boolean;
  saving: boolean;
  deletingPage: boolean;
  onPush: (href: string) => void;
  onSetMessage: (message: string | null) => void;
  onCleanupBeforeLeave?: () => Promise<void>;
  getCleanupErrorMessage?: (error: unknown) => string;
  defaultHref?: string;
};

export function usePageUnsavedLeaveGuard({
  hasUnsavedChanges,
  saving,
  deletingPage,
  onPush,
  onSetMessage,
  onCleanupBeforeLeave,
  getCleanupErrorMessage,
  defaultHref = "/home",
}: UsePageUnsavedLeaveGuardParams) {
  const [showUnsavedLeaveModal, setShowUnsavedLeaveModal] = useState(false);
  const [leavingWithoutSaving, setLeavingWithoutSaving] = useState(false);
  const [pendingLeaveHref, setPendingLeaveHref] = useState<string | null>(null);
  const [pendingLeaveMode, setPendingLeaveMode] = useState<LeaveMode>("push");
  const hasUnsavedChangesRef = useRef(false);
  const ignoreNextPopstateRef = useRef(false);
  const historyGuardArmedRef = useRef(false);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasUnsavedChanges) return;
    if (historyGuardArmedRef.current) return;
    if (showUnsavedLeaveModal && pendingLeaveMode === "history-back") return;

    window.history.pushState(
      {
        ...(window.history.state ?? {}),
        __lvUnsavedGuard: true,
      },
      "",
      window.location.href,
    );
    historyGuardArmedRef.current = true;
  }, [hasUnsavedChanges, pendingLeaveMode, showUnsavedLeaveModal]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChangesRef.current) return;
      if (saving || deletingPage || leavingWithoutSaving) return;
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      if (anchor.target && anchor.target !== "_self") return;

      const href = anchor.getAttribute("href")?.trim() ?? "";
      if (!href || href.startsWith("#")) return;
      if (/^(mailto:|tel:|javascript:)/i.test(href)) return;

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);
      if (nextUrl.origin !== currentUrl.origin) return;

      const nextHref = `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
      const currentHref = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
      if (nextHref === currentHref) return;

      event.preventDefault();
      setPendingLeaveMode("push");
      setPendingLeaveHref(nextHref);
      setShowUnsavedLeaveModal(true);
    };

    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [deletingPage, leavingWithoutSaving, saving]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handlePopState = () => {
      if (ignoreNextPopstateRef.current) {
        ignoreNextPopstateRef.current = false;
        return;
      }
      if (!historyGuardArmedRef.current) return;
      historyGuardArmedRef.current = false;

      if (!hasUnsavedChangesRef.current) {
        ignoreNextPopstateRef.current = true;
        window.history.back();
        return;
      }

      setPendingLeaveMode("history-back");
      setPendingLeaveHref(null);
      setShowUnsavedLeaveModal(true);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const requestLeaveWithoutSaving = useCallback(() => {
    if (saving || deletingPage || leavingWithoutSaving) return;
    const canGoBack = typeof window !== "undefined" && window.history.length > 1;
    if (!hasUnsavedChanges) {
      if (canGoBack) {
        historyGuardArmedRef.current = false;
        ignoreNextPopstateRef.current = true;
        window.history.back();
        return;
      }
      onPush(defaultHref);
      return;
    }
    setPendingLeaveMode(canGoBack ? "history-back" : "push");
    setPendingLeaveHref(canGoBack ? null : defaultHref);
    setShowUnsavedLeaveModal(true);
  }, [
    defaultHref,
    deletingPage,
    hasUnsavedChanges,
    leavingWithoutSaving,
    onPush,
    saving,
  ]);

  const requestExitToHome = useCallback(() => {
    if (saving || deletingPage || leavingWithoutSaving) return;
    if (!hasUnsavedChanges) {
      onPush(defaultHref);
      return;
    }
    setPendingLeaveMode("push");
    setPendingLeaveHref(defaultHref);
    setShowUnsavedLeaveModal(true);
  }, [
    defaultHref,
    deletingPage,
    hasUnsavedChanges,
    leavingWithoutSaving,
    onPush,
    saving,
  ]);

  const confirmLeaveWithoutSaving = useCallback(async () => {
    if (leavingWithoutSaving) return;

    setLeavingWithoutSaving(true);
    onSetMessage(null);

    try {
      await onCleanupBeforeLeave?.();

      const nextHref = pendingLeaveHref?.trim() || defaultHref;
      const leaveMode = pendingLeaveMode;
      setShowUnsavedLeaveModal(false);
      setPendingLeaveHref(null);
      setPendingLeaveMode("push");
      if (leaveMode === "history-back") {
        historyGuardArmedRef.current = false;
        ignoreNextPopstateRef.current = true;
        window.history.back();
        return;
      }
      historyGuardArmedRef.current = false;
      onPush(nextHref);
    } catch (error: unknown) {
      const message = getCleanupErrorMessage
        ? getCleanupErrorMessage(error)
        : error instanceof Error
          ? error.message
          : "No se pudo salir sin guardar.";
      onSetMessage(message);
    } finally {
      setLeavingWithoutSaving(false);
    }
  }, [
    defaultHref,
    getCleanupErrorMessage,
    leavingWithoutSaving,
    onCleanupBeforeLeave,
    onPush,
    onSetMessage,
    pendingLeaveHref,
    pendingLeaveMode,
  ]);

  const closeUnsavedLeaveModal = useCallback(() => {
    if (leavingWithoutSaving) return;
    setPendingLeaveHref(null);
    setPendingLeaveMode("push");
    setShowUnsavedLeaveModal(false);
  }, [leavingWithoutSaving]);

  return {
    showUnsavedLeaveModal,
    leavingWithoutSaving,
    requestLeaveWithoutSaving,
    requestExitToHome,
    confirmLeaveWithoutSaving,
    closeUnsavedLeaveModal,
  };
}
