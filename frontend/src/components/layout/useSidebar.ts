"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "goat-farm-sidebar";

/**
 * Whether the desktop sidebar is collapsed to an icon rail, remembered between
 * visits.
 *
 * The stored value is read after mount rather than during the first render:
 * the server has no way to know it, and reading it inline would make the
 * server and client markup disagree. `ready` reports when that has happened,
 * so the panel can be sized correctly from the start and only animate width
 * changes the user actually asked for — without it, every page load would
 * play a collapse animation at whoever had chosen the rail.
 */
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "collapsed");
    } catch {
      // A blocked storage API is not worth failing a page render over.
    }
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "collapsed" : "expanded");
      } catch {
        // Same again — the choice just will not outlive this tab.
      }
      return next;
    });
  }, []);

  return { collapsed, toggle, ready };
}
