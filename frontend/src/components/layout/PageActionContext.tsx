"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface PageActionState {
  action: React.ReactNode;
  setAction: (action: React.ReactNode) => void;
}

const PageActionContext = createContext<PageActionState | null>(null);

/**
 * Lets the primary action for the current page live in the sticky topbar
 * instead of the page title block, so it stays reachable without scrolling
 * back up — the same reason Linear pins "New issue" in its top bar.
 *
 * `PageHeader` calls `usePageAction` internally, so every existing
 * `<PageHeader action={...}>` call site gets this for free.
 */
export function PageActionProvider({ children }: { children: React.ReactNode }) {
  const [action, setAction] = useState<React.ReactNode>(null);
  const value = useMemo(() => ({ action, setAction }), [action]);
  return <PageActionContext.Provider value={value}>{children}</PageActionContext.Provider>;
}

export function usePageActionSlot(): React.ReactNode {
  const context = useContext(PageActionContext);
  if (!context) throw new Error("usePageActionSlot must be used inside <PageActionProvider>.");
  return context.action;
}

/** Registers `node` as the current page's action for as long as the caller is mounted. */
export function usePageAction(node: React.ReactNode): void {
  const context = useContext(PageActionContext);
  if (!context) throw new Error("usePageAction must be used inside <PageActionProvider>.");
  const { setAction } = context;

  useEffect(() => {
    setAction(node);
    return () => setAction(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node]);
}
