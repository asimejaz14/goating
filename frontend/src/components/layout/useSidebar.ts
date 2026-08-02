"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "goat-farm-sidebar";

/**
 * Whether the desktop sidebar is showing, remembered between visits.
 *
 * Hidden means genuinely gone — the panel slides off the left edge and the
 * workspace runs the full width of the window, rather than shrinking to a rail
 * that still takes a slice of it. A wide table with a lot of columns is the
 * whole reason someone reaches for this.
 *
 * The stored value is read after mount rather than during the first render:
 * the server has no way to know it, and reading it inline would make the
 * server and client markup disagree. `ready` reports when that has happened,
 * so the panel can be positioned correctly from the start and only animate
 * changes the user actually asked for — without it, every page load would play
 * a slide at whoever had chosen to hide it.
 */
export function useSidebar() {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === "hidden");
    } catch {
      // A blocked storage API is not worth failing a page render over.
    }
    setReady(true);
  }, []);

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "hidden" : "shown");
      } catch {
        // Same again — the choice just will not outlive this tab.
      }
      return next;
    });
  }, []);

  return { hidden, toggle, ready };
}
